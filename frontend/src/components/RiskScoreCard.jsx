import React from 'react';
import { ShieldAlert, ShieldCheck, FileDown, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export default function RiskScoreCard({ email, onExport, onVerifyChain, isVerifying }) {
  if (!email) return null;

  const score = email.risk_score;
  const level = email.risk_level;

  let colorClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  let barColor = 'bg-emerald-500';
  let badgeText = 'LOW RISK';

  if (level === 'Critical') {
    colorClass = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    barColor = 'bg-rose-500';
    badgeText = 'CRITICAL THREAT';
  } else if (level === 'High') {
    colorClass = 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    barColor = 'bg-orange-500';
    badgeText = 'HIGH RISK';
  } else if (level === 'Medium') {
    colorClass = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    barColor = 'bg-amber-500';
    badgeText = 'SUSPICIOUS';
  }

  // Parse auth results JSON
  let authSummary = { spf: 'neutral', dkim: 'neutral', dmarc: 'neutral' };
  try {
    if (email.auth_results) {
      authSummary = JSON.parse(email.auth_results);
    }
  } catch {}

  const renderAuthPill = (name, status) => {
    const isPass = status === 'pass';
    const isFail = status === 'fail';
    return (
      <div
        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border ${
          isPass
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            : isFail
            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 font-bold'
            : 'bg-slate-800 text-slate-400 border-slate-700'
        }`}
      >
        {isPass ? (
          <CheckCircle2 className="w-3.5 h-3.5" />
        ) : isFail ? (
          <XCircle className="w-3.5 h-3.5" />
        ) : (
          <AlertTriangle className="w-3.5 h-3.5" />
        )}
        <span>{name.toUpperCase()}: {status.toUpperCase()}</span>
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Risk Assessment</span>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold tracking-wide border ${colorClass}`}>
            {badgeText}
          </span>
        </div>

        {/* Score Display */}
        <div className="mt-4 flex items-baseline space-x-2">
          <span className="text-5xl font-black tracking-tight text-white">{score}</span>
          <span className="text-sm font-semibold text-slate-500">/ 100</span>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
            style={{ width: `${score}%` }}
          />
        </div>

        {/* Authentication Headers Breakdown */}
        <div className="mt-5 pt-4 border-t border-slate-800">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
            RFC 7601 Header Authentication
          </span>
          <div className="flex flex-wrap gap-2">
            {renderAuthPill('spf', authSummary.spf || 'neutral')}
            {renderAuthPill('dkim', authSummary.dkim || 'neutral')}
            {renderAuthPill('dmarc', authSummary.dmarc || 'neutral')}
          </div>
        </div>

        {/* Metadata summary */}
        <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5 text-xs text-slate-400">
          <div className="flex justify-between">
            <span className="text-slate-500">Origin IP:</span>
            <span className="font-mono text-slate-300 font-semibold">{email.origin_ip || 'Internal / N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Raw SHA-256:</span>
            <span className="font-mono text-slate-300 text-[11px] truncate max-w-[170px]" title={email.raw_hash}>
              {email.raw_hash}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="mt-6 grid grid-cols-2 gap-2 pt-4 border-t border-slate-800">
        <button
          onClick={onVerifyChain}
          disabled={isVerifying}
          className="flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Verify Chain</span>
        </button>

        <button
          onClick={onExport}
          className="flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold border border-blue-500/30 transition-colors"
        >
          <FileDown className="w-3.5 h-3.5" />
          <span>Export PDF</span>
        </button>
      </div>
    </div>
  );
}

