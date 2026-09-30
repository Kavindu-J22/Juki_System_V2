import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  X,
  ShoppingCart,
  Calendar,
  Calculator,
  User,
  Plus,
  Trash2,
  Printer,
  Sparkles,
  Percent,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const DispatchModal = ({ machine, customers = [], onClose, onSuccess, onPrint }) => {
  const { t } = useAuth();
  const { addToast } = useToast();

  const [dispatchType, setDispatchType] = useState('BUY'); // 'BUY' | 'RENT'
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [quantity, setQuantity] = useState(1);
  const [serialInput, setSerialInput] = useState('');
  const [serialNumbers, setSerialNumbers] = useState([]);
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryCharges, setDeliveryCharges] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);

  // BUY PATH STATE
  const [benchmarkType, setBenchmarkType] = useState('Wholesale');
  const [unitPrice, setUnitPrice] = useState(machine?.wholesaleBenchmark || 0);
  const [taxIncluded, setTaxIncluded] = useState(false);
  const [taxPercent, setTaxPercent] = useState(5);
  const [paidAmountBuy, setPaidAmountBuy] = useState(0);
  const [settlementStatusBuy, setSettlementStatusBuy] = useState('Credit / Pending');
  const [paymentTermsBuy, setPaymentTermsBuy] = useState('Bank Wire/SLIPS');
  const [paymentRefBuy, setPaymentRefBuy] = useState('');
  const [anujayaSplitPercent, setAnujayaSplitPercent] = useState(50);
  const [globalSplitPercent, setGlobalSplitPercent] = useState(50);

  // RENT PATH STATE
  const [durationMonths, setDurationMonths] = useState(3);
  const [rentPricePerMonth, setRentPricePerMonth] = useState(machine?.rentPricePerMonth || 0);
  const [hasKeyMoney, setHasKeyMoney] = useState(true);
  const [keyMoneyAmount, setKeyMoneyAmount] = useState(50000);
  const [keyMoneyPaidAmount, setKeyMoneyPaidAmount] = useState(50000);
  const [firstTwoMonthsPaidAmount, setFirstTwoMonthsPaidAmount] = useState(0);
  const [paymentTermsRent, setPaymentTermsRent] = useState('Bank Wire/SLIPS');
  const [paymentRefRent, setPaymentRefRent] = useState('');
  const [customTerms, setCustomTerms] = useState([
    'Machine must be operated with voltage surge protections.',
    'Consortium mechanics are entitled to monthly maintenance inspections.',
    'Returns exceeding the 5th day of a cycle incur full month rental charges.',
  ]);
  const [newTermInput, setNewTermInput] = useState('');

  const [loading, setLoading] = useState(false);

  // Set initial customer and serials
  useEffect(() => {
    if (customers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(customers[0]._id);
      setSelectedCustomer(customers[0]);
    }
  }, [customers]);

  // Adjust unit price on benchmark switch
  useEffect(() => {
    if (benchmarkType === 'Wholesale') {
      setUnitPrice(machine?.wholesaleBenchmark || 0);
    } else if (benchmarkType === 'Retail') {
      setUnitPrice(machine?.retailBenchmark || 0);
    }
  }, [benchmarkType, machine]);

  // Handle Customer Selection
  const handleSelectCustomer = (cid) => {
    setSelectedCustomerId(cid);
    const found = customers.find((c) => c._id === cid);
    setSelectedCustomer(found || null);
  };

  // Add Serial Number tag
  const handleAddSerial = () => {
    if (serialInput.trim() && !serialNumbers.includes(serialInput.trim())) {
      setSerialNumbers([...serialNumbers, serialInput.trim()]);
      setSerialInput('');
    }
  };

  const handleRemoveSerial = (index) => {
    setSerialNumbers(serialNumbers.filter((_, i) => i !== index));
  };

  // Add custom term
  const handleAddTerm = () => {
    if (newTermInput.trim()) {
      setCustomTerms([...customTerms, newTermInput.trim()]);
      setNewTermInput('');
    }
  };

  const handleRemoveTerm = (index) => {
    setCustomTerms(customTerms.filter((_, i) => i !== index));
  };

  // LIVE CALCULATIONS FOR BUY
  const subtotalBuy = (Number(unitPrice) || 0) * (Number(quantity) || 1);
  const taxAmountBuy = taxIncluded ? (subtotalBuy * (Number(taxPercent) || 0)) / 100 : 0;
  const totalAmountBuy = subtotalBuy + taxAmountBuy + (Number(deliveryCharges) || 0) + (Number(otherCharges) || 0);
  const outstandingBuy = Math.max(0, totalAmountBuy - (Number(paidAmountBuy) || 0));

  // Cost of Goods & Profit Share for BUY
  const costOfGoodsBuy = (machine?.landedUnitCost || 0) * (Number(quantity) || 1);
  const grossProfitBuy = Math.max(0, totalAmountBuy - costOfGoodsBuy - (Number(deliveryCharges) || 0) - (Number(otherCharges) || 0));
  const anujayaNetProfit = (grossProfitBuy * (Number(anujayaSplitPercent) || 50)) / 100;
  const globalNetProfit = (grossProfitBuy * (Number(globalSplitPercent) || 50)) / 100;

  // LIVE CALCULATIONS FOR RENT
  const totalRentValue = (Number(durationMonths) || 1) * (Number(rentPricePerMonth) || 0) * (Number(quantity) || 1);
  const first2MonthsRequired = (Number(rentPricePerMonth) || 0) * Math.min(2, Number(durationMonths) || 1) * (Number(quantity) || 1);
  const totalRentPayable = totalRentValue + (hasKeyMoney ? Number(keyMoneyAmount) || 0 : 0) + (Number(deliveryCharges) || 0);
  const totalRentPaidInitial = (hasKeyMoney ? Number(keyMoneyPaidAmount) || 0 : 0) + (Number(firstTwoMonthsPaidAmount) || 0);
  const outstandingRent = Math.max(0, totalRentPayable - totalRentPaidInitial);

  // Available stock in warehouse
  const inWarehouse = Math.max(0, (machine?.initialBatchSets || 0) - (machine?.dispatched || 0));

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      addToast('error', 'Please select an apparel customer or factory');
      return;
    }

    if (quantity > inWarehouse) {
      addToast('error', `Only ${inWarehouse} sets currently available in warehouse!`);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        transactionType: dispatchType,
        customerId: selectedCustomerId,
        machineryId: machine._id,
        quantity: Number(quantity),
        serialNumbers,
        dispatchDate,
        deliveryCharges: Number(deliveryCharges),
        otherCharges: Number(otherCharges),
      };

      if (dispatchType === 'BUY') {
        payload.buyDetails = {
          benchmarkType,
          unitPrice: Number(unitPrice),
          taxIncluded,
          taxPercent: Number(taxPercent),
          paidAmount: Number(paidAmountBuy),
          paymentTerms: paymentTermsBuy,
          paymentReference: paymentRefBuy,
          profitSplitPercent: {
            anujayaPercent: Number(anujayaSplitPercent),
            globalPercent: Number(globalSplitPercent),
          },
        };
      } else {
        payload.rentDetails = {
          durationMonths: Number(durationMonths),
          rentPricePerMonth: Number(rentPricePerMonth),
          hasKeyMoney,
          keyMoneyAmount: hasKeyMoney ? Number(keyMoneyAmount) : 0,
          keyMoneyPaidAmount: hasKeyMoney ? Number(keyMoneyPaidAmount) : 0,
          firstTwoMonthsPaidAmount: Number(firstTwoMonthsPaidAmount),
          paymentTerms: paymentTermsRent,
          paymentReference: paymentRefRent,
          termsAndConditions: customTerms,
        };
      }

      const res = await api.createTransaction(payload);

      if (res.success && res.transaction) {
        addToast('success', `Dispatch order #${res.transaction.invoiceNumber} processed successfully!`);
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        if (onSuccess) onSuccess(res.transaction);
        if (onPrint) onPrint(res.transaction, dispatchType === 'BUY' ? 'INVOICE' : 'AGREEMENT');
      } else {
        addToast('error', res.message || 'Dispatch failed');
      }
    } catch (err) {
      addToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl glass-dropdown rounded-2xl border border-slate-700/80 shadow-2xl p-6 md:p-8 my-8 text-slate-100">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                {machine?.sku}
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {t('dispatchSales')} : {machine?.brand} {machine?.model}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Available in Warehouse: <span className="font-bold text-emerald-400">{inWarehouse} SETS</span> • Landed Cost: LKR {Number(machine?.landedUnitCost || 0).toLocaleString()}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Path Selection (BUY vs RENT) */}
        <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-900 rounded-xl border border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => setDispatchType('BUY')}
            className={`py-3 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition ${
              dispatchType === 'BUY'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-glow-cyan'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Path 1: Direct Sale (BUY)</span>
          </button>

          <button
            type="button"
            onClick={() => setDispatchType('RENT')}
            className={`py-3 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition ${
              dispatchType === 'RENT'
                ? 'bg-gradient-to-r from-amber-600 to-emerald-600 text-white shadow-glow-amber'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Path 2: Machinery Agreement (RENT)</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Selection & Autofill Section */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <User className="w-4 h-4 text-cyan-400" />
                <span>{t('selectClient')}</span>
              </label>
              <span className="text-[11px] text-slate-500">Auto-fills contact details & region</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleSelectCustomer(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                  required
                >
                  <option value="" disabled className="bg-slate-900">
                    -- Select Apparel Customer --
                  </option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id} className="bg-slate-900 text-white">
                      {c.name} ({c.cid} - {c.region})
                    </option>
                  ))}
                </select>
              </div>

              {selectedCustomer && (
                <div className="text-xs text-slate-400 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-0.5">
                  <div>
                    <span className="font-semibold text-slate-200">Phone:</span> {selectedCustomer.phone} •{' '}
                    <span className="font-semibold text-slate-200">Region:</span> {selectedCustomer.region}
                  </div>
                  <div className="truncate">
                    <span className="font-semibold text-slate-200">Address:</span> {selectedCustomer.address}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Common Order Attributes (Quantity, Serial Numbers, Dispatch Date, Delivery Charges) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">{t('quantity')}</label>
              <input
                type="number"
                min="1"
                max={inWarehouse}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Dispatch Date</label>
              <input
                type="date"
                value={dispatchDate}
                onChange={(e) => setDispatchDate(e.target.value)}
                className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">{t('deliveryFee')} (LKR)</label>
              <input
                type="number"
                min="0"
                value={deliveryCharges}
                onChange={(e) => setDeliveryCharges(Number(e.target.value))}
                className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Asset Tracking: Serial Numbers Input */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <label className="block text-xs font-semibold text-slate-300">
              {t('serialNumbers')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={serialInput}
                onChange={(e) => setSerialInput(e.target.value)}
                placeholder="Enter Serial Number (e.g., JK-8700-449) and press Add"
                className="flex-1 glass-input px-3.5 py-2 rounded-xl text-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSerial();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddSerial}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-400 border border-cyan-800 transition"
              >
                Add Serial
              </button>
            </div>

            {/* Serial Tags */}
            {serialNumbers.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {serialNumbers.map((s, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 text-xs font-mono border border-cyan-800"
                  >
                    <span>{s}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSerial(idx)}
                      className="text-cyan-400 hover:text-rose-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ================= PATH 1: BUY DETAILS ================= */}
          {dispatchType === 'BUY' && (
            <div className="space-y-4 p-5 rounded-2xl bg-cyan-950/20 border border-cyan-500/20">
              <div className="flex items-center justify-between border-b border-cyan-900/60 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4" />
                  <span>Sales Ledger & Profit Distribution Configuration</span>
                </h3>
                <span className="text-[11px] text-slate-400">Direct Equipment Purchase</span>
              </div>

              {/* Benchmark Selector & Unit Price */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Price Benchmark</label>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setBenchmarkType('Wholesale')}
                      className={`py-1.5 text-xs font-semibold rounded-lg ${
                        benchmarkType === 'Wholesale' ? 'bg-cyan-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Wholesale
                    </button>
                    <button
                      type="button"
                      onClick={() => setBenchmarkType('Retail')}
                      className={`py-1.5 text-xs font-semibold rounded-lg ${
                        benchmarkType === 'Retail' ? 'bg-cyan-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Retail
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">{t('unitPrice')} (LKR)</label>
                  <input
                    type="number"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(Number(e.target.value))}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">{t('otherCharges')} (LKR)</label>
                  <input
                    type="number"
                    value={otherCharges}
                    onChange={(e) => setOtherCharges(Number(e.target.value))}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Tax Included Option */}
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                  <input
                    type="checkbox"
                    checked={taxIncluded}
                    onChange={(e) => setTaxIncluded(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 bg-slate-900 border-slate-700"
                  />
                  <span>{t('taxIncluded')}</span>
                </label>

                {taxIncluded && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">VAT / Tax Rate (%):</span>
                    <input
                      type="number"
                      value={taxPercent}
                      onChange={(e) => setTaxPercent(Number(e.target.value))}
                      className="w-20 glass-input px-2.5 py-1 rounded-lg text-xs font-bold"
                    />
                  </div>
                )}
              </div>

              {/* Settlement Status & Payment Terms */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">{t('paymentTerms')}</label>
                  <select
                    value={paymentTermsBuy}
                    onChange={(e) => setPaymentTermsBuy(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  >
                    <option value="Bank Wire/SLIPS" className="bg-slate-900">Bank Wire / SLIPS</option>
                    <option value="Corporate Cheque" className="bg-slate-900">Corporate Cheque</option>
                    <option value="COD" className="bg-slate-900">COD (Cash on Delivery)</option>
                    <option value="Letter of Credit (LC)" className="bg-slate-900">Letter of Credit (LC)</option>
                    <option value="30-Day Credit" className="bg-slate-900">30-Day Corporate Credit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Paid Amount (LKR)</label>
                  <input
                    type="number"
                    value={paidAmountBuy}
                    onChange={(e) => setPaidAmountBuy(Number(e.target.value))}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">{t('paymentRef')}</label>
                  <input
                    type="text"
                    value={paymentRefBuy}
                    onChange={(e) => setPaymentRefBuy(e.target.value)}
                    placeholder="e.g. SLIP-9921 / CHQ-102"
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Dynamic Instant Profit Share Split Calculator */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Percent className="w-4 h-4" />
                    <span>Consortium Profit Share Split (Instant Live Breakdown)</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Gross Profit: <span className="font-bold text-white">LKR {grossProfitBuy.toLocaleString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-800/60">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-indigo-300">Anujaya Enterprises</span>
                      <span className="font-mono text-xs">{anujayaSplitPercent}%</span>
                    </div>
                    <div className="text-lg font-bold text-indigo-200 mt-1">
                      LKR {anujayaNetProfit.toLocaleString()}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-emerald-300">Global Enterprises</span>
                      <span className="font-mono text-xs">{globalSplitPercent}%</span>
                    </div>
                    <div className="text-lg font-bold text-emerald-200 mt-1">
                      LKR {globalNetProfit.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= PATH 2: RENT DETAILS ================= */}
          {dispatchType === 'RENT' && (
            <div className="space-y-4 p-5 rounded-2xl bg-amber-950/20 border border-amber-500/20">
              <div className="flex items-center justify-between border-b border-amber-900/60 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>Rental Agreement & Advance Settlement Terms</span>
                </h3>
                <span className="text-[11px] text-slate-400">Monthly Machinery Rental</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">{t('durationMonths')}</label>
                  <input
                    type="number"
                    min="1"
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(Number(e.target.value))}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">{t('rentPrice')} (LKR)</label>
                  <input
                    type="number"
                    value={rentPricePerMonth}
                    onChange={(e) => setRentPricePerMonth(Number(e.target.value))}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Total Rent Value (LKR)</label>
                  <div className="glass-input px-3.5 py-2 rounded-xl text-xs font-bold text-cyan-300">
                    LKR {totalRentValue.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Key Money Section */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                    <input
                      type="checkbox"
                      checked={hasKeyMoney}
                      onChange={(e) => setHasKeyMoney(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700"
                    />
                    <span>{t('keyMoney')}</span>
                  </label>
                  <span className="text-[11px] text-slate-500">Refundable Equipment Security Deposit</span>
                </div>

                {hasKeyMoney && (
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <span className="text-[11px] text-slate-400">Deposit Amount (LKR):</span>
                      <input
                        type="number"
                        value={keyMoneyAmount}
                        onChange={(e) => setKeyMoneyAmount(Number(e.target.value))}
                        className="w-full glass-input px-3 py-1.5 rounded-lg text-xs font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400">Deposit Paid Amount (LKR):</span>
                      <input
                        type="number"
                        value={keyMoneyPaidAmount}
                        onChange={(e) => setKeyMoneyPaidAmount(Number(e.target.value))}
                        className="w-full glass-input px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-400"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* First 2 Months Advance Payment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    First 2 Months Rent Advance Paid (LKR)
                  </label>
                  <input
                    type="number"
                    value={firstTwoMonthsPaidAmount}
                    onChange={(e) => setFirstTwoMonthsPaidAmount(Number(e.target.value))}
                    placeholder={`Expected: LKR ${first2MonthsRequired.toLocaleString()}`}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-400"
                  />
                  <div className="text-[10px] text-slate-500 mt-1">
                    Required for 2 Months: LKR {first2MonthsRequired.toLocaleString()}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">{t('paymentTerms')}</label>
                  <select
                    value={paymentTermsRent}
                    onChange={(e) => setPaymentTermsRent(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  >
                    <option value="Bank Wire/SLIPS" className="bg-slate-900">Bank Wire / SLIPS</option>
                    <option value="Corporate Cheque" className="bg-slate-900">Corporate Cheque</option>
                    <option value="COD" className="bg-slate-900">COD (Cash on Delivery)</option>
                    <option value="30-Day Credit" className="bg-slate-900">30-Day Credit</option>
                  </select>
                </div>
              </div>

              {/* Flexible Return Rule Engine Alert Banner */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong>{t('returnRuleNotice')}</strong>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Rental agreements automatically track deadlines. Automated email & dashboard reminders trigger 7 days, 3 days, Due Today, and Overdue.
                  </p>
                </div>
              </div>

              {/* Custom Terms & Conditions Editor */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">
                  Custom Terms & Conditions (Editable on Agreement):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTermInput}
                    onChange={(e) => setNewTermInput(e.target.value)}
                    placeholder="Add custom clause (e.g., Client responsible for electrical voltage surges)"
                    className="flex-1 glass-input px-3.5 py-2 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddTerm}
                    className="px-3 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-amber-400 border border-amber-800"
                  >
                    Add Clause
                  </button>
                </div>

                <div className="space-y-1.5 pt-1">
                  {customTerms.map((term, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300"
                    >
                      <span>• {term}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTerm(i)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Checkout Summary Bar */}
          <div className="p-4 rounded-xl glass-card border border-slate-700/80 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-400">Total Transaction Value:</div>
              <div className="text-2xl font-black text-white">
                LKR{' '}
                {dispatchType === 'BUY'
                  ? totalAmountBuy.toLocaleString()
                  : totalRentPayable.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Outstanding Balance:{' '}
                <span className="font-bold text-rose-400">
                  LKR{' '}
                  {dispatchType === 'BUY'
                    ? outstandingBuy.toLocaleString()
                    : outstandingRent.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
              >
                {t('cancel')}
              </button>

              <button
                type="submit"
                disabled={loading}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-500 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xl shadow-cyan-500/25 transition disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{loading ? 'Processing Dispatch...' : 'Confirm Dispatch & Generate Document'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
