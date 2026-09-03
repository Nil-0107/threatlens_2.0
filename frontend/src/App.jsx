import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import EmailUploader from './components/EmailUploader';
import RiskScoreCard from './components/RiskScoreCard';
import ReasonList from './components/ReasonList';
import HopMap from './components/HopMap';
import ForensicChainViewer from './components/ForensicChainViewer';
import CasesView from './components/CasesView';
import SettingsModal from './components/SettingsModal';
import AuthModal from './components/AuthModal';
import AiBriefingCard from './components/AiBriefingCard';
import {
  listEmails,
  getEmailDetail,
  deleteEmail,
  clearAllEmails,
  exportReportPdf,
  checkBackendHealth,
  getStoredUser,
  logoutUser,
} from './api/client';
import { Clock, Inbox, ChevronRight, Trash2, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('scanner');
  const [backendOnline, setBackendOnline] = useState(false);
  const [emails, setEmails] = useState([]);
  const [currentEmail, setCurrentEmail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [maskPii, setMaskPii] = useState(false);

  // Auth State
  const [user, setUser] = useState(getStoredUser());
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Initial load
  useEffect(() => {
    checkHealthAndLoad();
  }, []);

  const checkHealthAndLoad = async () => {
    const isOnline = await checkBackendHealth();
    setBackendOnline(isOnline);

    try {
      const emailList = await listEmails();
      setEmails(emailList);
      if (emailList.length > 0) {
        loadEmail(emailList[0].id);
      }
    } catch (err) {
      console.error('Error fetching email queue:', err);
    }
  };

  const loadEmail = async (id) => {
    try {
      setLoadingDetail(true);
      const detail = await getEmailDetail(id);
      setCurrentEmail(detail);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleScanComplete = (newEmail) => {
    setCurrentEmail(newEmail);
    // Refresh queue
    listEmails().then((list) => setEmails(list));
    setActiveTab('scanner');
  };

  const handleExportPdf = async () => {
    if (!currentEmail) return;
    try {
      const blob = await exportReportPdf(currentEmail.id, maskPii);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ThreatLens_Forensic_Report_${currentEmail.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export PDF: ' + err.message);
    }
  };

  const handleDeleteEmail = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Delete this incident from the investigation queue?')) return;
    try {
      await deleteEmail(id);
      const updated = emails.filter((em) => em.id !== id);
      setEmails(updated);
      if (currentEmail?.id === id) {
        if (updated.length > 0) {
          loadEmail(updated[0].id);
        } else {
          setCurrentEmail(null);
        }
      }
    } catch (err) {
      alert('Failed to delete incident: ' + err.message);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all incidents from the queue?')) return;
    try {
      await clearAllEmails();
      setEmails([]);
      setCurrentEmail(null);
    } catch (err) {
      alert('Failed to clear queue: ' + err.message);
    }
  };

  const handleAuthSuccess = (userData) => {
    setUser({
      email: userData.email,
      role: userData.role,
      full_name: userData.full_name,
    });
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        backendOnline={backendOnline}
        user={user}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Recent Incidents Bar (Queue) */}
        {emails.length > 0 && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-4 overflow-x-auto">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 shrink-0 px-2">
              <Inbox className="w-3.5 h-3.5 text-blue-400" />
              <span>INCIDENT QUEUE ({emails.length}):</span>
            </div>

            <div className="flex items-center space-x-2 overflow-x-auto py-1 flex-1">
              {emails.map((em) => {
                const isSelected = currentEmail?.id === em.id;
                return (
                  <div
                    key={em.id}
                    className={`flex items-center space-x-1.5 pl-3 pr-1.5 py-1 rounded-lg text-xs font-mono shrink-0 transition-all border group ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500 text-white font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => loadEmail(em.id)}
                      className="flex items-center space-x-2 text-left"
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          em.risk_level === 'Critical'
                            ? 'bg-rose-500'
                            : em.risk_level === 'High'
                            ? 'bg-orange-500'
                            : em.risk_level === 'Medium'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                      />
                      <span className="truncate max-w-[130px]">{em.subject || em.sender}</span>
                      <span className="text-slate-500 font-normal">({em.risk_score})</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteEmail(em.id, e)}
                      title="Delete this incident from queue"
                      className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800/80 rounded transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleClearAll}
              title="Clear all incidents from the queue"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold shrink-0 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Queue</span>
            </button>
          </div>
        )}

        {/* Tab 1: Scanner & Active Investigation */}
        {activeTab === 'scanner' && (
          <div className="space-y-6">
            {/* Upload Area */}
            <EmailUploader onScanComplete={handleScanComplete} />

            {/* Active Email Investigation Workspace */}
            {currentEmail && (
              <div className="space-y-6">
                {/* Active Incident Header Banner */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
                      <span>INCIDENT ID:</span>
                      <span className="text-white font-bold">{currentEmail.id}</span>
                      <span>•</span>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(currentEmail.created_at).toLocaleString()}</span>
                    </div>
                    <h1 className="text-xl font-black text-white mt-1">
                      {currentEmail.subject || '(No Subject)'}
                    </h1>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span>From: <b className="text-slate-200">{currentEmail.sender}</b></span>
                      {currentEmail.reply_to && (
                        <span>Reply-To: <b className="text-slate-300">{currentEmail.reply_to}</b></span>
                      )}
                      <span>Domain: <b className="text-blue-400">{currentEmail.sender_domain}</b></span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-start md:self-auto">
                    {currentEmail.case_id && (
                      <button
                        onClick={() => setActiveTab('cases')}
                        className="px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-semibold flex items-center gap-2 transition-colors"
                      >
                        <span>Correlated with Case</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteEmail(currentEmail.id)}
                      title="Delete this incident and its forensic records"
                      className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Incident</span>
                    </button>
                  </div>
                </div>

                {/* AI Forensic Executive Briefing (Google Gemini) */}
                <AiBriefingCard emailId={currentEmail.id} />

                {/* Score & Findings Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <RiskScoreCard
                    email={currentEmail}
                    onExport={handleExportPdf}
                    onVerifyChain={() => {}}
                  />
                  <div className="lg:col-span-2">
                    <ReasonList reasons={currentEmail.reasons || []} />
                  </div>
                </div>

                {/* Origin Tracer Leaflet Hop Map */}
                <HopMap hops={currentEmail.hops || []} />

                {/* Evidence Vault Hash-Chain Timeline */}
                <ForensicChainViewer emailId={currentEmail.id} />
              </div>
            )}
          </div>
        )}


        {/* Tab 3: Cases View */}
        {activeTab === 'cases' && (
          <CasesView
            onSelectEmail={(id) => {
              loadEmail(id);
              setActiveTab('scanner');
            }}
          />
        )}

        {/* Tab 4: Governance & Settings */}
        {activeTab === 'settings' && (
          <SettingsModal maskPii={maskPii} setMaskPii={setMaskPii} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-500 font-mono">
        ThreatLens Platform • Smart India Hackathon 2026 • AICTE Cyber Security Cell (PS ID: 26106)
      </footer>
    </div>
  );
}
