import React from 'react';
import { ShieldAlert, Compass, FolderKanban, Sliders, LogIn, LogOut, User } from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  backendOnline,
  user,
  onOpenAuthModal,
  onLogout,
}) {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div
          className="flex items-center space-x-3 cursor-pointer"
          onClick={() => setActiveTab('scanner')}
        >
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-2 rounded-xl shadow-lg shadow-blue-500/20">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xl tracking-tight text-white">ThreatLens</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                v2.0
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">Detect. Trace. Prove.</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'scanner'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Scan & Investigate</span>
          </button>

          <button
            onClick={() => setActiveTab('cases')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'cases'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            <span>Case Linker</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Governance & Vault</span>
          </button>
        </nav>

        {/* User Auth & Backend Status */}
        <div className="flex items-center space-x-3">
          {/* Engine Status */}
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-800/70 border border-slate-700/60 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                backendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
            <span className="text-slate-300 font-mono text-[11px]">
              {backendOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          {/* Authentication Badge */}
          {user ? (
            <div className="flex items-center space-x-2.5 bg-slate-950 p-1.5 pl-3 rounded-xl border border-slate-800">
              <div className="flex flex-col text-right">
                <span className="text-xs font-bold text-white leading-tight">
                  {user.full_name || user.email.split('@')[0]}
                </span>
                <span className="text-[10px] font-mono font-semibold text-blue-400 uppercase">
                  {user.role}
                </span>
              </div>
              <button
                onClick={onLogout}
                title="Log Out"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-850 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Sign Up</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
