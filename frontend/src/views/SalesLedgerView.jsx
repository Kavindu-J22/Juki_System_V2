import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  Layers,
  Search,
  ShoppingCart,
  Calendar,
  Printer,
  FileText,
  Truck,
  RotateCcw,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
  Eye,
  ChevronRight,
} from 'lucide-react';

export const SalesLedgerView = ({ onPrint }) => {
  const { t } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('RENT'); // 'RENT' | 'BUY'
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals & Drawers
  const [inspectingTx, setInspectingTx] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);

  // Payment Form State
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentType: 'MONTHLY_RENT',
    paymentMethod: 'Bank Wire/SLIPS',
    reference: '',
    notes: '',
  });

  // Return Form State (Flexible 5th-Day Rule Engine)
  const [returnData, setReturnData] = useState({
    returnDate: new Date().toISOString().split('T')[0],
    returnNotes: 'Machine returned in good operational condition with accessories.',
  });

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await api.getTransactions({
        type: activeTab,
        search,
      });
      if (res.success) {
        setTransactions(res.transactions);
      }
    } catch (err) {
      addToast('error', 'Error loading ledger records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [activeTab, search]);

  // Update Delivery Status (Pending -> Ongoing -> Hand Overed)
  const handleUpdateDelivery = async (txId, newStatus) => {
    try {
      const res = await api.updateDeliveryStatus(txId, newStatus);
      if (res.success) {
        addToast('success', `Delivery status updated to ${newStatus}`);
        fetchTransactions();
      }
    } catch (err) {
      addToast('error', err.message);
    }
  };

  // Open Payment Collection Modal
  const handleOpenPayment = (tx) => {
    setSelectedTx(tx);
    const defaultAmt = tx.transactionType === 'RENT'
      ? tx.rentDetails?.rentPricePerMonth * (tx.quantity || 1)
      : tx.buyDetails?.outstandingAmount;

    setPaymentData({
      amount: defaultAmt || 0,
      paymentType: tx.transactionType === 'RENT' ? 'MONTHLY_RENT' : 'SALES_SETTLEMENT',
      paymentMethod: 'Bank Wire/SLIPS',
      reference: '',
      notes: '',
    });
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedTx) return;

    try {
      const res = await api.recordPayment(selectedTx._id, paymentData);
      if (res.success) {
        addToast('success', 'Payment recorded successfully!');
        setShowPaymentModal(false);
        fetchTransactions();
      }
    } catch (err) {
      addToast('error', err.message);
    }
  };

  // Open Machine Return Modal
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
    if (!selectedTx) return;

    try {
      const res = await api.processReturn(selectedTx._id, returnData);
      if (res.success) {
        addToast('success', res.message);
        setShowReturnModal(false);
        fetchTransactions();
        if (onPrint) onPrint(res.transaction, 'RETURN_NOTE');
      }
    } catch (err) {
      addToast('error', err.message);
    }
  };

  // Preview 5th-Day Rule calculations for Return modal
  const calcReturnRulePreview = () => {
    if (!selectedTx || selectedTx.transactionType !== 'RENT') return null;
    const dispatchDate = new Date(selectedTx.dispatchDate || selectedTx.createdAt);
    const retDate = new Date(returnData.returnDate);

    let monthsElapsed = (retDate.getFullYear() - dispatchDate.getFullYear()) * 12 + (retDate.getMonth() - dispatchDate.getMonth());
    const day = retDate.getDate();
    const past5th = day > 5;
    if (past5th) {
      monthsElapsed += 1;
    }

    const actualBilled = Math.max(1, monthsElapsed);
    const agreedMonths = selectedTx.rentDetails?.durationMonths || 1;
    const waived = Math.max(0, agreedMonths - actualBilled);

    return { past5th, actualBilled, waived };
  };

  const returnPreview = showReturnModal ? calcReturnRulePreview() : null;

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
            Official Commercial Sales & Machinery Rental Agreement Lifecycle Management
          </p>
        </div>

        {/* Tab Toggle: RENT vs BUY */}
        <div className="flex items-center p-1 bg-slate-900 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('RENT')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'RENT'
                ? 'bg-gradient-to-r from-amber-600 to-emerald-600 text-white shadow-glow-amber'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Rental Agreements</span>
          </button>

          <button
            onClick={() => setActiveTab('BUY')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'BUY'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-glow-cyan'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Sales Ledger (Buy)</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative w-full max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by Agreement #, Invoice #, Customer, Serial #..."
          className="w-full glass-input pl-10 pr-3.5 py-2 rounded-xl text-xs"
        />
      </div>

      {/* LEDGER TABLE */}
      <div className="rounded-2xl glass-card border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800">
                <th className="p-3.5">Document #</th>
                <th className="p-3.5">Customer & Region</th>
                <th className="p-3.5">Machinery & Serials</th>
                <th className="p-3.5 text-center">Delivery Status</th>
                {activeTab === 'RENT' ? (
                  <>
                    <th className="p-3.5 text-right">Rent / Mo</th>
                    <th className="p-3.5 text-right">Total Payable</th>
                    <th className="p-3.5 text-right">Total Paid</th>
                    <th className="p-3.5 text-center">Next Due</th>
                    <th className="p-3.5 text-center">Return Status</th>
                  </>
                ) : (
                  <>
                    <th className="p-3.5 text-right">Unit Price</th>
                    <th className="p-3.5 text-right">Total Amount</th>
                    <th className="p-3.5 text-right">Paid Amount</th>
                    <th className="p-3.5 text-right">Outstanding</th>
                    <th className="p-3.5 text-center">Settlement</th>
                  </>
                )}
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="11" className="p-8 text-center text-slate-500">
                    No transactions found in this ledger view.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isRent = tx.transactionType === 'RENT';
                  const cust = tx.customerSnapshot || tx.customer || {};
                  const mach = tx.machinerySnapshot || tx.machinery || {};

                  return (
                    <tr key={tx._id} className="hover:bg-slate-900/50 transition">
                      {/* Document # */}
                      <td className="p-3.5 font-mono font-bold text-cyan-400">
                        {tx.invoiceNumber}
                        <div className="text-[10px] text-slate-500 font-normal">
                          {new Date(tx.dispatchDate || tx.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="p-3.5">
                        <div className="font-bold text-white">{cust.name}</div>
                        <div className="text-[11px] text-slate-400">{cust.region || cust.phone}</div>
                      </td>

                      {/* Machinery */}
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-200">
                          {mach.brand} {mach.model} ({tx.quantity} Sets)
                        </div>
                        {tx.serialNumbers && tx.serialNumbers.length > 0 && (
                          <div className="text-[10px] font-mono text-cyan-400/90 truncate max-w-xs">
                            S/N: {tx.serialNumbers.join(', ')}
                          </div>
                        )}
                      </td>

                      {/* Delivery Status Dropdown / Indicator */}
                      <td className="p-3.5 text-center">
                        <select
                          value={tx.deliveryStatus}
                          onChange={(e) => handleUpdateDelivery(tx._id, e.target.value)}
                          className={`px-2 py-1 rounded-md text-[10px] font-bold border transition ${
                            tx.deliveryStatus === 'Hand Overed'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : tx.deliveryStatus === 'Ongoing'
                              ? 'bg-sky-950 text-sky-300 border-sky-800'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          <option value="Pending" className="bg-slate-900">Pending</option>
                          <option value="Ongoing" className="bg-slate-900">Ongoing</option>
                          <option value="Hand Overed" className="bg-slate-900">Hand Overed</option>
                        </select>
                      </td>

                      {/* RENT COLUMNS */}
                      {isRent && (
                        <>
                          <td className="p-3.5 text-right font-semibold text-cyan-300">
                            LKR {Number(tx.rentDetails?.rentPricePerMonth || 0).toLocaleString()}
                          </td>
                          <td className="p-3.5 text-right font-bold text-slate-200">
                            LKR {Number(tx.rentDetails?.totalRentalPayable || 0).toLocaleString()}
                          </td>
                          <td className="p-3.5 text-right font-bold text-emerald-400">
                            LKR {Number(tx.rentDetails?.totalRentalPaid || 0).toLocaleString()}
                          </td>
                          <td className="p-3.5 text-center">
                            {tx.rentDetails?.nextPaymentDueDate ? (
                              <span className="font-mono text-[11px] text-amber-300">
                                {new Date(tx.rentDetails.nextPaymentDueDate).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                tx.rentDetails?.returnStatus === 'Returned'
                                  ? 'bg-slate-800 text-slate-300'
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              }`}
                            >
                              {tx.rentDetails?.returnStatus || 'In Use'}
                            </span>
                          </td>
                        </>
                      )}

                      {/* BUY COLUMNS */}
                      {!isRent && (
                        <>
                          <td className="p-3.5 text-right font-semibold text-slate-300">
                            LKR {Number(tx.buyDetails?.unitPrice || 0).toLocaleString()}
                          </td>
                          <td className="p-3.5 text-right font-bold text-slate-200">
                            LKR {Number(tx.buyDetails?.totalAmount || 0).toLocaleString()}
                          </td>
                          <td className="p-3.5 text-right font-bold text-emerald-400">
                            LKR {Number(tx.buyDetails?.paidAmount || 0).toLocaleString()}
                          </td>
                          <td className="p-3.5 text-right font-bold text-rose-400">
                            LKR {Number(tx.buyDetails?.outstandingAmount || 0).toLocaleString()}
                          </td>
                          <td className="p-3.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                tx.buyDetails?.settlementStatus === 'Fully Paid'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : tx.buyDetails?.settlementStatus === 'Partial Payment'
                                  ? 'bg-sky-950 text-sky-300 border border-sky-800'
                                  : 'bg-rose-950 text-rose-300 border border-rose-800'
                              }`}
                            >
                              {tx.buyDetails?.settlementStatus || 'Credit / Pending'}
                            </span>
                          </td>
                        </>
                      )}

                      {/* ACTIONS */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Print Primary Document */}
                          <button
                            onClick={() => onPrint(tx, isRent ? 'AGREEMENT' : 'INVOICE')}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 transition"
                            title={isRent ? 'Print Rental Agreement' : 'Print Commercial Invoice'}
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Print Delivery Note if Hand Overed */}
                          {tx.deliveryStatus === 'Hand Overed' && (
                            <button
                              onClick={() => onPrint(tx, 'DELIVERY_NOTE')}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 transition"
                              title="Print Equipment Delivery Note"
                            >
                              <Truck className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Record Payment */}
                          <button
                            onClick={() => handleOpenPayment(tx)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 transition"
                            title="Record Payment / Collection"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                          </button>

                          {/* Process Return (for active rentals) */}
                          {isRent && tx.rentDetails?.returnStatus !== 'Returned' && (
                            <button
                              onClick={() => handleOpenReturn(tx)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 transition"
                              title="Process Machine Return (5th Day Rule Engine)"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Print Return Note if already returned */}
                          {isRent && tx.rentDetails?.returnStatus === 'Returned' && (
                            <button
                              onClick={() => onPrint(tx, 'RETURN_NOTE')}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                              title="Print Return Note"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Inspect Details */}
                          <button
                            onClick={() => setInspectingTx(tx)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                            title="Inspect Details"
                          >
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

      {/* INSPECTION DRAWER */}
      {inspectingTx && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-lg glass-dropdown border-l border-slate-700 p-6 overflow-y-auto space-y-6 text-slate-100 animate-slide-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {inspectingTx.invoiceNumber}
                </span>
                <h3 className="text-base font-bold text-white mt-1">Transaction Details</h3>
              </div>
              <button
                onClick={() => setInspectingTx(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <div className="text-slate-400">Customer:</div>
                <div className="text-sm font-bold text-white">{inspectingTx.customerSnapshot?.name}</div>
                <div>CID: {inspectingTx.customerSnapshot?.cid} • Phone: {inspectingTx.customerSnapshot?.phone}</div>
                <div>Region: {inspectingTx.customerSnapshot?.region}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <div className="text-slate-400">Machinery:</div>
                <div className="text-sm font-bold text-cyan-400">
                  {inspectingTx.machinerySnapshot?.brand} {inspectingTx.machinerySnapshot?.model}
                </div>
                <div>Quantity: {inspectingTx.quantity} Sets</div>
                {inspectingTx.serialNumbers?.length > 0 && (
                  <div className="font-mono text-cyan-300">
                    Serials: {inspectingTx.serialNumbers.join(', ')}
                  </div>
                )}
              </div>

              {inspectingTx.transactionType === 'BUY' && (
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                  <div className="font-bold text-slate-300">Financial Breakdown:</div>
                  <div className="flex justify-between">
                    <span>Total Amount:</span>
                    <span className="font-bold">LKR {Number(inspectingTx.buyDetails?.totalAmount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>Paid:</span>
                    <span>LKR {Number(inspectingTx.buyDetails?.paidAmount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-rose-400">
                    <span>Outstanding:</span>
                    <span>LKR {Number(inspectingTx.buyDetails?.outstandingAmount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                    <span>Anujaya Profit (50%):</span>
                    <span className="text-indigo-300 font-bold">LKR {Number(inspectingTx.buyDetails?.anujayaNetProfit || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Global Profit (50%):</span>
                    <span className="text-emerald-300 font-bold">LKR {Number(inspectingTx.buyDetails?.globalNetProfit || 0).toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Payment Receipts Ledger */}
              <div className="space-y-2">
                <div className="font-bold text-slate-300">Recorded Payment History:</div>
                {(!inspectingTx.payments || inspectingTx.payments.length === 0) ? (
                  <div className="text-slate-500">No payment receipts recorded yet.</div>
                ) : (
                  inspectingTx.payments.map((p, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-emerald-400">LKR {Number(p.amount).toLocaleString()}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(p.date).toLocaleDateString()} • {p.paymentMethod} {p.reference ? `(${p.reference})` : ''}
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">{p.paymentType}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex gap-2">
              <button
                onClick={() => {
                  setInspectingTx(null);
                  onPrint(inspectingTx, inspectingTx.transactionType === 'BUY' ? 'INVOICE' : 'AGREEMENT');
                }}
                className="flex-1 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold text-xs text-white flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {showPaymentModal && selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-dropdown rounded-2xl border border-slate-700 p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">
                Record Payment for #{selectedTx.invoiceNumber}
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Payment Amount (LKR) *</label>
                <input
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: Number(e.target.value) })}
                  className="w-full glass-input px-3.5 py-2 rounded-xl font-bold text-emerald-400"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Payment Type</label>
                <select
                  value={paymentData.paymentType}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentType: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl"
                >
                  <option value="MONTHLY_RENT" className="bg-slate-900">Monthly Rental Collection</option>
                  <option value="SALES_SETTLEMENT" className="bg-slate-900">Sales Settlement</option>
                  <option value="KEY_MONEY" className="bg-slate-900">Key Money Deposit</option>
                  <option value="DELIVERY_FEE" className="bg-slate-900">Delivery Fee</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Payment Method</label>
                <select
                  value={paymentData.paymentMethod}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl"
                >
                  <option value="Bank Wire/SLIPS" className="bg-slate-900">Bank Wire / SLIPS</option>
                  <option value="Corporate Cheque" className="bg-slate-900">Corporate Cheque</option>
                  <option value="Cash" className="bg-slate-900">Cash / COD</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Reference / Slip No</label>
                <input
                  type="text"
                  value={paymentData.reference}
                  onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                  placeholder="e.g. SLIP-10294"
                  className="w-full glass-input px-3 py-2 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white shadow-lg shadow-emerald-600/30"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROCESS MACHINE RETURN MODAL (5th-Day Rule Engine) */}
      {showReturnModal && selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg glass-dropdown rounded-2xl border border-amber-500/40 p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">
                  Process Return & Stock Reconciliation (#{selectedTx.invoiceNumber})
                </h3>
              </div>
              <button onClick={() => setShowReturnModal(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 5th-Day Rule Engine Live Calculation */}
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-700/50 text-xs space-y-2">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Flexible Return Rule Engine:</span>
              </div>
              <p className="text-slate-300 text-[11px]">
                Rule: If return date exceeds a monthly cycle past the 5th day, that month's rent is recorded as payable; if returned early, that respective month's rent is waived.
              </p>

              {returnPreview && (
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1 font-mono text-[11px]">
                  <div className="text-slate-300">
                    Cycle Day of Return: <strong>{new Date(returnData.returnDate).getDate()}</strong>{' '}
                    ({returnPreview.past5th ? 'Past 5th => Full Month Payable' : 'Before/on 5th => Month Waived'})
                  </div>
                  <div className="text-cyan-400">
                    • Actual Months Billed: <strong>{returnPreview.actualBilled} Months</strong>
                  </div>
                  <div className="text-emerald-400">
                    • Waived Remaining Months: <strong>{returnPreview.waived} Months</strong>
                  </div>
                  <div className="text-slate-400 pt-1 text-[10px]">
                    Automatic Stock Action: Dispatched count will decrement by {selectedTx.quantity}, returning {selectedTx.quantity} units to Warehouse inventory!
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleProcessReturn} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Actual Return Date</label>
                <input
                  type="date"
                  value={returnData.returnDate}
                  onChange={(e) => setReturnData({ ...returnData, returnDate: e.target.value })}
                  className="w-full glass-input px-3.5 py-2 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Return Inspection Notes</label>
                <textarea
                  rows="2"
                  value={returnData.returnNotes}
                  onChange={(e) => setReturnData({ ...returnData, returnNotes: e.target.value })}
                  className="w-full glass-input px-3.5 py-2 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold text-white shadow-lg shadow-amber-600/30"
                >
                  Confirm Return & Reconcile Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
