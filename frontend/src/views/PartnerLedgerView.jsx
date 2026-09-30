import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  Landmark,
  Plus,
  DollarSign,
  TrendingUp,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  X,
  FileText,
} from 'lucide-react';

export const PartnerLedgerView = () => {
  const { t, user, isAdmin, isPartner } = useAuth();
  const { addToast } = useToast();

  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [partnerFilter, setPartnerFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState({
    partnerCompany: 'Anujaya Enterprises',
    entryType: 'CAPITAL_DRAW',
    amount: '',
    description: '',
    paymentMethod: 'Bank Wire/SLIPS',
    referenceDoc: '',
    notes: '',
  });

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const res = await api.getPartnerLedger({
        partnerCompany: partnerFilter,
      });
      if (res.success) {
        setEntries(res.entries);
        setStats(res.stats);
      }
    } catch {
      addToast('error', 'Error loading partner ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [partnerFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createPartnerEntry(formData);
      if (res.success) {
        addToast('success', 'Partner capital entry recorded!');
        setShowAddModal(false);
        fetchLedger();
      } else {
        addToast('error', res.message);
      }
    } catch (err) {
      addToast('error', err.message);
    }
  };

  const getEntryBadge = (type) => {
    switch (type) {
      case 'EQUITY_INJECTION':
        return { label: 'Equity Injection', bg: 'bg-emerald-950 text-emerald-300 border-emerald-800' };
      case 'CAPITAL_DRAW':
        return { label: 'Capital Draw', bg: 'bg-amber-950 text-amber-300 border-amber-800' };
      case 'DISBURSEMENT':
        return { label: 'Disbursement', bg: 'bg-indigo-950 text-indigo-300 border-indigo-800' };
      case 'PROFIT_DISTRIBUTION':
      default:
        return { label: 'Profit Share', bg: 'bg-cyan-950 text-cyan-300 border-cyan-800' };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl glass-card border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white tracking-tight">{t('partnerLedger')}</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
              Consortium Equity
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Anujaya Enterprises & Global Enterprises Shared Equity, Draws & Profit Reconciliations
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              partnerCompany: user?.role === 'Partner' ? 'Global Enterprises' : 'Anujaya Enterprises',
              entryType: 'CAPITAL_DRAW',
              amount: '',
              description: '',
              paymentMethod: 'Bank Wire/SLIPS',
              referenceDoc: '',
              notes: '',
            });
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('addPartnerEntry')}</span>
        </button>
      </div>

      {/* Consortium Partner Balances (Anujaya Enterprises vs Global Enterprises) */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Anujaya Card */}
          <div className="p-5 rounded-2xl glass-card border border-indigo-500/30 space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-900/50 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">Anujaya Enterprises</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                50% Partner
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">Equity Injected:</span>
                <div className="text-sm font-bold text-emerald-400 mt-1">
                  LKR {Number(stats.anujaya.equityInjected).toLocaleString()}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">Capital Draws:</span>
                <div className="text-sm font-bold text-amber-400 mt-1">
                  LKR {Number(stats.anujaya.capitalDraws).toLocaleString()}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/60">
                <span className="text-indigo-300 font-semibold">Net Equity:</span>
                <div className="text-sm font-black text-indigo-100 mt-1">
                  LKR {Number(stats.anujaya.netBalance).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Global Enterprises Card */}
          <div className="p-5 rounded-2xl glass-card border border-emerald-500/30 space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-900/50 pb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Global Enterprises</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                50% Partner
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">Equity Injected:</span>
                <div className="text-sm font-bold text-emerald-400 mt-1">
                  LKR {Number(stats.global.equityInjected).toLocaleString()}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">Capital Draws:</span>
                <div className="text-sm font-bold text-amber-400 mt-1">
                  LKR {Number(stats.global.capitalDraws).toLocaleString()}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60">
                <span className="text-emerald-300 font-semibold">Net Equity:</span>
                <div className="text-sm font-black text-emerald-100 mt-1">
                  LKR {Number(stats.global.netBalance).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="p-3 rounded-xl glass-card border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setPartnerFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              partnerFilter === 'ALL' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Consortium Entries
          </button>
          <button
            onClick={() => setPartnerFilter('Anujaya Enterprises')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              partnerFilter === 'Anujaya Enterprises' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Anujaya Enterprises
          </button>
          <button
            onClick={() => setPartnerFilter('Global Enterprises')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              partnerFilter === 'Global Enterprises' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Global Enterprises
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="rounded-2xl glass-card border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800">
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Partner Entity</th>
                <th className="p-3.5">Entry Type</th>
                <th className="p-3.5 text-right">Amount (LKR)</th>
                <th className="p-3.5">Description & Reference</th>
                <th className="p-3.5">Payment Method</th>
                <th className="p-3.5 text-center">Approved By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500">
                    No partner capital records found.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const badge = getEntryBadge(entry.entryType);

                  return (
                    <tr key={entry._id} className="hover:bg-slate-900/50 transition">
                      <td className="p-3.5 text-slate-400 font-mono">
                        {new Date(entry.date).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 font-bold text-white">
                        {entry.partnerCompany}
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-bold text-slate-100 font-mono">
                        LKR {Number(entry.amount).toLocaleString()}
                      </td>
                      <td className="p-3.5">
                        <div className="font-medium text-slate-200">{entry.description}</div>
                        {entry.referenceDoc && (
                          <div className="text-[10px] text-slate-500 font-mono">Ref: {entry.referenceDoc}</div>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-300">{entry.paymentMethod}</td>
                      <td className="p-3.5 text-center text-slate-400">{entry.approvedBy}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD CAPITAL ENTRY MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-dropdown rounded-2xl border border-slate-700 p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">Log Partner Capital Entry</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Partner Entity *</label>
                <select
                  value={formData.partnerCompany}
                  onChange={(e) => setFormData({ ...formData, partnerCompany: e.target.value })}
                  className="w-full glass-input px-3.5 py-2 rounded-xl"
                  required
                >
                  <option value="Anujaya Enterprises" className="bg-slate-900">Anujaya Enterprises</option>
                  <option value="Global Enterprises" className="bg-slate-900">Global Enterprises</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Entry Type *</label>
                <select
                  value={formData.entryType}
                  onChange={(e) => setFormData({ ...formData, entryType: e.target.value })}
                  className="w-full glass-input px-3.5 py-2 rounded-xl"
                  required
                >
                  <option value="CAPITAL_DRAW" className="bg-slate-900">Capital Draw (Partner Withdrawal)</option>
                  <option value="EQUITY_INJECTION" className="bg-slate-900">Equity Injection (Capital Float)</option>
                  <option value="DISBURSEMENT" className="bg-slate-900">Disbursement</option>
                  <option value="PROFIT_DISTRIBUTION" className="bg-slate-900">Profit Distribution</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Amount (LKR) *</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="w-full glass-input px-3.5 py-2 rounded-xl font-bold text-emerald-400"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description / Purpose *</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Quarterly dividend draw, Machinery capital float"
                  className="w-full glass-input px-3.5 py-2 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Reference Documentation</label>
                <input
                  type="text"
                  value={formData.referenceDoc}
                  onChange={(e) => setFormData({ ...formData, referenceDoc: e.target.value })}
                  placeholder="Doc # / Bank Ref #"
                  className="w-full glass-input px-3.5 py-2 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white shadow"
                >
                  Record Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
