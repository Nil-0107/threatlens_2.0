import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Link, RefreshCw, Bug, CheckCircle2, XCircle } from 'lucide-react';
import { verifyChain, simulateTamper } from '../api/client';

export default function ForensicChainViewer({ emailId, onChainVerified }) {
  const [verifying, setVerifying] = useState(false);
  const [auditResult, setAuditResult] = useState(null);
  const [tampering, setTampering] = useState(false);

  const handleVerify = async () => {
    if (!emailId) return;
    setVerifying(true);
    try {
      const res = await verifyChain(emailId);
      setAuditResult(res);
      if (onChainVerified) onChainVerified(res);
    } catch (err) {
      setAuditResult({
        is_valid: false,
        message: err.message || 'Audit verification request failed',
        entries: [],
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleSimulateTamper = async () => {
    if (!auditResult || !auditResult.entries || auditResult.entries.length === 0) {
      // Run verify first to fetch entries
      const fresh = await verifyChain(emailId);
      setAuditResult(fresh);
      if (!fresh.entries || fresh.entries.length === 0) return;
    }

    const targetLog = auditResult.entries[0];
    setTampering(true);
    try {
      await simulateTamper(targetLog.id, 'unauthorized_intruder');
      // Immediately re-verify to demonstrate tamper detection in action!
      const reAudit = await verifyChain(emailId);
      setAuditResult(reAudit);
    } catch (err) {
      alert('Tampering simulation failed: ' + err.message);
    } finally {
      setTampering(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Link className="w-4 h-4 text-blue-400" />
            Evidence Vault: SHA-256 Hash Chain Ledger
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Cryptographically linked tamper-evident audit trail. Every action incorporates the previous digest.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleSimulateTamper}
            disabled={tampering || !emailId}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/30 transition-colors"
            title="Deliberately corrupt an entry in the database to test cryptographic audit"
          >
            <Bug className="w-3.5 h-3.5" />
            <span>Simulate Tampering</span>
          </button>

          <button
            onClick={handleVerify}
            disabled={verifying || !emailId}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
            <span>Run Cryptographic Audit</span>
          </button>
        </div>
      </div>

      {/* Audit Banner */}
      {auditResult && (
        <div
          className={`p-4 rounded-xl border flex items-start space-x-3 transition-all ${
            auditResult.is_valid
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="mt-0.5 shrink-0">
            {auditResult.is_valid ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-400 animate-pulse" />
            )}
          </div>
          <div>
            <div className="font-bold text-xs uppercase tracking-wider">
              {auditResult.is_valid
                ? '✅ Cryptographic Verification Passed — 100% Tamper-Evident'
                : '❌ Security Alert: Forensic Hash-Chain Integrity Broken!'}
            </div>
            <p className="text-xs mt-1 leading-relaxed">{auditResult.message}</p>
            {!auditResult.is_valid && auditResult.broken_entry_id && (
              <div className="mt-2 font-mono text-[11px] bg-rose-950/60 p-2 rounded border border-rose-500/30 text-rose-200">
                Altered Record ID: <span className="text-white font-bold">{auditResult.broken_entry_id}</span>
                <br />
                Broken Index: #{auditResult.broken_index + 1}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hash Chain Timeline Cards */}
      {auditResult && auditResult.entries && auditResult.entries.length > 0 ? (
        <div className="space-y-3 pt-2">
          {auditResult.entries.map((entry, idx) => {
            const isBroken = !auditResult.is_valid && auditResult.broken_entry_id === entry.id;
            return (
              <div
                key={entry.id}
                className={`p-4 rounded-xl border transition-all ${
                  isBroken
                    ? 'bg-rose-500/10 border-rose-500/50 shadow-lg shadow-rose-500/10'
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs pb-2 mb-2 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                      BLOCK #{idx + 1}
                    </span>
                    <span className="font-semibold text-white uppercase">{entry.action}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-slate-400 font-mono text-[11px]">
                    <span>Actor: <b className="text-slate-200">{entry.actor}</b></span>
                    <span>{new Date(entry.timestamp).toLocaleTimeString()} UTC</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-slate-400">
                    <span className="text-slate-500 text-[11px]">Previous Hash Pointer (prev_hash):</span>
                    <span className="text-slate-300 text-[11px] truncate max-w-[320px]" title={entry.prev_hash}>
                      {entry.prev_hash}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-slate-400">
                    <span className="text-slate-500 text-[11px]">Computed Entry Digest (entry_hash):</span>
                    <span
                      className={`text-[11px] font-bold truncate max-w-[320px] ${
                        isBroken ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                      title={entry.entry_hash}
                    >
                      {entry.entry_hash}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 text-center text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-slate-800">
          Click <span className="text-blue-400 font-semibold">"Run Cryptographic Audit"</span> to inspect the tamper-evident hash chain for this email.
        </div>
      )}
    </div>
  );
}

