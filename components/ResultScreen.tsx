import React, { useEffect, useState } from 'react';
import { InterviewConfig, InterviewResult } from '../types';
import { CheckCircle, XCircle, Download, Phone, RefreshCcw, Mail, FileText, MessageSquare, Database, AlertCircle } from 'lucide-react';

interface ResultScreenProps {
  config: InterviewConfig;
  result: InterviewResult;
  onRestart: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({ config, result, onRestart }) => {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Auto-save to Google Sheets on mount
  useEffect(() => {
    const sheetUrl = process.env.GOOGLE_SHEET_URL;
    if (sheetUrl && saveStatus === 'idle') {
      saveToGoogleSheets(sheetUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveToGoogleSheets = async (url: string) => {
    setSaveStatus('saving');
    
    // Format transcript into a readable string block
    const transcriptText = result.transcript.map(t => 
      `[${t.timestamp}] ${t.speaker === 'ai' ? 'HR' : 'CANDIDATE'}: ${t.text}`
    ).join('\n');

    const payload = {
      date: new Date().toLocaleString(),
      name: config.name,
      role: config.role,
      language: config.language,
      status: result.passed ? "SELECTED" : "REJECTED",
      notes: result.notes || "N/A",
      transcript: transcriptText
    };

    try {
      // We use no-cors because Google Apps Script Web Apps do not support CORS for browser fetch.
      // This means we won't get a readable response JSON, but the data will send.
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors', 
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      setSaveStatus('success');
    } catch (err) {
      console.error("Failed to save to sheet", err);
      setSaveStatus('error');
    }
  };

  const downloadLog = () => {
    if (result.transcript && result.transcript.length > 0) {
      const header = `CEHPOINT AI RECRUITER - INTERVIEW LOG\nCandidate: ${config.name}\nRole: ${config.role}\nDate: ${new Date().toLocaleString()}\nResult: ${result.passed ? "SELECTED" : "REJECTED"}\nNotes: ${result.notes || "N/A"}\n------------------------------------------\n\n`;
      
      const content = result.transcript.map(t => 
        `[${t.timestamp}] ${t.speaker === 'ai' ? 'HR (Sarah)' : 'CANDIDATE'}: ${t.text}`
      ).join('\n\n');

      const blob = new Blob([header + content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${config.name.replace(/\s+/g, '_')}_Interview_Log.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 font-sans">
      <div className="max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

        <div className={`p-10 text-center relative overflow-hidden`}>
          <div className={`absolute inset-0 opacity-10 ${result.passed ? 'bg-gradient-to-b from-emerald-500 to-transparent' : 'bg-gradient-to-b from-red-500 to-transparent'}`}></div>
          
          <div className={`relative z-10 w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-xl ${result.passed ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
            {result.passed ? <CheckCircle className="w-12 h-12" /> : <XCircle className="w-12 h-12" />}
          </div>
          
          <h2 className="relative z-10 text-4xl font-bold text-white mb-3 tracking-tight">
            {result.passed ? 'You Are Selected' : 'Interview Result'}
          </h2>
          
          <div className="relative z-10 inline-block px-4 py-1 rounded-full bg-slate-800/50 border border-slate-700 backdrop-blur-sm mb-6">
            <span className={`text-sm font-medium ${result.passed ? 'text-emerald-400' : 'text-red-400'}`}>
              {result.passed ? 'Application Shortlisted' : 'Application Not Selected'}
            </span>
          </div>

          <p className="relative z-10 text-slate-400 text-lg leading-relaxed max-w-lg mx-auto">
             {result.passed 
               ? "Congratulations! Your performance was impressive. We would like to proceed with your application immediately." 
               : "Thank you for your time. Unfortunately, we will not be moving forward with your application at this moment."}
          </p>

          {/* Database Sync Status Indicator */}
          <div className="relative z-10 flex justify-center mt-4">
             {saveStatus === 'saving' && (
                <span className="flex items-center gap-2 text-xs text-indigo-400 animate-pulse">
                  <Database className="w-3 h-3" /> Syncing with Company Database...
                </span>
             )}
             {saveStatus === 'success' && (
                <span className="flex items-center gap-2 text-xs text-emerald-500">
                  <CheckCircle className="w-3 h-3" /> Result Saved to Database
                </span>
             )}
             {saveStatus === 'error' && (
                <span className="flex items-center gap-2 text-xs text-red-400">
                  <AlertCircle className="w-3 h-3" /> Connection to Database Failed
                </span>
             )}
          </div>
        </div>

        <div className="p-8 bg-slate-900/50 backdrop-blur-sm border-t border-slate-800">
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Contact / Feedback */}
              <div className="space-y-6">
                 {result.passed ? (
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-xl relative overflow-hidden group">
                      <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors duration-500"></div>
                      <div className="relative z-10">
                        <p className="text-xs text-emerald-500 font-bold uppercase tracking-widest mb-4">Executive Contact</p>
                        <div className="space-y-4">
                           <div className="flex items-center gap-3">
                                <div className="bg-slate-950 p-2 rounded-lg border border-slate-700">
                                    <Phone className="w-4 h-4 text-emerald-500" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">CEO Direct Line</p>
                                    <p className="text-white font-mono font-bold">9091156095</p>
                                </div>
                           </div>
                           <div className="flex items-center gap-3">
                                <div className="bg-slate-950 p-2 rounded-lg border border-slate-700">
                                    <Mail className="w-4 h-4 text-indigo-500" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">HR Email</p>
                                    <p className="text-white font-mono">hr@cehpoint.co.in</p>
                                </div>
                           </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                     <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-6 text-center h-full flex flex-col justify-center">
                         <h4 className="text-white font-medium mb-2">Feedback Notes</h4>
                         <p className="text-slate-400 text-sm italic">"{result.notes || "Improvement needed in technical depth."}"</p>
                     </div>
                  )}

                  <div className="flex gap-4">
                      <button
                        onClick={onRestart}
                        className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl shadow-lg transition-all font-medium"
                      >
                        <RefreshCcw className="w-4 h-4" />
                        <span>Home</span>
                      </button>
                      
                      <button
                        onClick={downloadLog}
                        className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl border border-slate-700 transition-all font-medium"
                      >
                        <Download className="w-4 h-4" />
                        <span>Save Log</span>
                      </button>
                  </div>
              </div>

              {/* Right Column: Transcript Preview */}
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 flex flex-col h-[300px]">
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      <span className="text-sm font-medium text-slate-300">Interview Transcript</span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
                      {result.transcript.map((entry, idx) => (
                          <div key={idx} className={`flex flex-col ${entry.speaker === 'ai' ? 'items-start' : 'items-end'}`}>
                              <span className="text-[10px] text-slate-500 mb-1 px-1">
                                  {entry.speaker === 'ai' ? 'HR (Sarah)' : 'Candidate'} • {entry.timestamp}
                              </span>
                              <div className={`max-w-[90%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                                  entry.speaker === 'ai' 
                                  ? 'bg-slate-800 text-slate-300 rounded-tl-none' 
                                  : 'bg-indigo-900/30 text-indigo-200 border border-indigo-500/20 rounded-tr-none'
                              }`}>
                                  {entry.text}
                              </div>
                          </div>
                      ))}
                      {result.transcript.length === 0 && (
                          <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2">
                              <MessageSquare className="w-8 h-8 opacity-20" />
                              <span className="text-xs">No transcript available</span>
                          </div>
                      )}
                  </div>
              </div>

           </div>
        </div>
      </div>
    </div>
  );
};