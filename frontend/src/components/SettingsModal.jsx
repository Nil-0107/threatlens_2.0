import React, { useState, useEffect } from 'react';
import { Sliders, Shield, Trash2, CheckCircle2, Lock, EyeOff } from 'lucide-react';
import { getSettings, updateRetention } from '../api/client';

export default function SettingsModal({ maskPii, setMaskPii }) {
  const [retentionDays, setRetentionDays] = useState(90);
  const [loading, setLoading] = useState(false);
  const [purgeResult, setPurgeResult] = useState(null);

  useEffect(() => {
    getSettings()
      .then((data) => {
        if (data.retention_days) setRetentionDays(data.retention_days);
      })
      .catch((e) => console.error(e));
  }, []);

  const handleUpdateRetention = async () => {
    setLoading(true);
    setPurgeResult(null);
    try {
      const res = await updateRetention(retentionDays);
      setPurgeResult(res.purge_result);
    } catch (err) {
      alert('Retention update failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Sliders className="w-5 h-5 text-blue-400" />
          Governance, Retention & Masking Controls
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure automated data retention cycles and redaction rules per PRD Section 6.5.
        </p>
      </div>

      {/* Retention Policy Setting */}
      <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-amber-400" />
              Raw Email Retention Window
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              After this period, raw MIME bodies are permanently purged from database storage to respect privacy, while <b>cryptographic SHA-256 hashes, metadata, and the Evidence Vault chain survive indefinitely</b>.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="number"
              min="1"
              max="365"
              value={retentionDays}
              onChange={(e) => setRetentionDays(parseInt(e.target.value) || 30)}
              className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
            />
            <span className="text-xs text-slate-400">days</span>
          </div>
        </div>

        <button
          onClick={handleUpdateRetention}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
        >
          <span>Apply Policy & Trigger Purge Daemon</span>
        </button>

        {purgeResult && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              Purge executed: {purgeResult.purged_count} records older than {purgeResult.retention_days} days were sanitized. Proof hashes retained.
            </span>
          </div>
        )}
      </div>

      {/* PII Masking Controls */}
      <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-blue-400" />
              Forensic Report PII Masking
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Automatically redacts credit card numbers, phone numbers, and email usernames in exported forensic PDF reports.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={maskPii}
              onChange={(e) => setMaskPii(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Cryptographic Assurance Note */}
      <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-slate-400 space-y-1">
        <div className="text-blue-400 font-semibold flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />
          <span>FIPS 180-4 Cryptographic Integrity Guarantee</span>
        </div>
        <p>
          All purge and update actions append an immutable block to the Evidence Vault hash-chain. Even if database content is purged, the audit trail confirms the exact moment and actor of the deletion.
        </p>
      </div>
    </div>
  );
}

