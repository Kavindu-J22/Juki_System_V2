import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  Receipt,
  Plus,
  DollarSign,
  Building,
  UserCheck,
  Landmark,
  Truck,
  CheckCircle2,
  Clock,
  X,
  Trash2,
  Calendar,
} from 'lucide-react';

export const ExpensesView = () => {
  const { t, isAdmin } = useAuth();
  const { addToast } = useToast();

  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [payingExpense, setPayingExpense] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Bank Wire/SLIPS');
  const [payRef, setPayRef] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    category: 'RENTS_OWED',
    amount: '',
    paidAmount: 0,
    dueDate: '',
    recipientOrEntity: '',
    paymentMethod: 'Bank Wire/SLIPS',
    referenceDoc: '',
    notes: '',
  });

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await api.getExpenses({
        category: categoryFilter,
        paymentStatus: statusFilter,
        search,
      });
      if (res.success) {
        setExpenses(res.expenses);
        setSummary(res.summary || {});
      }
    } catch {
      addToast('error', 'Error loading expenses and liabilities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [categoryFilter, statusFilter, search]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createExpense(formData);
      if (res.success) {
        addToast('success', 'Expense / Liability recorded!');
        setShowAddModal(false);
        fetchExpenses();
      } else {
        addToast('error', res.message);
      }
    } catch (err) {
      addToast('error', err.message);
    }
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!payingExpense) return;
    try {
      const res = await api.payExpense(payingExpense._id, {
        amountPaid: Number(payAmount),
        paymentMethod: payMethod,
        referenceDoc: payRef,
      });
      if (res.success) {
        addToast('success', 'Payment recorded on expense!');
        setPayingExpense(null);
        fetchExpenses();
      }
    } catch (err) {
      addToast('error', err.message);
    }
  };

  const handleDelete = async (id, title) => {
    if (window.confirm(`Delete expense "${title}"?`)) {
      try {
        const data = await api.deleteExpense(id);
        if (data.success) {
          addToast('success', 'Expense removed');
          fetchExpenses();
        }
      } catch (err) {
        addToast('error', err.message);
      }
    }
  };

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'RENTS_OWED':
        return { label: 'Rents Owed', bg: 'bg-amber-950 text-amber-300 border-amber-800', icon: Building };
      case 'SALARIES':
        return { label: 'Salaries', bg: 'bg-indigo-950 text-indigo-300 border-indigo-800', icon: UserCheck };
      case 'LIABILITIES_LOANS':
        return { label: 'Loans (නය)', bg: 'bg-rose-950 text-rose-300 border-rose-800', icon: Landmark };
      case 'OPERATING_EXPENSES':
      default:
        return { label: 'Operating Ops', bg: 'bg-cyan-950 text-cyan-300 border-cyan-800', icon: Truck };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl glass-card border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white tracking-tight">{t('expenses')}</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
              Liabilities Ledger
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Outsource Rents Owed, Staff Payroll, Bank Loan Servicing & Operating Costs
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setFormData({
                title: '',
                category: 'RENTS_OWED',
                amount: '',
                paidAmount: 0,
                dueDate: '',
                recipientOrEntity: '',
                paymentMethod: 'Bank Wire/SLIPS',
                referenceDoc: '',
                notes: '',
              });
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-500 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('addExpense')}</span>
          </button>
        )}
      </div>

      {/* 4 Category Summary Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl glass-card border border-amber-500/20 space-y-1">
          <div className="flex items-center justify-between text-xs text-amber-400 font-semibold uppercase">
            <span>{t('rentsOwed')}</span>
            <Building className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-white">
            LKR {Number(summary.totalRentsOwed || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400">Outsourced Machinery</p>
        </div>

        <div className="p-4 rounded-xl glass-card border border-indigo-500/20 space-y-1">
          <div className="flex items-center justify-between text-xs text-indigo-400 font-semibold uppercase">
            <span>{t('salaries')}</span>
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-white">
            LKR {Number(summary.totalSalaries || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400">Operations & Technicians</p>
        </div>

        <div className="p-4 rounded-xl glass-card border border-rose-500/20 space-y-1">
          <div className="flex items-center justify-between text-xs text-rose-400 font-semibold uppercase">
            <span>{t('liabilitiesLoans')}</span>
            <Landmark className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-white">
            LKR {Number(summary.totalLiabilitiesLoans || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400">Bank Borrowings & Installments</p>
        </div>

        <div className="p-4 rounded-xl glass-card border border-cyan-500/20 space-y-1">
          <div className="flex items-center justify-between text-xs text-cyan-400 font-semibold uppercase">
            <span>{t('operatingExpenses')}</span>
            <Truck className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-white">
            LKR {Number(summary.totalOperatingExpenses || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400">Port Clearing & Fuel</p>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="p-4 rounded-xl glass-card border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {['ALL', 'RENTS_OWED', 'SALARIES', 'LIABILITIES_LOANS', 'OPERATING_EXPENSES'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                categoryFilter === cat
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              {cat === 'ALL' ? 'All Categories' : cat.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Status Dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="glass-input px-3 py-1.5 rounded-lg text-xs"
        >
          <option value="ALL" className="bg-slate-900">All Statuses</option>
          <option value="PENDING" className="bg-slate-900">Pending</option>
          <option value="PARTIAL" className="bg-slate-900">Partial</option>
          <option value="PAID" className="bg-slate-900">Paid</option>
        </select>
      </div>

      {/* Expenses Table */}
      <div className="rounded-2xl glass-card border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800">
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Title / Obligation</th>
                <th className="p-3.5">Beneficiary / Entity</th>
                <th className="p-3.5 text-right">Amount (LKR)</th>
                <th className="p-3.5 text-right">Paid (LKR)</th>
                <th className="p-3.5 text-center">Due / Paid Date</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-500">
                    No expenses or liabilities found in this filter.
                  </td>
                </tr>
              ) : (
                expenses.map((e) => {
                  const badge = getCategoryBadge(e.category);
                  const Icon = badge.icon;
                  const isPaid = e.paymentStatus === 'PAID';

                  return (
                    <tr key={e._id} className="hover:bg-slate-900/50 transition">
                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.bg}`}>
                          <Icon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-white">
                        {e.title}
                        {e.referenceDoc && (
                          <span className="text-[10px] text-slate-500 font-mono ml-1.5">({e.referenceDoc})</span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-300">{e.recipientOrEntity}</td>
                      <td className="p-3.5 text-right font-bold text-slate-100">
                        {Number(e.amount).toLocaleString()}
                      </td>
                      <td className="p-3.5 text-right font-bold text-emerald-400">
                        {Number(e.paidAmount || 0).toLocaleString()}
                      </td>
                      <td className="p-3.5 text-center text-slate-400">
                        {e.dueDate ? new Date(e.dueDate).toLocaleDateString() : e.paymentDate ? new Date(e.paymentDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isPaid
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : e.paymentStatus === 'PARTIAL'
                              ? 'bg-sky-950 text-sky-300 border border-sky-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {e.paymentStatus}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {!isPaid && isAdmin && (
                            <button
                              onClick={() => {
                                setPayingExpense(e);
                                setPayAmount(e.amount - (e.paidAmount || 0));
                                setPayRef('');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px]"
                            >
                              Pay
                            </button>
                          )}

                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(e._id, e.title)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400"
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

      {/* ADD EXPENSE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg glass-dropdown rounded-2xl border border-slate-700 p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">Record Expense / Liability</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Expense Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full glass-input px-3.5 py-2 rounded-xl"
                  required
                >
                  <option value="RENTS_OWED" className="bg-slate-900">Third-Party Outsourced Rent</option>
                  <option value="SALARIES" className="bg-slate-900">Staff Salaries & Payroll</option>
                  <option value="LIABILITIES_LOANS" className="bg-slate-900">Liabilities / Loan Servicing (නය)</option>
                  <option value="OPERATING_EXPENSES" className="bg-slate-900">Operating & Logistics Costs</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Expense Title / Description *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Technician Payroll, Machine Rent, Bank Loan"
                  className="w-full glass-input px-3.5 py-2 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Total Amount (LKR) *</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full glass-input px-3.5 py-2 rounded-xl font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Advance Paid (LKR)</label>
                  <input
                    type="number"
                    value={formData.paidAmount}
                    onChange={(e) => setFormData({ ...formData, paidAmount: Number(e.target.value) })}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-emerald-400 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Beneficiary / Entity *</label>
                  <input
                    type="text"
                    value={formData.recipientOrEntity}
                    onChange={(e) => setFormData({ ...formData, recipientOrEntity: e.target.value })}
                    placeholder="Recipient or company name"
                    className="w-full glass-input px-3.5 py-2 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full glass-input px-3.5 py-2 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Reference Doc / Notes</label>
                <input
                  type="text"
                  value={formData.referenceDoc}
                  onChange={(e) => setFormData({ ...formData, referenceDoc: e.target.value })}
                  placeholder="Invoice #, receipt #, loan account #"
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
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold text-white shadow"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT ON EXPENSE MODAL */}
      {payingExpense && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-dropdown rounded-2xl border border-slate-700 p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">
                Record Payment for: {payingExpense.title}
              </h3>
              <button onClick={() => setPayingExpense(null)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Amount to Pay (LKR) *</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full glass-input px-3.5 py-2 rounded-xl font-bold text-emerald-400"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full glass-input px-3.5 py-2 rounded-xl"
                >
                  <option value="Bank Wire/SLIPS" className="bg-slate-900">Bank Wire / SLIPS</option>
                  <option value="Corporate Cheque" className="bg-slate-900">Corporate Cheque</option>
                  <option value="Cash" className="bg-slate-900">Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Bank Slip / Reference No</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="e.g. SLIP-CB-994"
                  className="w-full glass-input px-3.5 py-2 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPayingExpense(null)}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white shadow"
                >
                  Confirm Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
