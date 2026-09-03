import React from 'react';
import { AlertCircle, ShieldAlert, Globe, Link2, Bot, CheckCircle } from 'lucide-react';

export default function ReasonList({ reasons = [] }) {
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'HEADER_AUTH':
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case 'DOMAIN_SPOOF':
        return <Globe className="w-4 h-4 text-orange-400" />;
      case 'URL_THREAT':
        return <Link2 className="w-4 h-4 text-red-400" />;
      case 'ML_CONTENT':
        return <Bot className="w-4 h-4 text-purple-400" />;
      default:
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    }
  };

  const getCategoryBadge = (category) => {
    switch (category) {
      case 'HEADER_AUTH':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'DOMAIN_SPOOF':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'URL_THREAT':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'ML_CONTENT':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-blue-400" />
          Threat Indicators & Explainable Risk Reasons
        </h3>
        <span className="text-xs text-slate-500 font-mono">
          {reasons.length} {reasons.length === 1 ? 'finding' : 'findings'}
        </span>
      </div>

      <div className="mt-4 space-y-2.5">
        {reasons.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 text-center text-slate-500 text-xs">
            No active threat indicators detected.
          </div>
        ) : (
          reasons.map((r, i) => (
            <div
              key={r.id || i}
              className="flex items-start justify-between gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start space-x-3">
                <div className="mt-0.5 p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                  {getCategoryIcon(r.category)}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getCategoryBadge(
                        r.category
                      )}`}
                    >
                      {r.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">{r.reason}</p>
                </div>
              </div>

              <div className="shrink-0 font-mono text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                +{r.weight}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

