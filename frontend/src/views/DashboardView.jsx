import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { MetricCard } from '../components/MetricCard';
import {
  DollarSign,
  Truck,
  Package,
  Anchor,
  TrendingUp,
  Percent,
  Cpu,
  RefreshCw,
  Warehouse,
  CreditCard,
  AlertTriangle,
  Mail,
  Printer,
  ChevronRight,
  ShieldCheck,
  Briefcase,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

export const DashboardView = ({ onNavigate, onPrint }) => {
  const { t, user, isAdmin, isPartner } = useAuth();
  const { addToast } = useToast();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailSending, setEmailSending] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardStats();
      if (res.success) {
        setStats(res);
      }
    } catch (err) {
      addToast('error', 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSendEmailAlerts = async () => {
    try {
      setEmailSending(true);
      const res = await api.triggerAlertCheck(true);
      if (res.success) {
        addToast('success', `Alert emails dispatched to ${res.count} active rental clients!`);
      } else {
        addToast('error', 'Failed to dispatch email alerts');
      }
    } catch (err) {
      addToast('error', err.message);
    } finally {
      setEmailSending(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-400">Loading Consortium Metrics...</span>
        </div>
      </div>
    );
  }

  const m = stats?.metrics || {};
  const alerts = stats?.alerts || [];
  const alertCounts = stats?.alertCounts || {};

  return (
    <div className="space-y-6 pb-12">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl glass-card border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white tracking-tight">
              {t('dashboard')}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
              Live Real-Time
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Welcome, <span className="font-semibold text-slate-200">{user?.name}</span> ({user?.role} - {user?.partnerCompany})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchStats}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-700 transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => onNavigate('machinery')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 transition"
          >
            <Truck className="w-4 h-4" />
            <span>Dispatch Machine</span>
          </button>

          <button
            onClick={() => onNavigate('reports')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-700 transition"
          >
            <ArrowUpRight className="w-4 h-4 text-cyan-400" />
            <span>Consortium Reports</span>
          </button>
        </div>
      </div>

      {/* URGENT RENTAL PAYMENT ALERTS BANNER (7-Day, 3-Day, Due Today, Overdue) */}
      {alertCounts.total > 0 && (
        <div className="p-5 rounded-2xl glass-card border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-slate-900 to-rose-950/40 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-200">
                  {t('rentalAlerts')} ({alertCounts.total} Active Notices)
                </h3>
                <p className="text-xs text-slate-400">
                  Automated deadline tracking for monthly machine rental collections
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSendEmailAlerts}
                disabled={emailSending}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30 transition disabled:opacity-50"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{emailSending ? 'Sending Emails...' : t('sendEmailAlerts')}</span>
              </button>
            </div>
          </div>

          {/* Quick Alert Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-center">
              <div className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">{t('overdue')}</div>
              <div className="text-2xl font-black text-rose-300 mt-0.5">{alertCounts.overdue || 0}</div>
            </div>
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-center">
              <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">{t('dueToday')}</div>
              <div className="text-2xl font-black text-amber-300 mt-0.5">{alertCounts.dueToday || 0}</div>
            </div>
            <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-800/60 text-center">
              <div className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider">{t('dueIn3Days')}</div>
              <div className="text-2xl font-black text-sky-300 mt-0.5">{alertCounts.dueIn3Days || 0}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/60 text-center">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t('dueIn7Days')}</div>
              <div className="text-2xl font-black text-slate-200 mt-0.5">{alertCounts.dueIn7Days || 0}</div>
            </div>
          </div>

          {/* Alerts List Preview */}
          <div className="divide-y divide-slate-800/80">
            {alerts.slice(0, 4).map((alert, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between text-xs gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      alert.alertType === 'OVERDUE'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : alert.alertType === 'DUE_TODAY'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-sky-950 text-sky-300 border border-sky-800'
                    }`}
                  >
                    {alert.alertLabel}
                  </span>
                  <span className="font-semibold text-white">{alert.customerName}</span>
                  <span className="text-slate-400 hidden sm:inline">({alert.machineryModel})</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-bold text-emerald-400">
                    LKR {Number(alert.monthlyRent || 0).toLocaleString()}
                  </span>
                  <button
                    onClick={() => onNavigate('salesLedger')}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    Collect Rent →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 1. EXECUTIVE DASHBOARD WIDGETS (ROW 1: CORE FINANCIALS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={t('grossRevenue')}
          value={m.grossRevenue || 0}
          icon={DollarSign}
          color="cyan"
          subtitle={`Sales: LKR ${(m.buyRevenue || 0).toLocaleString()} • Rent: LKR ${(m.rentRevenue || 0).toLocaleString()}`}
        />

        <MetricCard
          title={t('completedDispatches')}
          value={m.completedDispatches || 0}
          isCurrency={false}
          icon={Truck}
          color="indigo"
          subtitle="Total Sales & Rental Contracts"
        />

        <MetricCard
          title={t('totalCostOfGoods')}
          value={m.totalCostOfGoods || 0}
          icon={Package}
          color="rose"
          subtitle="Factory FOB + Landed Unit Costs"
        />

        <MetricCard
          title={t('portCustomsDuty')}
          value={m.portAndCustomsDuty || 0}
          icon={Anchor}
          color="amber"
          subtitle={`In Port/Warehouse: LKR ${(m.customsDutyInStock || 0).toLocaleString()}`}
        />
      </div>

      {/* 2. EXECUTIVE DASHBOARD WIDGETS (ROW 2: PROFITABILITY & FLEET METRICS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={t('netProfit')}
          value={m.consortiumNetProfit || 0}
          icon={TrendingUp}
          color="emerald"
          subtitle="After COGS, Third-Party Rents & Expenses"
        />

        <MetricCard
          title={t('netMargin')}
          value={`${m.netMargin || 0}%`}
          isCurrency={false}
          icon={Percent}
          color="violet"
          subtitle="Consortium Profit Realization Rate"
        />

        <MetricCard
          title={t('dispatchedFleet')}
          value={`${m.dispatchedFleetSets || 0} / ${m.totalFleetSets || 0} Sets`}
          isCurrency={false}
          icon={Cpu}
          color="cyan"
          subtitle={`In Warehouse: ${m.inWarehouseSets || 0} Available Sets`}
        />

        <MetricCard
          title={t('fleetTurnover')}
          value={`${m.fleetTurnover || 0}%`}
          isCurrency={false}
          icon={RefreshCw}
          color="amber"
          subtitle="Active Fleet Utilization Rate"
        />
      </div>

      {/* 3. EXECUTIVE DASHBOARD WIDGETS (ROW 3: VALUATION & RECEIVABLES) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title={t('stockValuation')}
          value={m.stockValuationWarehouse || 0}
          icon={Warehouse}
          color="indigo"
          subtitle="Current Machinery Stock at Landed Cost"
        />

        <MetricCard
          title={t('totalReceivables')}
          value={m.totalReceivables || 0}
          icon={CreditCard}
          color="rose"
          subtitle="Buy Credit + Active Rental Balances"
        />

        <MetricCard
          title={t('outstandingCredit')}
          value={m.outstandingCredit || 0}
          icon={AlertTriangle}
          color="amber"
          subtitle="30-Day Credit & Partial Settlements"
        />
      </div>

      {/* Consortium Equity & Profit Split Breakdown (Anujaya vs Global) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Consortium Profit Split Visualization */}
        <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Consortium Profit Split (50 / 50)</span>
            </h3>
            <span className="text-[11px] text-slate-500">Consolidated</span>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-800/50 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-indigo-300">Anujaya Enterprises</span>
                <span className="font-semibold text-slate-400">50% Share</span>
              </div>
              <div className="text-xl font-black text-indigo-100">
                LKR {Math.round((m.consortiumNetProfit || 0) * 0.5).toLocaleString()}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/50 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-emerald-300">Global Enterprises</span>
                <span className="font-semibold text-slate-400">50% Share</span>
              </div>
              <div className="text-xl font-black text-emerald-100">
                LKR {Math.round((m.consortiumNetProfit || 0) * 0.5).toLocaleString()}
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('partnerLedger')}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-700 flex items-center justify-center gap-1.5 transition"
          >
            <span>Open Partner Capital Ledger</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Recent Consortium Dispatches Table */}
        <div className="lg:col-span-2 p-5 rounded-2xl glass-card border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Truck className="w-4 h-4 text-cyan-400" />
              <span>{t('recentActivity')}</span>
            </h3>
            <button
              onClick={() => onNavigate('salesLedger')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              View All Ledger →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800 pb-2">
                  <th className="pb-2">Invoice / AGR</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Customer</th>
                  <th className="pb-2">Machine Model</th>
                  <th className="pb-2 text-right">Amount (LKR)</th>
                  <th className="pb-2 text-center">Status</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {(stats?.recentDispatches || []).map((tx) => (
                  <tr key={tx._id} className="hover:bg-slate-900/40 transition">
                    <td className="py-2.5 font-mono font-bold text-white">{tx.invoiceNumber}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          tx.type === 'BUY'
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-2.5 font-medium">{tx.customer}</td>
                    <td className="py-2.5 text-slate-400">{tx.model}</td>
                    <td className="py-2.5 text-right font-bold text-slate-200">
                      {Number(tx.totalAmount || 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                        {tx.status || tx.deliveryStatus}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => onPrint(tx, tx.type === 'BUY' ? 'INVOICE' : 'AGREEMENT')}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-400"
                        title="Print Document"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
