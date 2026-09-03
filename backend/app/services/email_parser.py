import re
import hashlib
from datetime import datetime, timezone
from email import policy
from email.parser import Parser, BytesParser
from email.utils import parseaddr, parsedate_to_datetime
from html import unescape
from typing import Dict, Any, List, Optional

def strip_html_tags(html_content: str) -> str:
    if not html_content:
        return ""
    clean = re.sub(r"<style[\s\S]*?</style>", " ", html_content, flags=re.IGNORECASE)
    clean = re.sub(r"<script[\s\S]*?</script>", " ", clean, flags=re.IGNORECASE)
    clean = re.sub(r"<[^>]+>", " ", clean)
    clean = unescape(clean)
    return re.sub(r"\s+", " ", clean).strip()

def parse_raw_email(raw_input: str | bytes) -> Dict[str, Any]:
    """
    Parses an RFC 822 email payload, extracting headers, body parts,
    timestamps, and calculating the raw SHA-256 digest.
    """
    if isinstance(raw_input, bytes):
        raw_bytes = raw_input
        raw_str = raw_input.decode("utf-8", errors="replace")
        msg = BytesParser(policy=policy.default).parsebytes(raw_bytes)
    else:
        raw_str = raw_input
        raw_bytes = raw_input.encode("utf-8")
        msg = Parser(policy=policy.default).parsestr(raw_str)

    # 1. SHA-256 of the raw email content
    raw_hash = hashlib.sha256(raw_bytes).hexdigest()

    # 2. Extract envelope & routing headers
    from_header = msg.get("From", "")
    display_name, sender_email = parseaddr(from_header)
    sender_domain = sender_email.split("@")[-1].lower() if "@" in sender_email else ""

    reply_to_header = msg.get("Reply-To", "")
    _, reply_to_email = parseaddr(reply_to_header)

    return_path_header = msg.get("Return-Path", "")
    _, return_path_email = parseaddr(return_path_header)

    subject = msg.get("Subject", "(No Subject)")
    
    date_header = msg.get("Date")
    received_at = None
    if date_header:
        try:
            received_at = parsedate_to_datetime(date_header)
        except Exception:
            received_at = datetime.now(timezone.utc)
    else:
        received_at = datetime.now(timezone.utc)

    # All Received headers in chronological order will be processed by OriginTracer
    # In RFC 822, msg.get_all("Received") returns top-to-bottom
    received_headers = msg.get_all("Received", []) or []

    # Authentication-Results / Received-SPF
    auth_results_header = msg.get("Authentication-Results", "")
    received_spf_header = msg.get("Received-SPF", "")

    # 3. Extract Body Payloads (Plain Text and HTML)
    body_plain_parts: List[str] = []
    body_html_parts: List[str] = []
    urls_found: List[str] = []

    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition", ""))
            if "attachment" in content_disposition:
                continue

            payload = part.get_payload(decode=True)
            if not payload:
                continue

            charset = part.get_content_charset() or "utf-8"
            decoded_text = payload.decode(charset, errors="replace")

            if content_type == "text/plain":
                body_plain_parts.append(decoded_text)
            elif content_type == "text/html":
                body_html_parts.append(decoded_text)
    else:
        content_type = msg.get_content_type()
        payload = msg.get_payload(decode=True)
        if payload:
            charset = msg.get_content_charset() or "utf-8"
            decoded = payload.decode(charset, errors="replace")
            if content_type == "text/html":
                body_html_parts.append(decoded)
            else:
                body_plain_parts.append(decoded)

    # Combined clean body text (for ML inference and display)
    body_text_plain = " ".join(body_plain_parts).strip()
    body_text_from_html = " ".join([strip_html_tags(h) for h in body_html_parts]).strip()
    
    if body_text_plain and body_text_from_html:
        combined_body = f"{body_text_plain}\n\n{body_text_from_html}"
    else:
        combined_body = body_text_plain or body_text_from_html

    # Extract all URLs across both plain and html bodies
    full_search_text = f"{raw_str} {combined_body}"
    url_pattern = r'https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+[^\s<>"\']*'
    urls_found = list(set(re.findall(url_pattern, full_search_text)))

    return {
        "raw_hash": raw_hash,
        "raw_content": raw_str,
        "from_header": from_header,
        "sender": sender_email or from_header,
        "sender_domain": sender_domain,
        "display_name": display_name,
        "reply_to": reply_to_email,
        "return_path": return_path_email,
        "subject": subject,
        "received_at": received_at,
        "received_headers": received_headers,
        "auth_results_header": auth_results_header,
        "received_spf_header": received_spf_header,
        "body_text": combined_body,
        "urls": urls_found,
    }

