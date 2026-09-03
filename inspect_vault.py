#!/usr/bin/env python3
"""
ThreatLens Evidence Vault Inspector & Cryptographic Audit CLI
Usage:
    python inspect_vault.py
    python inspect_vault.py --watch
"""

import sys
import time
import sqlite3
import hashlib
from datetime import datetime, timezone

DB_FILE = "threatlens.db"
GENESIS_HASH = "0" * 64

# ANSI terminal colors
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BLUE = "\033[94m"
BOLD = "\033[1m"
RESET = "\033[0m"

def calculate_hash(log_id, email_id, action, actor, timestamp_iso, data_hash, prev_hash):
    canonical = f"{log_id}|{email_id or ''}|{action}|{actor}|{timestamp_iso}|{data_hash}|{prev_hash}"
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()

def display_ledger():
    try:
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("""
            SELECT id, email_id, action, actor, timestamp, data_hash, prev_hash, entry_hash
            FROM forensic_log
            ORDER BY timestamp ASC, id ASC
        """)
        rows = c.fetchall()
        conn.close()
    except Exception as e:
        print(f"{RED}Error accessing database {DB_FILE}: {e}{RESET}")
        return

    print(f"\n{BOLD}{CYAN}{'='*110}{RESET}")
    print(f"{BOLD}{CYAN}  THREATLENS EVIDENCE VAULT: LIVE CRYPTOGRAPHIC AUDIT LEDGER{RESET}")
    print(f"{BOLD}{CYAN}{'='*110}{RESET}")
    print(f"Total Block Entries: {BOLD}{len(rows)}{RESET} | Database: {BOLD}{DB_FILE}{RESET}")
    print(f"{CYAN}{'-'*110}{RESET}\n")

    if not rows:
        print(f"{YELLOW}Ledger is currently empty. Upload or view an email on the web console to record new blocks.{RESET}\n")
        return

    all_valid = True
    for idx, r in enumerate(rows):
        log_id, email_id, action, actor, timestamp, data_hash, prev_hash, stored_hash = r

        # Re-compute hash to verify authenticity
        # SQLite stores timestamps as strings: "2026-09-03 18:08:12.131887"
        try:
            if "T" in timestamp:
                dt = datetime.fromisoformat(timestamp)
            else:
                dt = datetime.fromisoformat(timestamp.replace(" ", "T"))
            if not dt.tzinfo:
                dt = dt.replace(tzinfo=timezone.utc)
            ts_iso = dt.isoformat()
        except Exception:
            ts_iso = timestamp

        recomputed = calculate_hash(log_id, email_id, action, actor, ts_iso, data_hash, prev_hash)

        # Integrity Checks
        is_content_ok = (recomputed == stored_hash)
        is_chain_ok = True
        if idx > 0:
            is_chain_ok = (prev_hash == rows[idx-1][7])
        else:
            is_chain_ok = (prev_hash == GENESIS_HASH or len(prev_hash) == 64)

        if is_content_ok and is_chain_ok:
            status = f"{GREEN}✓ SECURE & VERIFIED{RESET}"
        else:
            status = f"{RED}✗ INTEGRITY VIOLATION DETECTED{RESET}"
            all_valid = False

        print(f"{BOLD}BLOCK #{idx + 1} | {action}{RESET}  [{status}]")
        print(f"  • Log UUID     : {CYAN}{log_id}{RESET}")
        print(f"  • Incident ID  : {log_id if not email_id else email_id}")
        print(f"  • Actor (User) : {BOLD}{YELLOW}{actor}{RESET}")
        print(f"  • Timestamp    : {timestamp}")
        print(f"  • Data Fingerprint (Raw Email SHA-256) : {data_hash[:32]}...")
        print(f"  • Previous Block Hash (prev_hash)      : {prev_hash[:32]}...")
        print(f"  • Sealed Block Hash   (entry_hash)     : {stored_hash[:32]}...")
        if not is_content_ok:
            print(f"    {RED}↳ ALERT: Expected hash '{recomputed[:24]}...' does NOT match stored '{stored_hash[:24]}...'! Content was tampered with.{RESET}")
        print(f"{CYAN}{'-'*110}{RESET}")

    print()
    if all_valid:
        print(f"{GREEN}{BOLD}✅ 100% CRYPTOGRAPHIC CHAIN INTACT: Zero tampering detected across all {len(rows)} blocks.{RESET}\n")
    else:
        print(f"{RED}{BOLD}🚨 AUDIT FAILED: Unauthorized modification detected in the database!{RESET}\n")

if __name__ == "__main__":
    if "--watch" in sys.argv:
        print(f"{CYAN}Watching Evidence Vault in real-time (Press Ctrl+C to stop)...{RESET}")
        while True:
            display_ledger()
            time.sleep(3)
    else:
        display_ledger()

