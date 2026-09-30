import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Bell,
  Globe,
  LogOut,
  Shield,
  Briefcase,
  UserCheck,
  ChevronDown,
  Layers,
  Sparkles,
} from 'lucide-react';

export const Navbar = ({ alertCounts = {}, onOpenAlerts }) => {
  const { user, logout, quickSwitchRole, lang, toggleLang, t } = useAuth();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'Admin':
        return {
          label: 'Admin (Anujaya)',
          bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
          icon: <Shield className="w-3.5 h-3.5" />,
        };
      case 'Partner':
        return {
          label: 'Partner (Global)',
          bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          icon: <Briefcase className="w-3.5 h-3.5" />,
        };
      case 'Staff':
      default:
        return {
          label: 'Staff (Ops)',
          bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          icon: <UserCheck className="w-3.5 h-3.5" />,
        };
    }
  };

  const badge = getRoleBadge(user?.role);
  const totalAlerts = (alertCounts.overdue || 0) + (alertCounts.dueToday || 0) + (alertCounts.dueIn3Days || 0);

  return (
    <header className="sticky top-0 z-30 h-16 w-full glass-panel border-b border-slate-800/80 px-4 md:px-6 flex items-center justify-between">
      {/* Brand & Consortium Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-white/20">
          <Layers className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-base md:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              {t('consortiumName')}
            </h1>
            <span className="hidden sm:inline-flex text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
              ERP v2.6 PRO
            </span>
          </div>
          <p className="hidden md:block text-[11px] text-slate-400">
            {t('consortiumTagline')} • Juki / Heavy Apparel Automation
          </p>
        </div>
      </div>

      {/* Right Controls: Role Switcher, Language Toggle, Alerts, User Profile */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Quick RBAC Role Switcher (Convenient for Review & Pair Testing) */}
        <div className="relative">
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700/80 hover:border-slate-500 text-xs text-slate-300 transition"
            title="Switch User Role to test RBAC permissions"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline text-slate-400">Role:</span>
            <span className="font-semibold text-white">{user?.role}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {roleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl glass-dropdown shadow-2xl p-1.5 z-50">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                Switch Role (Instant Test)
              </div>
              <button
                onClick={() => {
                  quickSwitchRole('Admin');
                  setRoleDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition ${
                  user?.role === 'Admin' ? 'bg-indigo-600/30 text-indigo-200' : 'hover:bg-slate-800/60 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  <span>Admin (Anujaya)</span>
                </div>
                {user?.role === 'Admin' && <span className="text-[10px] text-indigo-400 font-bold">Active</span>}
              </button>

              <button
                onClick={() => {
                  quickSwitchRole('Partner');
                  setRoleDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition ${
                  user?.role === 'Partner' ? 'bg-emerald-600/30 text-emerald-200' : 'hover:bg-slate-800/60 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-400" />
                  <span>Partner (Global)</span>
                </div>
                {user?.role === 'Partner' && <span className="text-[10px] text-emerald-400 font-bold">Active</span>}
              </button>

              <button
                onClick={() => {
                  quickSwitchRole('Staff');
                  setRoleDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition ${
                  user?.role === 'Staff' ? 'bg-amber-600/30 text-amber-200' : 'hover:bg-slate-800/60 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-amber-400" />
                  <span>Staff (Operations)</span>
                </div>
                {user?.role === 'Staff' && <span className="text-[10px] text-amber-400 font-bold">Active</span>}
              </button>
            </div>
          )}
        </div>

        {/* Bilingual Language Switcher (EN / SI) */}
        <button
          onClick={toggleLang}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700/80 hover:border-cyan-500/60 text-xs font-medium text-slate-300 hover:text-white transition"
          title="Toggle Language: English / සිංහල"
        >
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-bold">{lang === 'en' ? 'සිංහල' : 'EN'}</span>
        </button>

        {/* Rental Deadline Alert Bell */}
        <button
          onClick={onOpenAlerts}
          className="relative p-2 rounded-lg bg-slate-900/90 border border-slate-700/80 hover:border-amber-500/60 text-slate-300 hover:text-white transition"
          title="Rental Payment Alerts"
        >
          <Bell className="w-4 h-4 text-amber-400" />
          {totalAlerts > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
              {totalAlerts}
            </span>
          )}
        </button>

        {/* User Profile Badge */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="text-right">
            <div className="text-xs font-semibold text-slate-200 truncate max-w-[130px]">
              {user?.name || 'Consortium User'}
            </div>
            <div className="text-[10px] text-slate-400 truncate max-w-[130px]">
              {user?.partnerCompany || 'Anujaya & Global'}
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.bg}`}
          >
            {badge.icon}
            <span>{badge.label}</span>
          </span>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="p-2 rounded-lg bg-rose-950/40 border border-rose-800/50 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 transition"
          title={t('logout')}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
