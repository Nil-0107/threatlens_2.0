import React, { useState, useEffect } from 'react';
import { Sliders, Trash2, CheckCircle2, Lock, EyeOff } from 'lucide-react';
import { getSettings, updateRetention } from '../api/client';

export default function SettingsModal({ maskPii, setMaskPii }) {
  const [retentionDays, setRetentionDays] = useState(90);
  const [loading, setLoading] = useState(false);
  const [purgeResult, setPurgeResult] = useState(null);
  const [error, setError] = useState('');

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
    setError('');
    try {
      const res = await updateRetention(retentionDays);
      setPurgeResult(res.purge_result);
    } catch (err) {
      setError('Retention update failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tl-panel mx-auto max-w-3xl space-y-6 p-5 sm:p-6">
      <div className="border-b border-[var(--tl-border)] pb-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--tl-text)]">
          <Sliders className="h-5 w-5 text-[var(--tl-accent)]" />
          Governance, Retention & Masking Controls
        </h2>
        <p className="mt-1 text-xs text-[var(--tl-text-secondary)]">
          Configure automated data retention cycles and redaction rules per PRD Section 6.5.
        </p>
      </div>

      {error && <div className="rounded-lg border border-red-400/35 bg-red-400/10 p-3 text-xs text-red-300" role="alert" aria-live="assertive">{error}</div>}

      {/* Retention Policy Setting */}
      <div className="tl-panel-inset space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--tl-text)]">
              <Trash2 className="h-4 w-4 text-[var(--tl-caution)]" />
              Raw Email Retention Window
            </h3>
            <p className="mt-1 text-xs leading-5 text-[var(--tl-text-secondary)]">
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
              aria-label="Raw email retention days"
              className="tl-input w-20 px-3 py-1.5 text-xs font-mono"
            />
            <span className="text-xs text-[var(--tl-text-muted)]">days</span>
          </div>
        </div>

        <button
          onClick={handleUpdateRetention}
          disabled={loading}
          type="button"
          className="tl-button-secondary inline-flex items-center gap-2"
        >
          <span>{loading ? 'Applying policy…' : 'Apply policy & trigger purge'}</span>
        </button>

        {purgeResult && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-xs text-emerald-300" role="status" aria-live="polite">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              Purge executed: {purgeResult.purged_count} records older than {purgeResult.retention_days} days were sanitized. Proof hashes retained.
            </span>
          </div>
        )}
      </div>

      {/* PII Masking Controls */}
      <div className="tl-panel-inset space-y-3 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--tl-text)]">
              <EyeOff className="h-4 w-4 text-[var(--tl-accent)]" />
              Forensic Report PII Masking
            </h3>
            <p className="mt-1 text-xs leading-5 text-[var(--tl-text-secondary)]">
              Automatically redacts credit card numbers, phone numbers, and email usernames in exported forensic PDF reports.
            </p>
          </div>

          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={maskPii}
              onChange={(e) => setMaskPii(e.target.checked)}
              aria-label="Enable PII masking in exported forensic PDF reports"
              className="sr-only peer"
            />
            <div className="h-6 w-11 rounded-full border border-[var(--tl-border-strong)] bg-[var(--tl-surface-raised)] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-[var(--tl-border)] after:bg-[var(--tl-text)] after:transition-all after:content-[''] peer peer-checked:bg-[var(--tl-accent)] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
          </label>
        </div>
      </div>

      {/* Cryptographic Assurance Note */}
      <div className="space-y-1 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-xs text-[var(--tl-text-muted)]">
        <div className="flex items-center gap-1.5 font-semibold text-[var(--tl-accent)]">
          <Lock className="h-3.5 w-3.5" />
          <span>Evidence Vault demonstration note</span>
        </div>
        <p>
          Existing purge and update actions are represented in the Evidence Vault demonstration record. The report and audit surfaces continue to use the current backend response data.
        </p>
      </div>
    </div>
  );
}

