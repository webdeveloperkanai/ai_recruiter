import React, { useState } from 'react';
import { JobRole, Language, InterviewConfig } from '../types';
import { ArrowRight, Mic, Briefcase, Globe, User } from 'lucide-react';

interface WelcomeScreenProps {
  onStart: (config: InterviewConfig) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<JobRole>(JobRole.SDE_INTERN);
  const [language, setLanguage] = useState<Language>(Language.ENGLISH);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onStart({ name, role, language });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="bg-indigo-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
            <Mic className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Cehpoint AI Recruiter</h1>
          <p className="text-slate-400">Automated HR Interview Process</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-slate-300 gap-2">
              <User size={16} />
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-slate-500"
              placeholder="Enter your full name"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-slate-300 gap-2">
              <Briefcase size={16} />
              Position Applied For
            </label>
            <div className="grid grid-cols-1 gap-2">
              {Object.values(JobRole).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`text-left px-4 py-3 rounded-lg border transition-all ${
                    role === r
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-100'
                      : 'bg-slate-900/50 border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-slate-300 gap-2">
              <Globe size={16} />
              Preferred Language
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(Language).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLanguage(l)}
                  className={`text-center px-2 py-2 rounded-lg border text-sm font-medium transition-all ${
                    language === l
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-100'
                      : 'bg-slate-900/50 border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 group"
          >
            Start Interview
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <p className="text-xs text-center text-slate-500 mt-4">
            By starting, you agree to record your video and audio for evaluation purposes.
            Duration: ~5 Minutes.
          </p>
        </form>
      </div>
    </div>
  );
};