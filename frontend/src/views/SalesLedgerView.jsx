import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  Search, ShoppingCart, Calendar, Printer, Truck,
  RotateCcw, DollarSign, AlertTriangle, X, Eye, Edit2,
  BadgeCheck, ChevronDown, ChevronUp, CreditCard,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString();
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/**
 * Build month-by-month schedule for a rent transaction.
 * Tracks per-month paid amounts, remaining balances, and partial payment statuses.
 * Supports advance payments split across months, explicit monthCovered, and legacy sequential allocation.
 */
const buildRentTimeline = (tx) => {
  const rd = tx.rentDetails;
  if (!rd) return [];

  const duration = rd.durationMonths || 1;
  const monthly = (rd.rentPricePerMonth || 0) * (tx.quantity || 1);
  const start = new Date(tx.dispatchDate || tx.createdAt);

  const rentPayments = (tx.payments || []).filter(
    (p) => p.paymentType === 'MONTHLY_RENT'
  );

  const months = [];
  for (let i = 0; i < duration; i++) {
    const monthNum = i + 1;
    const dueDate = new Date(start);
    dueDate.setMonth(dueDate.getMonth() + i);
    months.push({
      month: monthNum,
      dueDate,
      amount: monthly,
      paidAmount: 0,
      payments: [],
    });
  }

  // 1. Allocate payments with explicit monthCovered
  const unassigned = [];
  for (const p of rentPayments) {
    const mNum = parseInt(p.monthCovered, 10);
    if (!isNaN(mNum) && mNum >= 1 && mNum <= duration) {
      const target = months[mNum - 1];
      target.paidAmount += Number(p.amount || 0);
      target.payments.push(p);
    } else {
      unassigned.push(p);
    }
  }

  // 2. Allocate legacy / unassigned payments sequentially across incomplete months
  for (const p of unassigned) {
    let unallocated = Number(p.amount || 0);
    for (const m of months) {
      if (unallocated <= 0) break;
      const needed = Math.max(0, m.amount - m.paidAmount);
      if (needed > 0) {
        const allocated = Math.min(unallocated, needed);
        m.paidAmount += allocated;
        m.payments.push({ ...p, allocatedAmount: allocated });
        unallocated -= allocated;
      }
    }
  }

  // 3. Finalize each month's status and remaining balance
  for (const m of months) {
    m.remainingAmount = Math.max(0, m.amount - m.paidAmount);
    m.paid = m.paidAmount >= m.amount && m.amount > 0;
    m.isPartial = m.paidAmount > 0 && m.paidAmount < m.amount;
    m.isUnpaid = m.paidAmount === 0;

    const lastP = m.payments[m.payments.length - 1];
    m.paidDate = lastP?.date || null;
    m.method = lastP?.paymentMethod || '';
    m.ref = lastP?.reference || '';
  }

  return months;
};

export const SalesLedgerView = ({ onPrint, initialSearch = '', onClearInitialSearch }) => {
  const { t } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState(
    initialSearch && initialSearch.startsWith('INV') ? 'BUY' : 'RENT'
  );
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch || '');

  // Modals
  const [inspectingTx, setInspectingTx] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);   // BUY only
  const [showPayMonthModal, setShowPayMonthModal] = useState(false);   // RENT: pay next month
  const [payingMonthNum, setPayingMonthNum] = useState(null);          // RENT: per-month pay
  const [payingMonthRemaining, setPayingMonthRemaining] = useState(0); // RENT: remaining balance for targeted month
  const [payingMonthTarget, setPayingMonthTarget] = useState(0);       // RENT: full monthly rent target
  const [payingMonthIsPartial, setPayingMonthIsPartial] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);

  // Payment Form
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentType: 'MONTHLY_RENT',
    paymentMethod: 'Bank Wire/SLIPS',
    reference: '',
    notes: '',
    monthCovered: '',
  });

  // Return Form
  const [returnData, setReturnData] = useState({
    returnDate: new Date().toISOString().split('T')[0],
    returnNotes: 'Machine returned in good operational condition with accessories.',
  });

  // Edit Form
  const [editForm, setEditForm] = useState({});

  // Mark Paid / Pay Month Form
  const [markPaidForm, setMarkPaidForm] = useState({ paymentMethod: 'Bank Wire/SLIPS', reference: '', amount: 0 });

  // Inspector payment section toggle
  const [showInspectorPayments, setShowInspectorPayments] = useState(true);

  // ── Data ────────────────────────────────────────────────────────────────
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await api.getTransactions({ type: activeTab, search });
      if (res.success) setTransactions(res.transactions);
    } catch (err) {
      addToast('error', 'Error loading ledger records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, [activeTab, search]);

  useEffect(() => {
    if (initialSearch && onClearInitialSearch) onClearInitialSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────────────
  const refreshInspector = (updatedTx) => {
    if (inspectingTx && updatedTx && inspectingTx._id === updatedTx._id) {
      setInspectingTx(updatedTx);
    }
  };

  const paymentTermsOptions = [
    { value: 'Bank Wire/SLIPS', label: 'Bank Wire / SLIPS' },
    { value: 'Corporate Cheque', label: 'Corporate Cheque' },
    { value: 'COD', label: 'COD (Cash on Delivery)' },
    { value: 'Letter of Credit (LC)', label: 'Letter of Credit (LC)' },
    { value: '30-Day Credit', label: '30-Day Corporate Credit' },
  ];

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleUpdateDelivery = async (txId, newStatus) => {
    try {
      const res = await api.updateDeliveryStatus(txId, newStatus);
      if (res.success) { addToast('success', `Delivery → ${newStatus}`); fetchTransactions(); }
    } catch (err) { addToast('error', err.message); }
  };

  // Generic record payment (free amount, any type)
  const handleOpenPayment = (tx) => {
    setSelectedTx(tx);
    let defaultMonth = '';
    let defaultAmount = 0;
    if (tx.transactionType === 'RENT') {
      const timeline = buildRentTimeline(tx);
      const nextIncomplete = timeline.find((m) => !m.paid) || timeline[0];
      defaultMonth = nextIncomplete ? String(nextIncomplete.month) : '1';
      defaultAmount = nextIncomplete ? nextIncomplete.remainingAmount : ((tx.rentDetails?.rentPricePerMonth || 0) * (tx.quantity || 1));
    } else {
      defaultAmount = tx.buyDetails?.outstandingAmount || 0;
    }

    setPaymentData({
      amount: defaultAmount,
      paymentType: tx.transactionType === 'RENT' ? 'MONTHLY_RENT' : 'SALES_SETTLEMENT',
      paymentMethod: 'Bank Wire/SLIPS',
      reference: '',
      notes: '',
      monthCovered: defaultMonth,
    });
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    try {
      const res = await api.recordPayment(selectedTx._id, paymentData);
      if (res.success) {
        addToast('success', 'Payment recorded!');
        setShowPaymentModal(false);
        fetchTransactions();
        refreshInspector(res.transaction);
      } else { addToast('error', res.message); }
    } catch (err) { addToast('error', err.message); }
  };

  // Return machine
  const handleOpenReturn = (tx) => {
    setSelectedTx(tx);
    setReturnData({
      returnDate: new Date().toISOString().split('T')[0],
      returnNotes: 'Apparel contract completed. All units returned with safety attachments.',
    });
    setShowReturnModal(true);
  };

  const handleProcessReturn = async (e) => {
    e.preventDefault();
    try {
      const res = await api.processReturn(selectedTx._id, returnData);
      if (res.success) {
        addToast('success', res.message);
        setShowReturnModal(false);
        fetchTransactions();
        if (onPrint) onPrint(res.transaction, 'RETURN_NOTE');
      }
    } catch (err) { addToast('error', err.message); }
  };

  // Edit transaction
  const handleOpenEdit = (tx) => {
    setSelectedTx(tx);
    if (tx.transactionType === 'BUY') {
      setEditForm({
        unitPrice: tx.buyDetails?.unitPrice || 0,
        paidAmount: tx.buyDetails?.paidAmount || 0,
        paymentTerms: tx.buyDetails?.paymentTerms || 'Bank Wire/SLIPS',
        paymentReference: tx.buyDetails?.paymentReference || '',
        deliveryCharges: tx.deliveryCharges || 0,
      });
    } else {
      setEditForm({
        rentPricePerMonth: tx.rentDetails?.rentPricePerMonth || 0,
        durationMonths: tx.rentDetails?.durationMonths || 1,
        keyMoneyAmount: tx.rentDetails?.keyMoneyAmount || 0,
        paymentTerms: tx.rentDetails?.paymentTerms || 'Bank Wire/SLIPS',
        paymentReference: tx.rentDetails?.paymentReference || '',
        nextPaymentDueDate: tx.rentDetails?.nextPaymentDueDate
          ? new Date(tx.rentDetails.nextPaymentDueDate).toISOString().split('T')[0]
          : '',
        deliveryCharges: tx.deliveryCharges || 0,
      });
    }
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      const payload = { deliveryCharges: editForm.deliveryCharges };
      if (selectedTx.transactionType === 'BUY') {
        payload.buyDetails = {
          unitPrice: editForm.unitPrice,
          paidAmount: editForm.paidAmount,
          paymentTerms: editForm.paymentTerms,
          paymentReference: editForm.paymentReference,
        };
      } else {
        payload.rentDetails = {
          rentPricePerMonth: editForm.rentPricePerMonth,
          durationMonths: editForm.durationMonths,
          keyMoneyAmount: editForm.keyMoneyAmount,
          paymentTerms: editForm.paymentTerms,
          paymentReference: editForm.paymentReference,
          nextPaymentDueDate: editForm.nextPaymentDueDate || null,
        };
      }
      const res = await api.updateTransaction(selectedTx._id, payload);
      if (res.success) {
        addToast('success', 'Transaction updated!');
        setShowEditModal(false);
        fetchTransactions();
        refreshInspector(res.transaction);
      } else { addToast('error', res.message); }
    } catch (err) { addToast('error', err.message); }
  };

  // BUY — Mark as Fully Paid
  const handleOpenMarkPaid = (tx) => {
    setSelectedTx(tx);
    setMarkPaidForm({ paymentMethod: 'Bank Wire/SLIPS', reference: '' });
    setShowMarkPaidModal(true);
  };

  const handleConfirmMarkPaid = async (e) => {
    e.preventDefault();
    try {
      const res = await api.markTransactionAsPaid(
        selectedTx._id, markPaidForm.paymentMethod, markPaidForm.reference
      );
      if (res.success) {
        addToast('success', 'Transaction marked as fully paid!');
        setShowMarkPaidModal(false);
        fetchTransactions();
        refreshInspector(res.transaction);
      } else { addToast('error', res.message || 'Failed to mark as paid'); }
    } catch (err) { addToast('error', err.message); }
  };

  // RENT — Pay Next Month's Rent (table button)
  const handleOpenPayMonth = (tx, specificMonth = null) => {
    setSelectedTx(tx);
    const timeline = buildRentTimeline(tx);
    const targetMonth = specificMonth || timeline.find((m) => !m.paid);
    if (!targetMonth) {
      addToast('info', 'All months in this rental agreement are fully paid!');
      return;
    }
    setPayingMonthNum(targetMonth.month);
    setPayingMonthRemaining(targetMonth.remainingAmount);
    setPayingMonthTarget(targetMonth.amount);
    setPayingMonthIsPartial(targetMonth.isPartial);
    setMarkPaidForm({
      paymentMethod: 'Bank Wire/SLIPS',
      reference: '',
      amount: targetMonth.remainingAmount,
    });
    setShowPayMonthModal(true);
  };

  // RENT — Pay a specific month from the timeline (inspector)
  const handlePaySpecificMonth = (tx, monthNum) => {
    const timeline = buildRentTimeline(tx);
    const targetMonth = timeline.find((m) => m.month === monthNum);
    handleOpenPayMonth(tx, targetMonth);
  };

  const handleConfirmPayMonth = async (e) => {
    e.preventDefault();
    if (!payingMonthNum) {
      addToast('error', 'No unpaid month found');
      return;
    }
    const payAmt = Number(markPaidForm.amount) || payingMonthRemaining;
    try {
      const res = await api.payMonthRent(selectedTx._id, {
        monthNumber: payingMonthNum,
        amount: payAmt,
        paymentMethod: markPaidForm.paymentMethod,
        reference: markPaidForm.reference,
      });
      if (res.success) {
        addToast('success', res.message);
        setShowPayMonthModal(false);
        fetchTransactions();
        refreshInspector(res.transaction);
      } else { addToast('error', res.message || 'Failed to record payment'); }
    } catch (err) { addToast('error', err.message); }
  };

  // Return rule preview
  const calcReturnRulePreview = () => {
    if (!selectedTx || selectedTx.transactionType !== 'RENT') return null;
    const dispatchDate = new Date(selectedTx.dispatchDate || selectedTx.createdAt);
    const retDate = new Date(returnData.returnDate);
    let monthsElapsed = (retDate.getFullYear() - dispatchDate.getFullYear()) * 12 +
      (retDate.getMonth() - dispatchDate.getMonth());
    const past5th = retDate.getDate() > 5;
    if (past5th) monthsElapsed += 1;
    const actualBilled = Math.max(1, monthsElapsed);
    const agreedMonths = selectedTx.rentDetails?.durationMonths || 1;
    const waived = Math.max(0, agreedMonths - actualBilled);
    return { past5th, actualBilled, waived };
  };

  const returnPreview = showReturnModal ? calcReturnRulePreview() : null;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl glass-card border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white tracking-tight">{t('salesLedger')}</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
              {transactions.length} Records
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Commercial Sales &amp; Machinery Rental Agreement Lifecycle Management
          </p>
        </div>

        <div className="flex items-center p-1 bg-slate-900 rounded-xl border border-slate-800">
          {[
            { tab: 'RENT', icon: Calendar, label: 'Rental Agreements', cls: 'from-amber-600 to-emerald-600' },
            { tab: 'BUY',  icon: ShoppingCart, label: 'Sales Ledger (Buy)', cls: 'from-cyan-600 to-blue-600' },
          ].map(({ tab, icon: Icon, label, cls }) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === tab ? `bg-gradient-to-r ${cls} text-white shadow-lg` : 'text-slate-400 hover:text-slate-200'
              }`}>
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by Agreement #, Invoice #, Customer, Serial #..."
          className="w-full glass-input pl-10 pr-3.5 py-2 rounded-xl text-xs" />
      </div>

      {/* LEDGER TABLE */}
      <div className="rounded-2xl glass-card border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800">
                <th className="p-3.5">Document #</th>
                <th className="p-3.5">Customer &amp; Region</th>
                <th className="p-3.5">Machinery &amp; Serials</th>
                <th className="p-3.5 text-center">Delivery</th>
                {activeTab === 'RENT' ? (
                  <>
                    <th className="p-3.5 text-right">Rent /Mo</th>
                    <th className="p-3.5 text-right">Total Payable</th>
                    <th className="p-3.5 text-right">Total Paid</th>
                    <th className="p-3.5 text-center">Next Due</th>
                    <th className="p-3.5 text-center">Return</th>
                  </>
                ) : (
                  <>
                    <th className="p-3.5 text-right">Unit Price</th>
                    <th className="p-3.5 text-right">Total</th>
                    <th className="p-3.5 text-right">Paid</th>
                    <th className="p-3.5 text-right">Outstanding</th>
                    <th className="p-3.5 text-center">Settlement</th>
                  </>
                )}
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr><td colSpan="11" className="p-8 text-center text-slate-500">Loading...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan="11" className="p-8 text-center text-slate-500">No transactions found.</td></tr>
              ) : (
                transactions.map((tx) => {
                  const isRent = tx.transactionType === 'RENT';
                  const cust = tx.customerSnapshot || tx.customer || {};
                  const mach = tx.machinerySnapshot || tx.machinery || {};

                  // BUY: show mark-as-paid only when outstanding > 0
                  const showBuyMarkPaid = !isRent && (tx.buyDetails?.outstandingAmount || 0) > 0;

                  // RENT: show "pay this month" only when an incomplete month exists and not fully returned
                  const timeline = isRent ? buildRentTimeline(tx) : [];
                  const nextIncompleteMonth = isRent ? timeline.find((m) => !m.paid) : null;
                  const showRentPayMonth = isRent
                    && !!nextIncompleteMonth
                    && tx.rentDetails?.returnStatus !== 'Returned';

                  return (
                    <tr key={tx._id} className="hover:bg-slate-900/50 transition">
                      <td className="p-3.5 font-mono font-bold text-cyan-400">
                        {tx.invoiceNumber}
                        <div className="text-[10px] text-slate-500 font-normal">
                          {fmtDate(tx.dispatchDate || tx.createdAt)}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-white">{cust.name}</div>
                        <div className="text-[11px] text-slate-400">{cust.region || cust.phone}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-200">{mach.brand} {mach.model} ({tx.quantity} Sets)</div>
                        {tx.serialNumbers?.length > 0 && (
                          <div className="text-[10px] font-mono text-cyan-400/90 truncate max-w-xs">
                            S/N: {tx.serialNumbers.join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <select value={tx.deliveryStatus}
                          onChange={(e) => handleUpdateDelivery(tx._id, e.target.value)}
                          className={`px-2 py-1 rounded-md text-[10px] font-bold border transition ${
                            tx.deliveryStatus === 'Hand Overed'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : tx.deliveryStatus === 'Ongoing'
                              ? 'bg-sky-950 text-sky-300 border-sky-800'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}>
                          <option value="Pending" className="bg-slate-900">Pending</option>
                          <option value="Ongoing" className="bg-slate-900">Ongoing</option>
                          <option value="Hand Overed" className="bg-slate-900">Hand Overed</option>
                        </select>
                      </td>

                      {isRent ? (
                        <>
                          <td className="p-3.5 text-right font-semibold text-cyan-300">
                            LKR {fmt(tx.rentDetails?.rentPricePerMonth)}
                          </td>
                          <td className="p-3.5 text-right font-bold text-slate-200">
                            LKR {fmt(tx.rentDetails?.totalRentalPayable)}
                          </td>
                          <td className="p-3.5 text-right font-bold text-emerald-400">
                            LKR {fmt(tx.rentDetails?.totalRentalPaid)}
                          </td>
                          <td className="p-3.5 text-center">
                            {tx.rentDetails?.nextPaymentDueDate
                              ? <span className="font-mono text-[11px] text-amber-300">
                                  {fmtDate(tx.rentDetails.nextPaymentDueDate)}
                                </span>
                              : <span className="text-slate-500">—</span>}
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              tx.rentDetails?.returnStatus === 'Returned'
                                ? 'bg-slate-800 text-slate-300'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            }`}>{tx.rentDetails?.returnStatus || 'In Use'}</span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-3.5 text-right font-semibold text-slate-300">
                            LKR {fmt(tx.buyDetails?.unitPrice)}
                          </td>
                          <td className="p-3.5 text-right font-bold text-slate-200">
                            LKR {fmt(tx.buyDetails?.totalAmount)}
                          </td>
                          <td className="p-3.5 text-right font-bold text-emerald-400">
                            LKR {fmt(tx.buyDetails?.paidAmount)}
                          </td>
                          <td className="p-3.5 text-right font-bold text-rose-400">
                            LKR {fmt(tx.buyDetails?.outstandingAmount)}
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              tx.buyDetails?.settlementStatus === 'Fully Paid'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : tx.buyDetails?.settlementStatus === 'Partial Payment'
                                ? 'bg-sky-950 text-sky-300 border border-sky-800'
                                : 'bg-rose-950 text-rose-300 border border-rose-800'
                            }`}>{tx.buyDetails?.settlementStatus || 'Credit / Pending'}</span>
                          </td>
                        </>
                      )}

                      {/* ── ACTIONS ── */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Print primary doc */}
                          <button onClick={() => onPrint(tx, isRent ? 'AGREEMENT' : 'INVOICE')}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 transition"
                            title={isRent ? 'Print Agreement' : 'Print Invoice'}>
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Delivery note */}
                          {tx.deliveryStatus === 'Hand Overed' && (
                            <button onClick={() => onPrint(tx, 'DELIVERY_NOTE')}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 transition"
                              title="Delivery Note">
                              <Truck className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Record any payment (generic) */}
                          <button onClick={() => handleOpenPayment(tx)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 transition"
                            title="Record Payment">
                            <DollarSign className="w-3.5 h-3.5" />
                          </button>

                          {/* ── BUY only: Mark as Fully Paid ── */}
                          {showBuyMarkPaid && (
                            <button onClick={() => handleOpenMarkPaid(tx)}
                              className="p-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 transition"
                              title="Mark as Fully Paid (BUY)">
                              <BadgeCheck className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* ── RENT only: Pay This Month's Rent ── */}
                          {showRentPayMonth && (
                            <button onClick={() => handleOpenPayMonth(tx, nextIncompleteMonth)}
                              className="p-1.5 rounded-lg bg-amber-950 hover:bg-amber-900 text-amber-400 border border-amber-800 transition"
                              title={nextIncompleteMonth.isPartial
                                ? `Pay Month ${nextIncompleteMonth.month} Rest Amount (LKR ${fmt(nextIncompleteMonth.remainingAmount)})`
                                : `Pay Month ${nextIncompleteMonth.month} Rent (LKR ${fmt(nextIncompleteMonth.amount)})`}>
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit */}
                          <button onClick={() => handleOpenEdit(tx)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition"
                            title="Edit Transaction">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Return machine */}
                          {isRent && tx.rentDetails?.returnStatus !== 'Returned' && (
                            <button onClick={() => handleOpenReturn(tx)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition"
                              title="Process Machine Return">
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isRent && tx.rentDetails?.returnStatus === 'Returned' && (
                            <button onClick={() => onPrint(tx, 'RETURN_NOTE')}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                              title="Print Return Note">
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* View full details */}
                          <button onClick={() => setInspectingTx(tx)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                            title="View Full Details">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
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

      {/* ══════════════ INSPECTION DRAWER ══════════════ */}
      {inspectingTx && (() => {
        const tx = inspectingTx;
        const isRent = tx.transactionType === 'RENT';
        const cust = tx.customerSnapshot || tx.customer || {};
        const mach = tx.machinerySnapshot || tx.machinery || {};
        const timeline = isRent ? buildRentTimeline(tx) : [];
        const rd = tx.rentDetails;
        const paidMonths = timeline.filter((m) => m.paid).length;
        const partialMonths = timeline.filter((m) => m.isPartial).length;

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
            <div className="w-full max-w-xl glass-dropdown border-l border-slate-700 overflow-y-auto text-slate-100">
              {/* Sticky header */}
              <div className="sticky top-0 bg-slate-950/95 border-b border-slate-800 px-5 py-4 z-10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {tx.invoiceNumber}
                  </span>
                  <h3 className="text-sm font-bold text-white mt-1">
                    {isRent ? 'Rental Agreement Details' : 'Sales Transaction Details'}
                  </h3>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setInspectingTx(null); handleOpenEdit(tx); }}
                    className="p-1.5 rounded-lg bg-amber-950 border border-amber-800 text-amber-400 hover:bg-amber-900 transition" title="Edit">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setInspectingTx(null); onPrint(tx, isRent ? 'AGREEMENT' : 'INVOICE'); }}
                    className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400 hover:bg-cyan-900 transition" title="Print">
                    <Printer className="w-4 h-4" />
                  </button>
                  <button onClick={() => setInspectingTx(null)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-3 text-xs">
                {/* Customer */}
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Customer</div>
                  <div className="text-sm font-bold text-white">{cust.name}</div>
                  <div>CID: <span className="font-mono text-cyan-400">{cust.cid}</span> • Phone: {cust.phone}</div>
                  <div>Region: {cust.region}</div>
                  <div className="text-slate-400">Address: {cust.address}</div>
                </div>

                {/* Machinery */}
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Machinery</div>
                  <div className="text-sm font-bold text-cyan-400">{mach.brand} {mach.model}</div>
                  <div>SKU: {mach.sku} • Qty: <strong>{tx.quantity} Sets</strong></div>
                  <div>Dispatched: {fmtDate(tx.dispatchDate || tx.createdAt)} •
                    Delivery: <span className={`font-semibold ${tx.deliveryStatus === 'Hand Overed' ? 'text-emerald-400' : 'text-amber-400'}`}>{tx.deliveryStatus}</span>
                  </div>
                  {tx.deliveryCharges > 0 && <div>Delivery Charges: LKR {fmt(tx.deliveryCharges)}</div>}
                  {tx.serialNumbers?.length > 0 && (
                    <div className="font-mono text-cyan-300">S/N: {tx.serialNumbers.join(', ')}</div>
                  )}
                  {mach.ownershipType === 'THIRD_PARTY_ASSET' && (
                    <div className="text-amber-400 text-[11px]">⚠ Third-Party Asset — {mach.thirdPartyCompany}</div>
                  )}
                </div>

                {/* BUY Financial */}
                {!isRent && bd && (
                  <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-800/40 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-2">Financial Breakdown (Sales)</div>
                    {[
                      { label: 'Unit Price', val: `LKR ${fmt(bd.unitPrice)}` },
                      { label: 'Subtotal', val: `LKR ${fmt(bd.subtotal)}` },
                      bd.taxIncluded && { label: `Tax (${bd.taxPercent}%)`, val: `LKR ${fmt(bd.taxAmount)}` },
                      { label: 'Total Amount', val: `LKR ${fmt(bd.totalAmount)}`, cls: 'text-white font-bold' },
                      { label: 'Paid Amount', val: `LKR ${fmt(bd.paidAmount)}`, cls: 'text-emerald-400 font-bold' },
                      { label: 'Outstanding', val: `LKR ${fmt(bd.outstandingAmount)}`, cls: 'text-rose-400 font-bold' },
                    ].filter(Boolean).map(({ label, val, cls = '' }) => (
                      <div key={label} className="flex justify-between py-0.5 border-b border-slate-800/50">
                        <span className="text-slate-400">{label}:</span>
                        <span className={cls}>{val}</span>
                      </div>
                    ))}
                    <div className="pt-1 flex justify-between items-center">
                      <span className="text-slate-400">Settlement:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        bd.settlementStatus === 'Fully Paid' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : bd.settlementStatus === 'Partial Payment' ? 'bg-sky-950 text-sky-300 border border-sky-800'
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>{bd.settlementStatus || 'Credit / Pending'}</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-800 grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-lg bg-indigo-950/40 border border-indigo-800/60">
                        <div className="text-[10px] text-indigo-300">Anujaya ({bd.profitSplitPercent?.anujayaPercent ?? 50}%)</div>
                        <div className="font-bold text-indigo-200">LKR {fmt(bd.anujayaNetProfit)}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/60">
                        <div className="text-[10px] text-emerald-300">Global ({bd.profitSplitPercent?.globalPercent ?? 50}%)</div>
                        <div className="font-bold text-emerald-200">LKR {fmt(bd.globalNetProfit)}</div>
                      </div>
                    </div>
                    {(bd.outstandingAmount || 0) > 0 && (
                      <button onClick={() => { setInspectingTx(null); handleOpenMarkPaid(tx); }}
                        className="w-full mt-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white text-xs flex items-center justify-center gap-2">
                        <BadgeCheck className="w-3.5 h-3.5" /> Mark as Fully Paid
                      </button>
                    )}
                  </div>
                )}

                {/* RENT Financial */}
                {isRent && rd && (
                  <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/40 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-2">Rental Agreement Details</div>
                    {[
                      { label: 'Duration', val: `${rd.durationMonths} Months` },
                      { label: 'Rate /Mo', val: `LKR ${fmt(rd.rentPricePerMonth)}` },
                      { label: 'Total Rent Value', val: `LKR ${fmt(rd.totalRentValue)}` },
                      rd.hasKeyMoney && { label: 'Key Money', val: `LKR ${fmt(rd.keyMoneyAmount)}` },
                      { label: 'Total Payable', val: `LKR ${fmt(rd.totalRentalPayable)}`, cls: 'font-bold text-white' },
                      { label: 'Total Paid', val: `LKR ${fmt(rd.totalRentalPaid)}`, cls: 'font-bold text-emerald-400' },
                      { label: 'Outstanding', val: `LKR ${fmt(rd.outstandingRentalBalance)}`, cls: 'font-bold text-rose-400' },
                    ].filter(Boolean).map(({ label, val, cls = '' }) => (
                      <div key={label} className="flex justify-between py-0.5 border-b border-slate-800/40">
                        <span className="text-slate-400">{label}:</span>
                        <span className={cls}>{val}</span>
                      </div>
                    ))}
                    {rd.nextPaymentDueDate && (
                      <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-800/60 flex justify-between items-center">
                        <span className="text-amber-300 font-semibold">Next Payment Due:</span>
                        <span className="font-mono font-bold text-amber-200">{fmtDate(rd.nextPaymentDueDate)}</span>
                      </div>
                    )}
                    <div className="text-[11px] text-slate-400">
                      Return Status: <span className={`font-semibold ${rd.returnStatus === 'Returned' ? 'text-slate-300' : 'text-emerald-400'}`}>{rd.returnStatus || 'In Use'}</span>
                      {rd.returnDate && <span> • Returned: {fmtDate(rd.returnDate)}</span>}
                    </div>
                  </div>
                )}

                {/* ─── RENT Month-by-Month Timeline ─── */}
                {isRent && timeline.length > 0 && (
                  <div>
                    <button type="button" onClick={() => setShowInspectorPayments(!showInspectorPayments)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-900 transition">
                      <span>
                        Month-by-Month Schedule &nbsp;
                        <span className="font-normal text-slate-500">
                          ({paidMonths}/{timeline.length} months paid{partialMonths > 0 ? `, ${partialMonths} partial` : ''})
                        </span>
                      </span>
                      {showInspectorPayments ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {showInspectorPayments && (
                      <div className="mt-1.5 space-y-1.5 max-h-72 overflow-y-auto pr-1">
                        {timeline.map((m) => (
                          <div key={m.month}
                            className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border text-[11px] ${
                              m.paid
                                ? 'bg-emerald-950/30 border-emerald-800/50'
                                : m.isPartial
                                ? 'bg-amber-950/30 border-amber-800/50'
                                : 'bg-rose-950/20 border-rose-800/30'
                            }`}>
                            {/* Left: month badge + info */}
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                m.paid
                                  ? 'bg-emerald-600 text-white'
                                  : m.isPartial
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-rose-900 text-rose-300'
                              }`}>{m.month}</span>
                              <div className="min-w-0">
                                <div className={m.paid ? 'text-emerald-300 font-semibold' : m.isPartial ? 'text-amber-300 font-semibold' : 'text-rose-300 font-semibold'}>
                                  {m.paid && `✅ Paid — LKR ${fmt(m.paidAmount)}`}
                                  {m.isPartial && `🟡 Partially Paid — LKR ${fmt(m.paidAmount)} / ${fmt(m.amount)} (Rest: LKR ${fmt(m.remainingAmount)})`}
                                  {m.isUnpaid && `🔴 Unpaid — LKR ${fmt(m.amount)} due`}
                                </div>
                                <div className="text-slate-500 text-[10px] truncate">
                                  Due: {fmtDate(m.dueDate)}
                                  {m.paidAmount > 0 && m.paidDate && ` • Last Rcvd: ${fmtDate(m.paidDate)}`}
                                  {m.paidAmount > 0 && m.method && ` (${m.method})`}
                                  {m.paidAmount > 0 && m.ref && ` #${m.ref}`}
                                </div>
                              </div>
                            </div>
                            {/* Right: Pay / Pay Rest button for incomplete months */}
                            {!m.paid && tx.rentDetails?.returnStatus !== 'Returned' && (
                              <button
                                onClick={() => handlePaySpecificMonth(tx, m.month)}
                                className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-white font-bold text-[10px] transition ${
                                  m.isPartial
                                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                                    : 'bg-rose-700 hover:bg-rose-600 shadow-rose-700/30'
                                }`}>
                                <CreditCard className="w-3 h-3" />
                                {m.isPartial ? `Pay Rest (LKR ${fmt(m.remainingAmount)})` : `Pay`}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* All Payment Receipts */}
                <div>
                  <div className="font-bold text-slate-300 mb-1.5">
                    All Recorded Receipts ({(tx.payments || []).length})
                  </div>
                  {(!tx.payments || tx.payments.length === 0) ? (
                    <div className="text-slate-500 text-center py-4">No payment receipts yet.</div>
                  ) : (
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                      {tx.payments.map((p, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-start gap-2">
                          <div>
                            <div className="font-bold text-emerald-400">LKR {fmt(p.amount)}</div>
                            <div className="text-[10px] text-slate-400">
                              {fmtDate(p.date)} • {p.paymentMethod}
                              {p.monthCovered && ` • Month ${p.monthCovered}`}
                              {p.reference && ` • ${p.reference}`}
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">{p.paymentType}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════════════ RECORD PAYMENT MODAL (generic) ══════════════ */}
      {showPaymentModal && selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-dropdown rounded-2xl border border-slate-700 p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">Record Payment — #{selectedTx.invoiceNumber}</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              {selectedTx.transactionType === 'RENT' && (
                <div>
                  <label className="block text-slate-400 mb-1">Apply to Month Schedule</label>
                  <select
                    value={paymentData.monthCovered}
                    onChange={(e) => {
                      const chosenMonth = e.target.value;
                      const timeline = buildRentTimeline(selectedTx);
                      const mObj = timeline.find((m) => String(m.month) === String(chosenMonth));
                      setPaymentData({
                        ...paymentData,
                        monthCovered: chosenMonth,
                        amount: mObj ? mObj.remainingAmount : paymentData.amount,
                      });
                    }}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold"
                  >
                    {buildRentTimeline(selectedTx).map((m) => (
                      <option key={m.month} value={String(m.month)} className="bg-slate-900">
                        Month {m.month} — {m.paid ? '✅ Fully Paid' : m.isPartial ? `🟡 Partial (Rest: LKR ${fmt(m.remainingAmount)})` : `🔴 Unpaid (Due: LKR ${fmt(m.amount)})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-400">Payment Amount (LKR) *</label>
                  {selectedTx.transactionType === 'RENT' && paymentData.monthCovered && (
                    <span className="text-[10px] text-cyan-400 font-semibold">
                      Partial payments supported
                    </span>
                  )}
                </div>
                <input type="number" value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: Number(e.target.value) })}
                  className="w-full glass-input px-3.5 py-2 rounded-xl font-bold text-emerald-400" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Payment Type</label>
                  <select value={paymentData.paymentType}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentType: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl">
                    <option value="MONTHLY_RENT" className="bg-slate-900">Monthly Rental</option>
                    <option value="SALES_SETTLEMENT" className="bg-slate-900">Sales Settlement</option>
                    <option value="KEY_MONEY" className="bg-slate-900">Key Money</option>
                    <option value="DELIVERY_FEE" className="bg-slate-900">Delivery Fee</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Payment Method</label>
                  <select value={paymentData.paymentMethod}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                    className="w-full glass-input px-3 py-2 rounded-xl">
                    <option value="Bank Wire/SLIPS" className="bg-slate-900">Bank Wire / SLIPS</option>
                    <option value="Corporate Cheque" className="bg-slate-900">Corporate Cheque</option>
                    <option value="Cash" className="bg-slate-900">Cash / COD</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Reference / Slip No</label>
                <input type="text" value={paymentData.reference}
                  onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                  placeholder="e.g. SLIP-10294" className="w-full glass-input px-3 py-2 rounded-xl" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button type="button" onClick={() => setShowPaymentModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold">Cancel</button>
                <button type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white">
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════ BUY: MARK AS FULLY PAID MODAL ══════════════ */}
      {showMarkPaidModal && selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm glass-dropdown rounded-2xl border border-emerald-700/60 p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BadgeCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">Mark as Fully Paid</h3>
              </div>
              <button onClick={() => setShowMarkPaidModal(false)} className="text-slate-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-xs space-y-1">
              <div className="font-bold text-emerald-300">{selectedTx.invoiceNumber}</div>
              <div>Outstanding to clear: <strong className="text-white">
                LKR {fmt(selectedTx.buyDetails?.outstandingAmount)}
              </strong></div>
            </div>
            <form onSubmit={handleConfirmMarkPaid} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Payment Method</label>
                <select value={markPaidForm.paymentMethod}
                  onChange={(e) => setMarkPaidForm({ ...markPaidForm, paymentMethod: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl">
                  <option value="Bank Wire/SLIPS" className="bg-slate-900">Bank Wire / SLIPS</option>
                  <option value="Corporate Cheque" className="bg-slate-900">Corporate Cheque</option>
                  <option value="Cash" className="bg-slate-900">Cash / COD</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Reference (optional)</label>
                <input type="text" value={markPaidForm.reference}
                  onChange={(e) => setMarkPaidForm({ ...markPaidForm, reference: e.target.value })}
                  placeholder="Slip No, Cheque No..." className="w-full glass-input px-3 py-2 rounded-xl" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button type="button" onClick={() => setShowMarkPaidModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold">Cancel</button>
                <button type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white">
                  Confirm &amp; Mark Paid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════ RENT: PAY MONTH MODAL ══════════════ */}
      {showPayMonthModal && selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm glass-dropdown rounded-2xl border border-amber-700/60 p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">
                  Pay Month {payingMonthNum} Rent {payingMonthIsPartial ? '(Rest Amount)' : ''}
                </h3>
              </div>
              <button onClick={() => setShowPayMonthModal(false)} className="text-slate-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/50 text-xs space-y-1">
              <div className="font-bold text-amber-300">{selectedTx.invoiceNumber}</div>
              <div>
                Month <strong className="text-white">{payingMonthNum}</strong> of <strong className="text-white">{selectedTx.rentDetails?.durationMonths}</strong>
              </div>
              {payingMonthIsPartial ? (
                <>
                  <div className="text-slate-400">
                    Already Paid: <strong className="text-emerald-400">LKR {fmt(payingMonthTarget - payingMonthRemaining)}</strong>
                  </div>
                  <div>
                    Remaining Balance Due: <strong className="text-amber-300">LKR {fmt(payingMonthRemaining)}</strong>
                  </div>
                </>
              ) : (
                <div>
                  Full Month Rent Due: <strong className="text-white">
                    LKR {fmt(payingMonthTarget)}
                  </strong>
                </div>
              )}
            </div>
            <form onSubmit={handleConfirmPayMonth} className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-400">Payment Amount (LKR) *</label>
                  {payingMonthIsPartial && (
                    <span className="text-[10px] text-amber-400 font-semibold">
                      Rest balance: LKR {fmt(payingMonthRemaining)}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  max={payingMonthRemaining}
                  value={markPaidForm.amount}
                  onChange={(e) => setMarkPaidForm({ ...markPaidForm, amount: Number(e.target.value) })}
                  className="w-full glass-input px-3.5 py-2 rounded-xl font-bold text-emerald-400"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Payment Method</label>
                <select value={markPaidForm.paymentMethod}
                  onChange={(e) => setMarkPaidForm({ ...markPaidForm, paymentMethod: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl">
                  <option value="Bank Wire/SLIPS" className="bg-slate-900">Bank Wire / SLIPS</option>
                  <option value="Corporate Cheque" className="bg-slate-900">Corporate Cheque</option>
                  <option value="Cash" className="bg-slate-900">Cash / COD</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Reference / Slip No (optional)</label>
                <input type="text" value={markPaidForm.reference}
                  onChange={(e) => setMarkPaidForm({ ...markPaidForm, reference: e.target.value })}
                  placeholder="e.g. SLIP-10294" className="w-full glass-input px-3 py-2 rounded-xl" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button type="button" onClick={() => setShowPayMonthModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold">Cancel</button>
                <button type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold text-white shadow-lg shadow-amber-600/30">
                  Confirm Payment (LKR {fmt(markPaidForm.amount)})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════ EDIT TRANSACTION MODAL ══════════════ */}
      {showEditModal && selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg glass-dropdown rounded-2xl border border-amber-700/50 p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Edit — #{selectedTx.invoiceNumber}</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              {selectedTx.transactionType === 'BUY' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Unit Price (LKR)</label>
                      <input type="number" value={editForm.unitPrice}
                        onChange={(e) => setEditForm({ ...editForm, unitPrice: Number(e.target.value) })}
                        className="w-full glass-input px-3 py-2 rounded-xl font-bold" />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Paid Amount (LKR)</label>
                      <input type="number" value={editForm.paidAmount}
                        onChange={(e) => setEditForm({ ...editForm, paidAmount: Number(e.target.value) })}
                        className="w-full glass-input px-3 py-2 rounded-xl font-bold text-emerald-400" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Payment Terms</label>
                      <select value={editForm.paymentTerms}
                        onChange={(e) => setEditForm({ ...editForm, paymentTerms: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl">
                        {paymentTermsOptions.map(o => <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Payment Reference</label>
                      <input type="text" value={editForm.paymentReference}
                        onChange={(e) => setEditForm({ ...editForm, paymentReference: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Rent /Month (LKR)</label>
                      <input type="number" value={editForm.rentPricePerMonth}
                        onChange={(e) => setEditForm({ ...editForm, rentPricePerMonth: Number(e.target.value) })}
                        className="w-full glass-input px-3 py-2 rounded-xl font-bold" />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Duration (Months)</label>
                      <input type="number" value={editForm.durationMonths}
                        onChange={(e) => setEditForm({ ...editForm, durationMonths: Number(e.target.value) })}
                        className="w-full glass-input px-3 py-2 rounded-xl font-bold" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Next Payment Due Date</label>
                      <input type="date" value={editForm.nextPaymentDueDate}
                        onChange={(e) => setEditForm({ ...editForm, nextPaymentDueDate: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl" />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Key Money (LKR)</label>
                      <input type="number" value={editForm.keyMoneyAmount}
                        onChange={(e) => setEditForm({ ...editForm, keyMoneyAmount: Number(e.target.value) })}
                        className="w-full glass-input px-3 py-2 rounded-xl" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Payment Terms</label>
                      <select value={editForm.paymentTerms}
                        onChange={(e) => setEditForm({ ...editForm, paymentTerms: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl">
                        {paymentTermsOptions.map(o => <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Payment Reference</label>
                      <input type="text" value={editForm.paymentReference}
                        onChange={(e) => setEditForm({ ...editForm, paymentReference: e.target.value })}
                        className="w-full glass-input px-3 py-2 rounded-xl" />
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="block text-slate-400 mb-1">Delivery Charges (LKR)</label>
                <input type="number" value={editForm.deliveryCharges}
                  onChange={(e) => setEditForm({ ...editForm, deliveryCharges: Number(e.target.value) })}
                  className="w-full glass-input px-3 py-2 rounded-xl" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button type="button" onClick={() => setShowEditModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold">Cancel</button>
                <button type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold text-white">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════ PROCESS RETURN MODAL ══════════════ */}
      {showReturnModal && selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg glass-dropdown rounded-2xl border border-amber-500/40 p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Process Return (#{selectedTx.invoiceNumber})</h3>
              </div>
              <button onClick={() => setShowReturnModal(false)} className="text-slate-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-700/50 text-xs space-y-2">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Flexible Return Rule Engine:
              </div>
              <p className="text-slate-300 text-[11px]">Return after the 5th of a monthly cycle = full month billed; before = month waived.</p>
              {returnPreview && (
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1 font-mono text-[11px]">
                  <div className="text-slate-300">Day: <strong>{new Date(returnData.returnDate).getDate()}</strong> ({returnPreview.past5th ? 'Past 5th → Full Month' : 'Before/on 5th → Waived'})</div>
                  <div className="text-cyan-400">• Billed: <strong>{returnPreview.actualBilled} months</strong></div>
                  <div className="text-emerald-400">• Waived: <strong>{returnPreview.waived} months</strong></div>
                  <div className="text-slate-400 text-[10px]">{selectedTx.quantity} unit(s) returned to warehouse stock.</div>
                </div>
              )}
            </div>
            <form onSubmit={handleProcessReturn} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Actual Return Date</label>
                <input type="date" value={returnData.returnDate}
                  onChange={(e) => setReturnData({ ...returnData, returnDate: e.target.value })}
                  className="w-full glass-input px-3.5 py-2 rounded-xl" required />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Inspection Notes</label>
                <textarea rows="2" value={returnData.returnNotes}
                  onChange={(e) => setReturnData({ ...returnData, returnNotes: e.target.value })}
                  className="w-full glass-input px-3.5 py-2 rounded-xl" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button type="button" onClick={() => setShowReturnModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold">Cancel</button>
                <button type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold text-white">
                  Confirm Return &amp; Reconcile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
