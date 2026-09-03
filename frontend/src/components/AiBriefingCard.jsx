import React, { useState, useEffect } from 'react';
import { Sparkles, Bot, RefreshCw, ShieldAlert, CheckCircle2 } from 'lucide-react';
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
    <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-indigo-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden">
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -z-0 pointer-events-none" />

      <div className="flex items-center justify-between pb-3 border-b border-slate-800 relative z-10">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              AI Forensic Executive Briefing
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {engine}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Automated social engineering analysis & threat containment advice.
            </p>
          </div>
        </div>

        <button
          onClick={loadBriefing}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold border border-indigo-500/30 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Analyzing...' : 'Refresh AI Analysis'}</span>
        </button>
      </div>

      <div className="mt-3.5 text-xs text-slate-200 leading-relaxed font-sans relative z-10">
        {loading ? (
          <div className="flex items-center space-x-2 text-slate-400 font-mono py-2">
            <Bot className="w-4 h-4 animate-bounce text-indigo-400" />
            <span>Consulting Google Gemini forensic copilot...</span>
          </div>
        ) : (
          <p className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/80 text-slate-300 leading-relaxed">
            {briefing}
          </p>
        )}
      </div>
    </div>
  );
}

