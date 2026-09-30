import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  Layers,
  Shield,
  Briefcase,
  UserCheck,
  Lock,
  Mail,
  ArrowRight,
  Globe,
  Sparkles,
} from 'lucide-react';

export const LoginView = () => {
  const { login, lang, toggleLang, t } = useAuth();
  const { addToast } = useToast();

  const [email, setEmail] = useState('admin@anujaya.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login(email, password);
      if (!res.success) {
        addToast('error', res.message || 'Invalid email or password');
      } else {
        addToast('success', 'Logged in successfully!');
      }
    } catch (err) {
      addToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (roleEmail, rolePass) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setLoading(true);
    try {
      const res = await login(roleEmail, rolePass);
      if (res.success) {
        addToast('success', 'Authenticated with quick credentials');
      } else {
        addToast('error', res.message);
      }
    } catch (err) {
      addToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Language Switcher on Top Right */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleLang}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs text-slate-300 hover:text-white transition cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span>{lang === 'en' ? 'සිංහල භාෂාව' : 'English'}</span>
        </button>
      </div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Consortium Branding Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-indigo-600 items-center justify-center shadow-xl shadow-cyan-500/25 ring-1 ring-white/20 mb-2">
            <Layers className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            {t('consortiumName')}
          </h1>
          <p className="text-xs text-slate-400">
            {t('consortiumTagline')} • Jukiapp ERP System
          </p>
        </div>

        {/* Login Card */}
        <div className="p-6 md:p-8 rounded-2xl glass-card border border-slate-800 shadow-2xl space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Consortium Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@anujaya.com"
                  className="w-full glass-input pl-10 pr-3.5 py-2.5 rounded-xl text-xs"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full glass-input pl-10 pr-3.5 py-2.5 rounded-xl text-xs"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-500 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Consortium Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick 1-Click Role Login Demo Buttons */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Quick Demo Role Logins (1-Click Switch):</span>
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@anujaya.com', 'admin123')}
                className="w-full p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-indigo-500/30 text-left flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  <div>
                    <div className="font-bold text-slate-200">Admin (Anujaya Enterprises)</div>
                    <div className="text-[10px] text-slate-400">admin@anujaya.com • Full Control</div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('partner@global.com', 'partner123')}
                className="w-full p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-emerald-500/30 text-left flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="font-bold text-slate-200">Partner (Global Enterprises)</div>
                    <div className="text-[10px] text-slate-400">partner@global.com • Equity & Statements</div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('staff@anujaya.com', 'staff123')}
                className="w-full p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-amber-500/30 text-left flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="font-bold text-slate-200">Staff (Operations & Dispatches)</div>
                    <div className="text-[10px] text-slate-400">staff@anujaya.com • Dispatches & Returns</div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
