import React, { useState, useEffect } from 'react';
import { Sparkles, Bot, RefreshCw } from 'lucide-react';
import { getAiBriefing } from '../api/client';

export default function AiBriefingCard({ emailId }) {
  const [briefing, setBriefing] = useState('');
  const [loading, setLoading] = useState(false);
  const [engine, setEngine] = useState('Google Gemini 3.5 Copilot');

  useEffect(() => {
    if (emailId) {
      loadBriefing();
    }
  }, [emailId]);

  const loadBriefing = async () => {
    if (!emailId) return;
    setLoading(true);
    try {
      const data = await getAiBriefing(emailId);
      setBriefing(data.briefing);
      if (data.engine) setEngine(data.engine);
    } catch (err) {
      console.error(err);
      setBriefing('AI analysis currently unavailable. Please verify connectivity.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tl-evidence-surface relative overflow-hidden p-5 sm:p-6" aria-label="Existing AI analysis briefing">

      <div className="relative z-10 flex items-center justify-between gap-3 border-b border-[var(--tl-border)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-md border border-emerald-400/25 bg-emerald-400/10 p-1.5 text-[var(--tl-accent)]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--tl-text)]">
              AI Forensic Executive Briefing
              <span className="rounded-full border border-[var(--tl-border-strong)] bg-[var(--tl-surface-inset)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--tl-text-secondary)]">
                {engine}
              </span>
            </h3>
            <p className="text-[11px] text-[var(--tl-text-muted)]">
              Automated social engineering analysis & threat containment advice.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadBriefing}
          disabled={loading}
          aria-label={loading ? 'AI briefing is loading' : 'Refresh existing AI briefing'}
          className="tl-button-secondary inline-flex items-center gap-1.5 border-emerald-400/25 text-[var(--tl-accent)] hover:border-emerald-400/50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Analyzing...' : 'Refresh AI Analysis'}</span>
        </button>
      </div>

      <div className="relative z-10 mt-3.5 font-sans text-xs leading-relaxed text-[var(--tl-text-secondary)]">
        {loading ? (
          <div className="flex items-center gap-2 py-2 font-mono text-[var(--tl-text-muted)]" role="status" aria-live="polite">
            <Bot className="h-4 w-4 animate-bounce text-[var(--tl-accent)]" />
            <span>Consulting Google Gemini forensic copilot...</span>
          </div>
        ) : (
          <p className="tl-panel-inset p-3.5 leading-relaxed text-[var(--tl-text-secondary)]" aria-live="polite">
            {briefing}
          </p>
        )}
      </div>
    </div>
  );
}

