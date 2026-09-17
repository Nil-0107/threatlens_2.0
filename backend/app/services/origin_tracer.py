import ipaddress
import json
import logging
import os
import re
import urllib.request
import urllib.parse
from typing import List, Dict, Any, Optional
from backend.app.config import settings

logger = logging.getLogger("ThreatLens.OriginTracer")

class OriginTracer:
    def __init__(self):
        self.geo_cache = self._load_geo_cache()

    def _load_geo_cache(self) -> Dict[str, Dict[str, Any]]:
        try:
            if os.path.exists(settings.GEO_CACHE_PATH):
                with open(settings.GEO_CACHE_PATH, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception as e:
            logger.warning(f"Could not load geo cache from {settings.GEO_CACHE_PATH}: {e}")
        return {}

    def is_private_or_internal(self, ip_str: str) -> bool:
        """Determines whether an IP address is loopback, RFC 1918 private, or link-local."""
        try:
            ip_obj = ipaddress.ip_address(ip_str.strip())
            return (
                ip_obj.is_private or
                ip_obj.is_loopback or
                ip_obj.is_link_local or
                ip_obj.is_reserved or
                ip_obj.is_multicast
            )
        except ValueError:
            return True

    def extract_ips_from_received_header(self, header_value: str) -> List[str]:
        """
        Extracts IPv4 and IPv6 addresses embedded in standard RFC 822 Received: headers.
        Examples:
          from mail.attacker-relay.ru (mail.attacker-relay.ru [185.220.101.5])
          from [194.135.25.10]
          from 127.0.0.1
        """
        # Match standard IPv4 addresses
        ipv4_regex = r"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b"
        found = re.findall(ipv4_regex, header_value)
        # Filter valid IPs
        valid_ips = []
        for cand in found:
            try:
                ipaddress.ip_address(cand)
                valid_ips.append(cand)
            except ValueError:
                continue
        return valid_ips

    def geolocate_ip(self, ip: str) -> Dict[str, Any]:
        """
        Resolves geolocation for an IP address.
        Prioritizes the local offline cache for demo resilience, then falls back to public API.
        """
        # 1. Check local mock cache
        if ip in self.geo_cache:
            return self.geo_cache[ip]

        # 2. Check live fallback if enabled
        if settings.ENABLE_LIVE_GEO_FALLBACK:
            try:
                url = f"http://ip-api.com/json/{ip}?fields=status,message,country,countryCode,city,lat,lon,isp,org,as,reverse"
                req = urllib.request.Request(url, headers={"User-Agent": "ThreatLens/1.0"})
                with urllib.request.urlopen(req, timeout=settings.GEO_API_TIMEOUT) as response:
                    data = json.loads(response.read().decode("utf-8"))
                    if data.get("status") == "success":
                        res = {
                            "ip": ip,
                            "country": data.get("country", "Unknown"),
                            "country_code": data.get("countryCode", "UN"),
                            "city": data.get("city", "Unknown"),
                            "isp": data.get("isp", "Unknown ISP"),
                            "org": data.get("org", data.get("as", "Unknown ASN")),
                            "lat": data.get("lat"),
                            "lon": data.get("lon"),
                            "reverse_dns": data.get("reverse", "")
                        }
                        # Cache in memory
                        self.geo_cache[ip] = res
                        return res
            except Exception as e:
                logger.debug(f"Live IP geolocation lookup failed for {ip}: {e}")

        # 3. Default fallback representation
        return {
            "ip": ip,
            "country": "Unknown Location",
            "country_code": "UN",
            "city": "Unknown",
            "isp": "External Gateway",
            "org": "Autonomous System",
            "lat": 20.0,
            "lon": 0.0,
            "reverse_dns": ""
        }

    def trace_hops(self, received_headers: List[str]) -> List[Dict[str, Any]]:
        """
        Parses Received: headers sequentially.
        PRD Specification:
          Received headers are ordered bottom to top (earliest to latest hop).
          In RFC 822 format:
          - The bottom header was added by the first receiving MTA (closest to origin sender).
          - The top header was added by the final mailbox destination MTA.
        """
        # Reverse to get chronological order (bottom to top)
        chronological_headers = list(reversed(received_headers))
        hops: List[Dict[str, Any]] = []
        hop_index = 0
        origin_flagged = False

        for raw_hdr in chronological_headers:
            ips = self.extract_ips_from_received_header(raw_hdr)
            if not ips:
                continue

            for ip in ips:
                is_internal = self.is_private_or_internal(ip)
                
                if is_internal:
                    hops.append({
                        "hop_order": hop_index,
                        "ip": ip,
                        "country": "Internal Hop (Private LAN)",
                        "country_code": "INT",
                        "city": "Local Network",
                        "isp": "Internal Gateway / Loopback",
                        "org": "Private Infrastructure",
                        "lat": None,
                        "lon": None,
                        "is_internal": True,
                        "is_likely_origin": False,
                        "reverse_dns": "localhost" if ip.startswith("127.") else "lan.local"
                    })
                else:
                    geo = self.geolocate_ip(ip)
                    is_origin = False
                    if not origin_flagged:
                        is_origin = True
                        origin_flagged = True

                    hops.append({
                        "hop_order": hop_index,
                        "ip": ip,
                        "country": geo.get("country", "Unknown"),
                        "country_code": geo.get("country_code", "UN"),
                        "city": geo.get("city", "Unknown"),
                        "isp": geo.get("isp", "Unknown ISP"),
                        "org": geo.get("org", "Unknown Org"),
                        "lat": geo.get("lat"),
                        "lon": geo.get("lon"),
                        "is_internal": False,
                        "is_likely_origin": is_origin,
                        "reverse_dns": geo.get("reverse_dns", "")
                    })

                hop_index += 1

        # If no external IP was found but we had internal hops, flag first hop as origin
        if not origin_flagged and hops:
            hops[0]["is_likely_origin"] = True

        return hops

origin_tracer = OriginTracer()

