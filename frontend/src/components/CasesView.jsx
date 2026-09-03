import React, { useEffect, useState } from 'react';
import { FolderKanban, ShieldAlert, Globe, Server, ChevronRight, Hash, Mail, ArrowRight } from 'lucide-react';
import { listCases, getCaseDetail } from '../api/client';

export default function CasesView({ onSelectEmail }) {
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const data = await listCases();
      setCases(data);
      if (data.length > 0 && !selectedCase) {
        loadCaseDetails(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCaseDetails = async (caseId) => {
    try {
      const detail = await getCaseDetail(caseId);
      setSelectedCase(detail);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Case List Column */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-blue-400" />
            Active Threat Cases
          </h3>
          <span className="text-xs text-slate-400 font-mono">{cases.length} cases</span>
        </div>

        <div className="space-y-2.5">
          {cases.map((c) => {
            const isSelected = selectedCase?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => loadCaseDetails(c.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-600/10 border-blue-500 shadow-md shadow-blue-500/10'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {c.indicator_type === 'IP' ? (
                      <Server className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    ) : (
                      <Globe className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                    <span className="text-xs font-bold text-white line-clamp-1">{c.title}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                      c.status === 'INVESTIGATING'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                <div className="mt-2 text-xs font-mono text-slate-400 flex items-center justify-between">
                  <span>Shared {c.indicator_type}: <b className="text-slate-200">{c.shared_indicator}</b></span>
                  <span className="text-blue-400 font-bold">{c.email_count} emails</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Case Details & Linked Emails */}
      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        {selectedCase ? (
          <>
            <div className="pb-4 border-b border-slate-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[11px] font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    CASE CLUSTER
                  </span>
                  <h2 className="text-lg font-bold text-white mt-1.5">{selectedCase.title}</h2>
                  <p className="text-xs text-slate-400 mt-1">{selectedCase.notes || 'No notes available.'}</p>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-500">Max Threat Score</div>
                  <div className="text-2xl font-black text-rose-400">{selectedCase.highest_risk_score} / 100</div>
                </div>
              </div>

              {/* Shared Indicator Banner */}
              <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500">Correlated {selectedCase.indicator_type} Indicator:</span>
                <span className="text-rose-400 font-bold text-sm bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/20">
                  {selectedCase.shared_indicator}
                </span>
              </div>
            </div>

            {/* Linked Emails Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                Linked Incidents ({selectedCase.emails.length})
              </h4>

              {selectedCase.emails.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800 text-xs text-slate-500">
                  No emails currently linked to this case. Scan an email matching the shared indicator to auto-link!
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedCase.emails.map((em) => (
                    <div
                      key={em.id}
                      onClick={() => onSelectEmail(em.id)}
                      className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-blue-500/50 hover:bg-slate-950 cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                              em.risk_level === 'Critical'
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'bg-orange-500/20 text-orange-400'
                            }`}
                          >
                            {em.risk_level.toUpperCase()} ({em.risk_score})
                          </span>
                          <span className="text-xs font-semibold text-white">{em.subject || '(No Subject)'}</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-400 font-mono flex items-center gap-3">
                          <span>From: {em.sender}</span>
                          <span>Origin IP: {em.origin_ip || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="text-slate-500 flex items-center gap-1 text-xs hover:text-blue-400 font-medium">
                        <span>Investigate</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-12 text-center text-slate-500 text-xs">Select a case on the left to view linked incidents.</div>
        )}
      </div>
    </div>
  );
}

