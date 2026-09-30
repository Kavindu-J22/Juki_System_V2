import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Cpu,
  Layers,
  Users,
  Bookmark,
  Receipt,
  Landmark,
  BarChart3,
  Settings,
  ChevronRight,
  TrendingUp,
  Truck,
} from 'lucide-react';

export const Sidebar = ({ currentView, onViewChange, alertCounts = {} }) => {
  const { t, user, isAdmin, isPartner, isStaff } = useAuth();

  const navItems = [
    {
      id: 'dashboard',
      label: t('dashboard'),
      icon: LayoutDashboard,
      roles: ['Admin', 'Partner', 'Staff'],
      badge: alertCounts.overdue > 0 ? `${alertCounts.overdue} Overdue` : null,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'machinery',
      label: t('machinery'),
      icon: Cpu,
      roles: ['Admin', 'Partner', 'Staff'],
    },
    {
      id: 'salesLedger',
      label: t('salesLedger'),
      icon: Layers,
      roles: ['Admin', 'Partner', 'Staff'],
    },
    {
      id: 'customers',
      label: t('customers'),
      icon: Users,
      roles: ['Admin', 'Partner', 'Staff'],
    },
    {
      id: 'brands',
      label: t('brands'),
      icon: Bookmark,
      roles: ['Admin', 'Partner', 'Staff'],
    },
    {
      id: 'expenses',
      label: t('expenses'),
      icon: Receipt,
      roles: ['Admin', 'Partner'], // Admin full control, Partner views liabilities
    },
    {
      id: 'partnerLedger',
      label: t('partnerLedger'),
      icon: Landmark,
      roles: ['Admin', 'Partner'], // Dedicated Partner & Admin equity view
      badge: 'Consortium',
      badgeColor: 'bg-emerald-950 text-emerald-400 border border-emerald-800',
    },
    {
      id: 'reports',
      label: t('reports'),
      icon: BarChart3,
      roles: ['Admin', 'Partner', 'Staff'],
    },
    {
      id: 'settings',
      label: t('settings'),
      icon: Settings,
      roles: ['Admin'], // Full system master control & company settings
    },
  ];

  // Filter items based on user role
  const visibleItems = navItems.filter((item) =>
    item.roles.includes(user?.role || 'Staff')
  );

  return (
    <aside className="w-64 shrink-0 glass-panel border-r border-slate-800/80 flex flex-col justify-between hidden lg:flex min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-6">
        {/* Consortium Status Banner */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Consortium Live Status
            </span>
            <span className="text-emerald-400 font-bold">ACTIVE</span>
          </div>
          <div className="text-xs font-semibold text-slate-200">
            {user?.role === 'Partner'
              ? 'Partner Equity Portal (Global Enterprises)'
              : user?.role === 'Admin'
              ? 'Consortium Master Admin (Anujaya)'
              : 'Operations & Dispatch Desk'}
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1.5">
          <div className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Consortium Navigation
          </div>
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-600/30 to-blue-600/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition ${
                      isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                        item.badgeColor || 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info: USD / LKR Exchange Rate Display */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Benchmark USD/LKR:</span>
          <span className="font-bold text-cyan-400">Rs. 310.00</span>
        </div>
        <div className="mt-1 text-[10px] text-slate-500 flex items-center justify-between">
          <span>Profit Split Model:</span>
          <span className="text-amber-400 font-semibold">50% / 50%</span>
        </div>
      </div>
    </aside>
  );
};
