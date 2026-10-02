import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  Landmark,
  Plus,
  TrendingUp,
  Briefcase,
  ShieldCheck,
  X,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

const ENTRY_TYPES = [
  { value: 'CAPITAL_DRAW',       label: 'Capital Draw (Partner Withdrawal)' },
  { value: 'EQUITY_INJECTION',   label: 'Equity Injection (Capital Float)' },
  { value: 'DISBURSEMENT',       label: 'Disbursement' },
  { value: 'PROFIT_DISTRIBUTION', label: 'Profit Distribution' },
];

const PAYMENT_METHODS = ['Bank Wire/SLIPS', 'Corporate Cheque', 'Cash'];

const EMPTY_FORM = {
  partnerCompany: 'Anujaya Enterprises',
  entryType: 'CAPITAL_DRAW',
  amount: '',
  description: '',
  paymentMethod: 'Bank Wire/SLIPS',
  referenceDoc: '',
  notes: '',
};

const getEntryBadge = (type) => {
  switch (type) {
    case 'EQUITY_INJECTION':
      return { label: 'Equity Injection',    bg: 'bg-emerald-950 text-emerald-300 border-emerald-800' };
    case 'CAPITAL_DRAW':
      return { label: 'Capital Draw',        bg: 'bg-amber-950 text-amber-300 border-amber-800' };
    case 'DISBURSEMENT':
      return { label: 'Disbursement',        bg: 'bg-indigo-950 text-indigo-300 border-indigo-800' };
    case 'PROFIT_DISTRIBUTION':
    default:
      return { label: 'Profit Share',        bg: 'bg-cyan-950 text-cyan-300 border-cyan-800' };
  }
};

export const PartnerLedgerView = () => {
  const { t, user, isAdmin } = useAuth();
  const { addToast } = useToast();

  const [entries, setEntries]           = useState([]);
  const [stats, setStats]               = useState(null);
  const [loading, setLoading]           = useState(true);
  const [partnerFilter, setPartnerFilter] = useState('ALL');
  const [showModal, setShowModal]       = useState(false);
  const [editEntry, setEditEntry]       = useState(null);   // null = create, object = edit
  const [formData, setFormData]         = useState(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ─── Fetch ────────────────────────────────────────────────────────────────
  const fetchLedger = async () => {
    try {
      setLoading(true);
      const res = await api.getPartnerLedger({ partnerCompany: partnerFilter });
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

  useEffect(() => { fetchLedger(); }, [partnerFilter]);

  // ─── Open modal for CREATE ────────────────────────────────────────────────
  const openCreate = () => {
    setEditEntry(null);
    setFormData({
      ...EMPTY_FORM,
      partnerCompany: user?.role === 'Partner' ? 'Global Enterprises' : 'Anujaya Enterprises',
    });
    setShowModal(true);
  };

  // ─── Open modal for EDIT ──────────────────────────────────────────────────
  const openEdit = (entry) => {
    setEditEntry(entry);
    setFormData({
      partnerCompany: entry.partnerCompany,
      entryType:      entry.entryType,
      amount:         entry.amount,
      description:    entry.description,
      paymentMethod:  entry.paymentMethod,
      referenceDoc:   entry.referenceDoc || '',
      notes:          entry.notes || '',
    });
    setShowModal(true);
  };

  // ─── Submit (create or update) ────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let res;
      if (editEntry) {
        res = await api.updatePartnerEntry(editEntry._id, formData);
        if (res.success) {
          addToast('success', 'Ledger entry updated!');
        }
      } else {
        res = await api.createPartnerEntry(formData);
        if (res.success) {
          addToast('success', 'Partner capital entry recorded!');
        }
      }
      if (res.success) {
        setShowModal(false);
        fetchLedger();
      } else {
        addToast('error', res.message || 'Failed to save entry');
      }
    } catch (err) {
      addToast('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await api.deletePartnerEntry(deleteTarget._id);
      if (res.success) {
        addToast('success', 'Entry deleted');
        setDeleteTarget(null);
        fetchLedger();
      } else {
        addToast('error', res.message || 'Delete failed');
      }
    } catch (err) {
      addToast('error', err.message);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Banner ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl glass-card border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-black text-white tracking-tight">{t('partnerLedger')}</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
              Consortium Equity
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Anujaya Enterprises &amp; Global Enterprises · Shared Equity, Draws &amp; Profit Reconciliations
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('addPartnerEntry')}</span>
        </button>
      </div>

      {/* ── Partner Balance Cards ── */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Anujaya */}
          <div className="p-5 rounded-2xl glass-card border border-indigo-500/30 space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-900/50 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">Anujaya Enterprises</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                Consortium Partner
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
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
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">Profit Distributed:</span>
                <div className="text-sm font-bold text-cyan-400 mt-1">
                  LKR {Number(stats.anujaya.profitDistributed).toLocaleString()}
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

          {/* Global */}
          <div className="p-5 rounded-2xl glass-card border border-emerald-500/30 space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-900/50 pb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Global Enterprises</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                Consortium Partner
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
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
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">Profit Distributed:</span>
                <div className="text-sm font-bold text-cyan-400 mt-1">
                  LKR {Number(stats.global.profitDistributed).toLocaleString()}
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

      {/* ── Filter Tabs ── */}
      <div className="p-3 rounded-xl glass-card border border-slate-800 flex items-center gap-2 text-xs flex-wrap">
        {[
          { label: 'All Consortium Entries', val: 'ALL',                   cls: 'bg-cyan-600 text-white'    },
          { label: 'Anujaya Enterprises',    val: 'Anujaya Enterprises',   cls: 'bg-indigo-600 text-white'  },
          { label: 'Global Enterprises',     val: 'Global Enterprises',    cls: 'bg-emerald-600 text-white' },
        ].map(({ label, val, cls }) => (
          <button
            key={val}
            onClick={() => setPartnerFilter(val)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              partnerFilter === val ? cls : 'text-slate-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Ledger Table ── */}
      <div className="rounded-2xl glass-card border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800">
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Partner Entity</th>
                <th className="p-3.5">Entry Type</th>
                <th className="p-3.5 text-right">Amount (LKR)</th>
                <th className="p-3.5">Description &amp; Reference</th>
                <th className="p-3.5">Method</th>
                <th className="p-3.5 text-center">Approved By</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-500">
                    Loading entries…
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-500">
                    No partner capital records found.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const badge = getEntryBadge(entry.entryType);
                  const isCapitalDraw = entry.entryType === 'CAPITAL_DRAW';

                  return (
                    <tr key={entry._id} className="hover:bg-slate-900/50 transition">
                      <td className="p-3.5 text-slate-400 font-mono whitespace-nowrap">
                        {new Date(entry.date).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 font-bold text-white whitespace-nowrap">
                        {entry.partnerCompany === 'Anujaya Enterprises' ? (
                          <span className="text-indigo-300">{entry.partnerCompany}</span>
                        ) : (
                          <span className="text-emerald-300">{entry.partnerCompany}</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-bold text-slate-100 font-mono">
                        LKR {Number(entry.amount).toLocaleString()}
                      </td>
                      <td className="p-3.5 max-w-xs">
                        <div className="font-medium text-slate-200 truncate">{entry.description}</div>
                        {entry.referenceDoc && (
                          <div className="text-[10px] text-slate-500 font-mono">Ref: {entry.referenceDoc}</div>
                        )}
                        {entry.notes && (
                          <div className="text-[10px] text-slate-600 truncate">{entry.notes}</div>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-300 whitespace-nowrap">{entry.paymentMethod}</td>
                      <td className="p-3.5 text-center text-slate-400">{entry.approvedBy}</td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Edit – allowed for Capital Draws (and Admin for any) */}
                          {(isCapitalDraw || isAdmin) && (
                            <button
                              onClick={() => openEdit(entry)}
                              title="Edit Entry"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-900 text-slate-400 hover:text-indigo-300 transition"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {/* Delete – Admin only */}
                          {isAdmin && (
                            <button
                              onClick={() => setDeleteTarget(entry)}
                              title="Delete Entry"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CREATE / EDIT MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-dropdown rounded-2xl border border-slate-700 p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                {editEntry ? (
                  <><Pencil className="w-4 h-4 text-indigo-400" /> Edit Ledger Entry</>
                ) : (
                  <><Plus className="w-4 h-4 text-emerald-400" /> Log Partner Capital Entry</>
                )}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              {/* Partner Entity — read-only when editing */}
              <div>
                <label className="block text-slate-400 mb-1">Partner Entity *</label>
                <select
                  value={formData.partnerCompany}
                  onChange={(e) => setFormData({ ...formData, partnerCompany: e.target.value })}
                  className="w-full glass-input px-3.5 py-2 rounded-xl"
                  disabled={!!editEntry}
                  required
                >
                  <option value="Anujaya Enterprises" className="bg-slate-900">Anujaya Enterprises</option>
                  <option value="Global Enterprises"  className="bg-slate-900">Global Enterprises</option>
                </select>
              </div>

              {/* Entry Type */}
              <div>
                <label className="block text-slate-400 mb-1">Entry Type *</label>
                <select
                  value={formData.entryType}
                  onChange={(e) => setFormData({ ...formData, entryType: e.target.value })}
                  className="w-full glass-input px-3.5 py-2 rounded-xl"
                  required
                >
                  {ENTRY_TYPES.map(({ value, label }) => (
                    <option key={value} value={value} className="bg-slate-900">{label}</option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-slate-400 mb-1">Amount (LKR) *</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="w-full glass-input px-3.5 py-2 rounded-xl font-bold text-emerald-400"
                  min="0"
                  required
                />
              </div>

              {/* Description */}
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

              {/* Payment Method */}
              <div>
                <label className="block text-slate-400 mb-1">Payment Method</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full glass-input px-3.5 py-2 rounded-xl"
                >
                  {PAYMENT_METHODS.map(m => (
                    <option key={m} value={m} className="bg-slate-900">{m}</option>
                  ))}
                </select>
              </div>

              {/* Reference */}
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

              {/* Notes */}
              <div>
                <label className="block text-slate-400 mb-1">Notes</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional remarks…"
                  className="w-full glass-input px-3.5 py-2 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white shadow disabled:opacity-50 transition"
                >
                  {saving ? 'Saving…' : editEntry ? 'Update Entry' : 'Record Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm glass-dropdown rounded-2xl border border-rose-800/60 p-6 space-y-4 text-slate-100">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-rose-400 shrink-0" />
              <div>
                <h3 className="font-bold text-white text-sm">Delete Ledger Entry?</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  This will permanently remove the entry for{' '}
                  <strong>{deleteTarget.partnerCompany}</strong> —{' '}
                  <strong>LKR {Number(deleteTarget.amount).toLocaleString()}</strong>.
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 font-bold text-white shadow text-xs transition"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
