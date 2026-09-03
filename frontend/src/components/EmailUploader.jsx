import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Send, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { uploadEmail } from '../api/client';

const SAMPLES = {
  sample1: {
    name: 'Sample 1: Russian Relay (Spoofed Chase Alert)',
    desc: 'SPF/DKIM fail, mismatched Reply-To, origin IP in Moscow, Russia',
    content: `Received: from mail.attacker-relay.ru (mail.attacker-relay.ru [185.220.101.5])
	by mx.target-corp.com (Postfix) with ESMTP id 4X9Q01
	for <cfo@target-corp.com>; Wed, 02 Sep 2026 14:22:00 +0000
Received: from localhost (127.0.0.1)
	by mail.attacker-relay.ru (Postfix) with SMTP;
Authentication-Results: mx.target-corp.com;
	spf=fail smtp.mailfrom=support@chase-secure-verification.com;
	dkim=fail header.i=@chase-secure-verification.com;
	dmarc=fail action=none header.from=chase-secure-verification.com
From: "Chase Security Alert" <support@chase-secure-verification.com>
To: <cfo@target-corp.com>
Reply-To: <collector@unauthorized-phish.ru>
Return-Path: <bounce@unauthorized-phish.ru>
Subject: URGENT: Unauthorized Wire Transfer of $4,850.00 Detected
Date: Wed, 02 Sep 2026 14:21:40 +0000
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8

Dear Valued Customer,

Our 24/7 Fraud Prevention Monitoring team detected an unauthorized wire transfer attempt of $4,850.00 originating from an unrecognized IP in Moscow, Russia.

Your account access has been temporarily restricted to safeguard remaining assets.

Immediate action is required:
Please click the secure link below within 2 hours to confirm your identity, cancel the pending wire, and re-secure your banking credentials:
https://chase-secure-verification.com/login?token=892348

Failure to verify immediately will result in forfeiture of disputed funds and permanent account restriction.

Sincerely,
Chase Online Fraud Prevention & Asset Protection Division`
  },
  sample2: {
    name: 'Sample 2: Lookalike Domain (microsof1-online.net)',
    desc: 'Levenshtein edit-distance 1 lookalike brand domain + payroll exfiltration',
    content: `Received: from relay.internal.net [91.240.118.89]
	by mail.company.com (Postfix) with ESMTPS id A8912B;
Received: from postfix.spoofhost.org (postfix.spoofhost.org [194.135.25.10])
	by relay.internal.net with ESMTP id 55T11;
Authentication-Results: mail.company.com;
	spf=softfail smtp.mailfrom=payroll@microsof1-online.net;
	dkim=fail;
	dmarc=fail
From: "Microsoft Payroll Office" <payroll@microsof1-online.net>
To: <accounting@company.com>
Reply-To: <exfil-data@bulletproof.cc>
Subject: Action Required: Mandatory Year-End Direct Deposit Verification
Date: Wed, 02 Sep 2026 15:10:00 +0000
Content-Type: text/plain; charset=utf-8

All Corporate Employees,

During our mandatory annual tax compliance audit, errors were flagged in your direct deposit bank routing records.
To avoid salary deposit disruption on this Friday's payroll run, update your bank account information immediately.

Access the Corporate HR Portal:
http://microsof1-online.net/payroll-portal

All submissions must be confirmed prior to 5:00 PM today.

Human Resources and Benefits Administration
Microsoft Corporation`
  },
  sample3: {
    name: 'Sample 3: Legitimate Corporate Email (Priya Sharma)',
    desc: 'Google relay, passing SPF/DKIM/DMARC, clean progress notes',
    content: `Received: from mail-pj1-f42.google.com (mail-pj1-f42.google.com [209.85.216.42])
	by mx.enterprise.org (Postfix) with ESMTPS id 4ABC12
	for <lead@enterprise.org>; Wed, 02 Sep 2026 10:15:22 +0000
Authentication-Results: mx.enterprise.org;
	spf=pass smtp.mailfrom=priya.sharma@enterprise.org;
	dkim=pass header.i=@enterprise.org;
	dmarc=pass action=none header.from=enterprise.org
From: "Priya Sharma" <priya.sharma@enterprise.org>
To: <lead@enterprise.org>
Subject: ThreatLens Sprint 3 Progress & Code Review
Date: Wed, 02 Sep 2026 10:14:00 +0000
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8

Hi Lead,

Just wanted to share our update from today's sprint sync.
The origin tracer and the tamper-evident hash-chained evidence vault are both fully functional and tested.
All automated unit and regression tests are passing.

Please let me know if you have time for a quick 15-minute walkthrough before our Advisory Board presentation this afternoon.

Best regards,
Priya Sharma
Lead Cyber Forensic Engineer
AICTE Hackathon 2026`
  }
};

export default function EmailUploader({ onScanComplete }) {
  const [activeMode, setActiveMode] = useState('upload'); // 'upload' | 'paste'
  const [rawText, setRawText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanStep, setScanStep] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setError('');
    }
  };

  const handleSampleSelect = (sampleKey) => {
    const sample = SAMPLES[sampleKey];
    setRawText(sample.content);
    setSelectedFile(null);
    setActiveMode('paste');
    setError('');
  };

  const handleScan = async () => {
    setError('');
    if (activeMode === 'upload' && !selectedFile) {
      setError('Please select or drag-and-drop a .eml file to scan.');
      return;
    }
    if (activeMode === 'paste' && !rawText.trim()) {
      setError('Please paste raw email RFC 822 text or select a demo sample.');
      return;
    }

    setLoading(true);
    setScanStep('1/5 Parsing RFC 822 headers and MIME structure...');

    try {
      setTimeout(() => setScanStep('2/5 Evaluating SPF/DKIM & lookalike brand domains...'), 200);
      setTimeout(() => setScanStep('3/5 Running leak-free Scikit-Learn body classifier...'), 450);
      setTimeout(() => setScanStep('4/5 Tracing chronological Received: hop trail...'), 700);
      setTimeout(() => setScanStep('5/5 Appending to tamper-evident Evidence Vault...'), 950);

      let payload;
      if (activeMode === 'upload' && selectedFile) {
        payload = new FormData();
        payload.append('file', selectedFile);
      } else {
        payload = rawText;
      }

      const result = await uploadEmail(payload);
      setTimeout(() => {
        setLoading(false);
        onScanComplete(result);
      }, 1100);
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Analysis failed. Please check backend connection.');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-blue-400" />
            Scan & Analyze Incoming Email
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Ingest .eml files or raw RFC 822 payloads for multi-layer threat detection, geolocation tracing, and forensic preservation.
          </p>
        </div>

        {/* Input Mode Toggle */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs self-start md:self-auto">
          <button
            onClick={() => setActiveMode('upload')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeMode === 'upload' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            File Upload (.eml)
          </button>
          <button
            onClick={() => setActiveMode('paste')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeMode === 'paste' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Raw Text / Paste
          </button>
        </div>
      </div>

      {/* Quick Demo Preloads */}
      <div className="mt-4 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>HACKATHON QUICK SAMPLES:</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {Object.entries(SAMPLES).map(([key, item]) => (
            <button
              key={key}
              onClick={() => handleSampleSelect(key)}
              className="text-left p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500/40 transition-all group"
            >
              <div className="text-xs font-medium text-slate-200 group-hover:text-blue-400 transition-colors">
                {item.name}
              </div>
              <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                {item.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <div className="mt-4">
        {activeMode === 'upload' ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              selectedFile
                ? 'border-blue-500 bg-blue-500/5'
                : 'border-slate-700 hover:border-slate-500 bg-slate-950/30'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".eml,message/rfc822,text/plain"
              className="hidden"
            />
            <div className="flex flex-col items-center">
              <div className="p-3 bg-slate-800/70 rounded-full mb-3 text-blue-400">
                <FileText className="w-8 h-8" />
              </div>
              {selectedFile ? (
                <div>
                  <p className="text-sm font-semibold text-white">{selectedFile.name}</p>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    {(selectedFile.size / 1024).toFixed(1)} KB — Click to change file
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-slate-300">
                    Drop suspicious <span className="text-blue-400 font-semibold">.eml file</span> here or click to browse
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Supports RFC 822, MIME multipart emails</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste raw email RFC 822 text (including Received: headers, From:, Subject:, and Body)..."
              rows={8}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Action Button */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-slate-500">
          {loading ? (
            <span className="flex items-center gap-2 text-blue-400 font-mono">
              <Loader2 className="w-4 h-4 animate-spin" />
              {scanStep}
            </span>
          ) : (
            <span>Ready to analyze RFC 822 headers & payload.</span>
          )}
        </div>

        <button
          onClick={handleScan}
          disabled={loading}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Scanning...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Scan Email</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

