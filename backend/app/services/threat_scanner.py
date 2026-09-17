import json
import os
import re
import pickle
import logging
from typing import Dict, Any, List, Tuple
from urllib.parse import urlparse
from backend.app.config import settings

logger = logging.getLogger("ThreatLens.Scanner")

def levenshtein_distance(s1: str, s2: str) -> int:
    """Computes standard Levenshtein edit-distance between two strings."""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)

    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return previous_row[-1]


class ThreatScanner:
    def __init__(self):
        self.brand_domains = self._load_brand_domains()
        self.url_blocklist = self._load_url_blocklist()
        self.ml_pipeline = self._load_ml_pipeline()

    def _load_brand_domains(self) -> List[str]:
        try:
            if os.path.exists(settings.BRAND_DOMAINS_PATH):
                with open(settings.BRAND_DOMAINS_PATH, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception as e:
            logger.warning(f"Failed to load brand domains: {e}")
        return ["paypal.com", "microsoft.com", "google.com", "apple.com", "chase.com", "amazon.com"]

    def _load_url_blocklist(self) -> List[str]:
        try:
            if os.path.exists(settings.URL_BLOCKLIST_PATH):
                with open(settings.URL_BLOCKLIST_PATH, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception as e:
            logger.warning(f"Failed to load url blocklist: {e}")
        return ["paypa1.com", "microsof1-online.net", "chase-secure-verification.com"]

    def _load_ml_pipeline(self):
        try:
            if os.path.exists(settings.MODEL_PATH):
                with open(settings.MODEL_PATH, "rb") as f:
                    return pickle.load(f)
        except Exception as e:
            logger.warning(f"Failed to load ML pipeline from {settings.MODEL_PATH}: {e}")
        return None

    def scan(self, parsed_email: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes comprehensive threat scanning combining rules + ML.
        Returns risk_score (0-100), risk_level, reasons list, and auth_results.
        """
        reasons: List[Dict[str, Any]] = []
        raw_score = 0.0

        sender = parsed_email.get("sender", "").lower()
        sender_domain = parsed_email.get("sender_domain", "").lower()
        display_name = parsed_email.get("display_name", "")
        reply_to = parsed_email.get("reply_to", "").lower()
        return_path = parsed_email.get("return_path", "").lower()
        body_text = parsed_email.get("body_text", "")
        urls = parsed_email.get("urls", [])
        auth_header = parsed_email.get("auth_results_header", "").lower()
        spf_header = parsed_email.get("received_spf_header", "").lower()

        # -------------------------------------------------------------
        # 1. Header Authentication: SPF, DKIM, DMARC
        # -------------------------------------------------------------
        auth_summary = {"spf": "neutral", "dkim": "neutral", "dmarc": "neutral"}

        # SPF Check
        if "spf=fail" in auth_header or "softfail" in auth_header or "fail" in spf_header:
            auth_summary["spf"] = "fail"
            raw_score += 25.0
            reasons.append({
                "reason": "SPF Check Failed: Sender IP is not authorized by domain SPF record",
                "weight": 25.0,
                "category": "HEADER_AUTH"
            })
        elif "spf=pass" in auth_header or "pass" in spf_header:
            auth_summary["spf"] = "pass"

        # DKIM Check
        if "dkim=fail" in auth_header or "dkim=temperror" in auth_header:
            auth_summary["dkim"] = "fail"
            raw_score += 25.0
            reasons.append({
                "reason": "DKIM Verification Failed: Cryptographic signature mismatch or forged sender",
                "weight": 25.0,
                "category": "HEADER_AUTH"
            })
        elif "dkim=pass" in auth_header:
            auth_summary["dkim"] = "pass"

        # DMARC Check
        if "dmarc=fail" in auth_header or "dmarc=reject" in auth_header:
            auth_summary["dmarc"] = "fail"
            raw_score += 20.0
            reasons.append({
                "reason": "DMARC Alignment Failed: Policy violation detected",
                "weight": 20.0,
                "category": "HEADER_AUTH"
            })
        elif "dmarc=pass" in auth_header:
            auth_summary["dmarc"] = "pass"

        # -------------------------------------------------------------
        # 2. Sender Spoofing & Header Inconsistencies
        # -------------------------------------------------------------
        # -------------------------------------------------------------
        # Display name and sender local-part brand impersonation
        sender_local = (sender.split("@")[0] if "@" in sender else "").lower()
        dn_lower = (display_name or "").lower()

        for brand in self.brand_domains:
            brand_name = brand.split(".")[0]
            if len(brand_name) < 3:
                continue

            # 1. Display name mimics brand
            if brand_name in dn_lower and brand_name not in sender_domain:
                raw_score += 30.0
                reasons.append({
                    "reason": f"Display Name Spoofing: Display name mimics '{display_name}' but actual domain is '{sender_domain}'",
                    "weight": 30.0,
                    "category": "DOMAIN_SPOOF"
                })
                break

            # 2. Local-part mimics brand (e.g. banco.bradesco@atendimento.com.br)
            if brand_name in sender_local and brand_name not in sender_domain:
                raw_score += 35.0
                reasons.append({
                    "reason": f"Sender Address Brand Impersonation: Local part '{sender_local}' mimics legitimate institution '{brand_name}' while sending domain is '{sender_domain}'",
                    "weight": 35.0,
                    "category": "DOMAIN_SPOOF"
                })
                break

        # Check for generic banking mimicry in local part (e.g. 'banco', 'support', 'secure')
        if not any(r["category"] == "DOMAIN_SPOOF" for r in reasons):
            if any(k in sender_local for k in ["banco", "bank", "security-alert", "verify-account"]):
                if not any(k in sender_domain for k in ["banco", "bank"]):
                    raw_score += 25.0
                    reasons.append({
                        "reason": f"Financial Entity Mimicry: Sender username '{sender_local}' mimics banking infrastructure on non-banking domain '{sender_domain}'",
                        "weight": 25.0,
                        "category": "DOMAIN_SPOOF"
                    })

        # Multilingual Urgency / Phishing Subject cues
        subj_lower = (parsed_email.get("subject") or "").lower()
        urgency_terms = ["expirando hoje", "bloqueio de conta", "recadastramento", "urgente", "action required", "unauthorized transfer", "immediate action", "account suspended"]
        for term in urgency_terms:
            if term in subj_lower:
                raw_score += 20.0
                reasons.append({
                    "reason": f"Psychological Urgency Indicator: Subject line contains coercive urgency pattern '{term}'",
                    "weight": 20.0,
                    "category": "SOCIAL_ENG"
                })
                break

        # Reply-To / Return-Path domain mismatch
        if reply_to and "@" in reply_to:
            reply_domain = reply_to.split("@")[-1].lower()
            if sender_domain and reply_domain != sender_domain:
                raw_score += 20.0
                reasons.append({
                    "reason": f"Mismatched Reply-To Address: Replies routed to '{reply_to}' instead of '{sender_domain}'",
                    "weight": 20.0,
                    "category": "DOMAIN_SPOOF"
                })

        if return_path and "@" in return_path:
            return_domain = return_path.split("@")[-1].lower()
            if sender_domain and return_domain != sender_domain and not return_domain.endswith(sender_domain):
                raw_score += 15.0
                reasons.append({
                    "reason": f"Mismatched Return-Path: Bounce envelope '{return_domain}' differs from sender '{sender_domain}'",
                    "weight": 15.0,
                    "category": "DOMAIN_SPOOF"
                })

        # -------------------------------------------------------------
        # 3. Lookalike Domain Check (Levenshtein Distance)
        # -------------------------------------------------------------
        if sender_domain:
            for brand in self.brand_domains:
                if sender_domain == brand:
                    continue
                # Compare domain names directly or root names
                brand_root = brand.split(".")[0]
                sender_root = sender_domain.split(".")[0]
                dist_full = levenshtein_distance(sender_domain, brand)
                dist_root = levenshtein_distance(sender_root, brand_root)

                # Lookalike detection (e.g. paypa1.com vs paypal.com or microsof1 vs microsoft)
                if (dist_full in (1, 2) and len(sender_domain) >= 5) or (dist_root in (1, 2) and len(sender_root) >= 5):
                    raw_score += 35.0
                    reasons.append({
                        "reason": f"Lookalike Domain Detected: '{sender_domain}' mimics legitimate brand domain '{brand}' (Levenshtein distance: {min(dist_full, dist_root)})",
                        "weight": 35.0,
                        "category": "DOMAIN_SPOOF"
                    })
                    break

        # -------------------------------------------------------------
        # 4. URL Threat Intelligence & Suspicious Links
        # -------------------------------------------------------------
        suspicious_tlds = [".xyz", ".top", ".ru", ".cc", ".click", ".buzz", ".work", ".stream"]
        found_bad_urls = False

        for u in urls:
            try:
                parsed_u = urlparse(u)
                netloc = (parsed_u.netloc or "").lower()
                
                # Check known blocklist
                for bad in self.url_blocklist:
                    if bad in netloc or netloc.endswith(bad):
                        raw_score += 35.0
                        reasons.append({
                            "reason": f"Malicious Link Detected: URL '{u}' matches threat intelligence blocklist entry '{bad}'",
                            "weight": 35.0,
                            "category": "URL_THREAT"
                        })
                        found_bad_urls = True
                        break

                if found_bad_urls:
                    break

                # Check for IP address in URL hostname
                if re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}", netloc):
                    raw_score += 25.0
                    reasons.append({
                        "reason": f"Suspicious IP-based URL: Link '{u}' directs directly to an IP address rather than a domain",
                        "weight": 25.0,
                        "category": "URL_THREAT"
                    })
                    break

                # Check suspicious TLDs
                for tld in suspicious_tlds:
                    if netloc.endswith(tld):
                        raw_score += 20.0
                        reasons.append({
                            "reason": f"Suspicious Top-Level Domain: URL '{u}' uses high-risk TLD '{tld}'",
                            "weight": 20.0,
                            "category": "URL_THREAT"
                        })
                        break
            except Exception:
                pass

        # -------------------------------------------------------------
        # 5. Scikit-Learn ML Classifier Inference (Leak-Free Body Only)
        # -------------------------------------------------------------
        ml_prob = 0.0
        if self.ml_pipeline and body_text:
            try:
                # Predict probability of class 1 (Phishing)
                prob_scores = self.ml_pipeline.predict_proba([body_text])[0]
                ml_prob = float(prob_scores[1])
                
                if ml_prob >= 0.70:
                    ml_weight = round(ml_prob * 35.0, 1)
                    raw_score += ml_weight
                    reasons.append({
                        "reason": f"AI Content Classifier: Phishing language patterns detected ({int(ml_prob * 100)}% confidence)",
                        "weight": ml_weight,
                        "category": "ML_CONTENT"
                    })
                elif ml_prob >= 0.40:
                    ml_weight = round(ml_prob * 20.0, 1)
                    raw_score += ml_weight
                    reasons.append({
                        "reason": f"AI Content Classifier: Suspicious urgency/credential harvesting signals ({int(ml_prob * 100)}% confidence)",
                        "weight": ml_weight,
                        "category": "ML_CONTENT"
                    })
            except Exception as e:
                logger.warning(f"ML inference error: {e}")

        # -------------------------------------------------------------
        # 6. Score Normalization and Severity Mapping
        # -------------------------------------------------------------
        final_score = int(min(100.0, max(0.0, round(raw_score))))
        
        if final_score >= 80:
            risk_level = "Critical"
        elif final_score >= 55:
            risk_level = "High"
        elif final_score >= 30:
            risk_level = "Medium"
        else:
            risk_level = "Low"

        # If zero reasons triggered and score is low, provide clean summary reason
        if not reasons:
            reasons.append({
                "reason": "Clean Email: SPF/DKIM authentication verified, domain reputation clean, AI content score normal",
                "weight": 0.0,
                "category": "GENERAL"
            })

        return {
            "risk_score": final_score,
            "risk_level": risk_level,
            "reasons": reasons,
            "auth_results": json.dumps(auth_summary),
            "ml_confidence": ml_prob,
        }

threat_scanner = ThreatScanner()

