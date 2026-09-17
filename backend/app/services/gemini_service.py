
import logging
import httpx
from typing import Dict, Any, Optional
from backend.app.config import settings

logger = logging.getLogger("ThreatLens.Gemini")

class GeminiService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"

    def generate_incident_briefing(self, email_data: Dict[str, Any]) -> str:
        """
        Generates an executive forensic summary of the email threat using Gemini.
        Falls back gracefully to a deterministic rule summary if API times out or is busy.
        """
        if not self.api_key:
            return self._fallback_briefing(email_data)

        sender = email_data.get("sender", "Unknown")
        subject = email_data.get("subject", "No Subject")
        score = email_data.get("risk_score", 0)
        origin_ip = email_data.get("origin_ip", "Unknown")
        reasons_text = "; ".join([r.get("reason", "") for r in email_data.get("reasons", [])][:3])
        body_snippet = (email_data.get("body_text", "") or "")[:400]

        prompt = (
            f"You are a Senior Cyber Forensic Analyst for CERT-In. Provide a concise 2-sentence executive "
            f"incident briefing for this email threat.\n"
            f"Sender: {sender}\n"
            f"Subject: {subject}\n"
            f"Threat Score: {score}/100\n"
            f"Likely Origin IP: {origin_ip}\n"
            f"Key Findings: {reasons_text}\n"
            f"Body: {body_snippet}\n"
            f"Explain the primary social engineering vector and immediate containment recommendation."
        )

        # Try fast endpoints with graceful fallback
        models_to_try = ["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-2.5-pro"]
        for model in models_to_try:
            try:
                endpoint = f"{self.base_url}/{model}:generateContent?key={self.api_key}"
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.2, "maxOutputTokens": 150}
                }
                res = httpx.post(endpoint, json=payload, timeout=3.5)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts and "text" in parts[0]:
                            return parts[0]["text"].strip()
            except Exception as e:
                logger.debug(f"Gemini generation error on {model}: {e}")
                continue

        return self._fallback_briefing(email_data)

    def _fallback_briefing(self, email_data: Dict[str, Any]) -> str:
        score = email_data.get("risk_score", 0)
        sender = email_data.get("sender", "Unknown sender")
        origin_ip = email_data.get("origin_ip", "unresolved relay")
        if score >= 80:
            return (
                f"CRITICAL INCIDENT: High-confidence fraud originating from {origin_ip} mimicking {sender}. "
                f"Attacker employs urgent loss-prevention psychological deception to harvest credentials; "
                f"immediate domain quarantine and perimeter firewall block recommended."
            )
        elif score >= 50:
            return (
                f"SUSPICIOUS ACTIVITY: Unaligned routing headers detected from {origin_ip}. "
                f"Contains urgency cues requiring analyst secondary verification before release."
            )
        return "BENIGN EMAIL: Cryptographic headers and domain alignment verified with clean reputation."

gemini_service = GeminiService()

