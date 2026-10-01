import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  X, ShoppingCart, Calendar, User, Plus, Trash2,
  Sparkles, Percent, CheckCircle2, AlertCircle, FileText, Building,
} from 'lucide-react';
import confetti from 'canvas-confetti';

// ── Profit Split Preset Selector (shared by BUY & RENT) ────────────────────
const SPLIT_PRESETS = [
  { label: '100% Anujaya', anujaya: 100, global: 0 },
  { label: '50 / 50',      anujaya: 50,  global: 50 },
  { label: '100% Global',  anujaya: 0,   global: 100 },
];

const ProfitSplitSelector = ({
  grossProfit,
  anujayaPct, setAnujayaPct,
  globalPct,  setGlobalPct,
  accentClass = 'text-amber-400',
  borderClass = 'border-slate-800',
}) => {
  const anujayaAmt = Math.round((grossProfit * anujayaPct) / 100);
  const globalAmt  = Math.round((grossProfit * globalPct)  / 100);

  const handlePreset = (preset) => {
    setAnujayaPct(preset.anujaya);
    setGlobalPct(preset.global);
  };

  return (
    <div className={`p-4 rounded-xl bg-slate-900/90 border ${borderClass} space-y-3`}>
      <div className={`text-xs font-bold ${accentClass} flex items-center gap-1.5`}>
        <Percent className="w-4 h-4" />
        <span>Consortium Profit Share Split</span>
        <span className="ml-auto text-slate-400 font-normal">
          Gross Profit: <span className="font-bold text-white">LKR {grossProfit.toLocaleString()}</span>
        </span>
      </div>

      {/* Preset buttons */}
      <div className="grid grid-cols-3 gap-2">
        {SPLIT_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => handlePreset(p)}
            className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition ${
              anujayaPct === p.anujaya && globalPct === p.global
                ? 'bg-cyan-600 border-cyan-500 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-cyan-700 hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Live breakdowns */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-800/60 space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-indigo-300">Anujaya Enterprises</span>
            <span className="font-mono text-xs">{anujayaPct}%</span>
          </div>
          <div className="text-base font-bold text-indigo-200">LKR {anujayaAmt.toLocaleString()}</div>
        </div>
        <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-emerald-300">Global Enterprises</span>
            <span className="font-mono text-xs">{globalPct}%</span>
          </div>
          <div className="text-base font-bold text-emerald-200">LKR {globalAmt.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
};

// ── Custom Terms Editor (shared by BUY & RENT) ──────────────────────────────
const TermsEditor = ({ terms, setTerms, accentColor = 'amber' }) => {
  const [input, setInput] = useState('');
  const add = () => {
    if (input.trim()) { setTerms([...terms, input.trim()]); setInput(''); }
  };
  const remove = (i) => setTerms(terms.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-slate-300">
        Custom Terms &amp; Conditions (Editable on Document)
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); }}}
          placeholder="Add custom clause…"
          className="flex-1 glass-input px-3.5 py-2 rounded-xl text-xs"
        />
        <button
          type="button"
          onClick={add}
          className={`px-3 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-${accentColor}-400 border border-${accentColor}-800`}
        >
          + Add
        </button>
      </div>
      <div className="space-y-1.5 pt-1 max-h-32 overflow-y-auto pr-1">
        {terms.map((term, i) => (
          <div key={i} className="flex items-start justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 gap-2">
            <span>• {term}</span>
            <button type="button" onClick={() => remove(i)} className="text-slate-500 hover:text-rose-400 shrink-0 mt-0.5">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main DispatchModal ──────────────────────────────────────────────────────
export const DispatchModal = ({ machine, customers = [], onClose, onSuccess, onPrint }) => {
  const { t } = useAuth();
  const { addToast } = useToast();

  const [dispatchType, setDispatchType] = useState('BUY');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [serialInput, setSerialInput] = useState('');
  const [serialNumbers, setSerialNumbers] = useState([]);
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryCharges, setDeliveryCharges] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);

  // BUY
  const [benchmarkType, setBenchmarkType] = useState('Wholesale');
  const [unitPrice, setUnitPrice] = useState(machine?.wholesaleBenchmark || 0);
  const [taxIncluded, setTaxIncluded] = useState(false);
  const [taxPercent, setTaxPercent] = useState(5);
  const [paidAmountBuy, setPaidAmountBuy] = useState(0);
  const [paymentTermsBuy, setPaymentTermsBuy] = useState('Bank Wire/SLIPS');
  const [paymentRefBuy, setPaymentRefBuy] = useState('');
  const [anujayaSplitBuy, setAnujayaSplitBuy] = useState(50);
  const [globalSplitBuy, setGlobalSplitBuy] = useState(50);
  const [buyTerms, setBuyTerms] = useState([
    '12 Months Consortium Technical & Drive Motor Warranty on all apparel units.',
    'Bank Beneficiary: Commercial Bank of Ceylon PLC / Account # 1000847291.',
    'Goods once sold are backed by consortium genuine replacement parts.',
  ]);

  // RENT
  const [durationMonths, setDurationMonths] = useState(3);
  const [rentPricePerMonth, setRentPricePerMonth] = useState(machine?.rentPricePerMonth || 0);
  const [hasKeyMoney, setHasKeyMoney] = useState(true);
  const [keyMoneyAmount, setKeyMoneyAmount] = useState(50000);
  const [keyMoneyPaidAmount, setKeyMoneyPaidAmount] = useState(50000);
  const [firstTwoMonthsPaidAmount, setFirstTwoMonthsPaidAmount] = useState(0);
  const [paymentTermsRent, setPaymentTermsRent] = useState('Bank Wire/SLIPS');
  const [paymentRefRent, setPaymentRefRent] = useState('');
  const [anujayaSplitRent, setAnujayaSplitRent] = useState(50);
  const [globalSplitRent, setGlobalSplitRent] = useState(50);
  const [rentTerms, setRentTerms] = useState([
    'Machine must be operated with voltage surge protections.',
    'Consortium mechanics are entitled to monthly maintenance inspections.',
    'Returns exceeding the 5th day of a cycle incur full month rental charges.',
  ]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(customers[0]._id);
      setSelectedCustomer(customers[0]);
    }
  }, [customers]);

  useEffect(() => {
    if (benchmarkType === 'Wholesale') setUnitPrice(machine?.wholesaleBenchmark || 0);
    else if (benchmarkType === 'Retail') setUnitPrice(machine?.retailBenchmark || 0);
  }, [benchmarkType, machine]);

  const handleSelectCustomer = (cid) => {
    setSelectedCustomerId(cid);
    setSelectedCustomer(customers.find((c) => c._id === cid) || null);
  };

  const handleAddSerial = () => {
    if (serialInput.trim() && !serialNumbers.includes(serialInput.trim())) {
      setSerialNumbers([...serialNumbers, serialInput.trim()]);
      setSerialInput('');
    }
  };

  // ── Live calculations ──────────────────────────────────────────────────
  const qty = Number(quantity) || 1;
  const inWarehouse = Math.max(0, (machine?.initialBatchSets || 0) - (machine?.dispatched || 0));

  // BUY
  const subtotalBuy    = (Number(unitPrice) || 0) * qty;
  const taxAmountBuy   = taxIncluded ? (subtotalBuy * (Number(taxPercent) || 0)) / 100 : 0;
  const totalAmountBuy = subtotalBuy + taxAmountBuy + (Number(deliveryCharges) || 0) + (Number(otherCharges) || 0);
  const outstandingBuy = Math.max(0, totalAmountBuy - (Number(paidAmountBuy) || 0));
  const cogsBuy        = (machine?.landedUnitCost || 0) * qty;
  const grossProfitBuy = Math.max(0, totalAmountBuy - cogsBuy - (Number(deliveryCharges) || 0) - (Number(otherCharges) || 0));

  // RENT
  const totalRentValue      = (Number(durationMonths) || 1) * (Number(rentPricePerMonth) || 0) * qty;
  const first2MonthsReq     = (Number(rentPricePerMonth) || 0) * Math.min(2, Number(durationMonths) || 1) * qty;
  const totalRentPayable    = totalRentValue + (hasKeyMoney ? Number(keyMoneyAmount) || 0 : 0) + (Number(deliveryCharges) || 0);
  const totalRentPaidInit   = (hasKeyMoney ? Number(keyMoneyPaidAmount) || 0 : 0) + (Number(firstTwoMonthsPaidAmount) || 0);
  const outstandingRent     = Math.max(0, totalRentPayable - totalRentPaidInit);
  // Rent profit = total actually collected at dispatch
  const grossProfitRent     = totalRentPaidInit;

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId) { addToast('error', 'Please select a customer'); return; }
    if (qty > inWarehouse)   { addToast('error', `Only ${inWarehouse} sets available in warehouse!`); return; }

    setLoading(true);
    try {
      const payload = {
        transactionType: dispatchType,
        customerId: selectedCustomerId,
        machineryId: machine._id,
        quantity: qty,
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
          profitSplitPercent: { anujayaPercent: anujayaSplitBuy, globalPercent: globalSplitBuy },
          termsAndConditions: buyTerms,
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
          profitSplitPercent: { anujayaPercent: anujayaSplitRent, globalPercent: globalSplitRent },
          termsAndConditions: rentTerms,
        };
      }

      const res = await api.createTransaction(payload);
      if (res.success && res.transaction) {
        addToast('success', `Dispatch #${res.transaction.invoiceNumber} processed!`);
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        if (onSuccess) onSuccess(res.transaction);
        if (onPrint)   onPrint(res.transaction, dispatchType === 'BUY' ? 'INVOICE' : 'AGREEMENT');
      } else {
        addToast('error', res.message || 'Dispatch failed');
      }
    } catch (err) {
      addToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const paymentTermsOptions = [
    { value: 'Bank Wire/SLIPS', label: 'Bank Wire / SLIPS' },
    { value: 'Corporate Cheque', label: 'Corporate Cheque' },
    { value: 'COD', label: 'COD (Cash on Delivery)' },
    { value: 'Letter of Credit (LC)', label: 'Letter of Credit (LC)' },
    { value: '30-Day Credit', label: '30-Day Corporate Credit' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-start justify-center p-2 sm:p-4">
      <div className="relative w-full max-w-3xl glass-dropdown rounded-2xl border border-slate-700/80 shadow-2xl p-4 sm:p-6 my-4 sm:my-8 text-slate-100">

        {/* ── Header ── */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3 mb-4 gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 shrink-0">
                {machine?.sku}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                {t('dispatchSales')}: {machine?.brand} {machine?.model}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              In Warehouse: <span className="font-bold text-emerald-400">{inWarehouse} SETS</span>
              &nbsp;•&nbsp; Landed Cost: LKR {Number(machine?.landedUnitCost || 0).toLocaleString()}
              {machine?.ownershipType === 'THIRD_PARTY_ASSET' && (
                <span className="ml-2 text-amber-400 font-semibold">
                  [3rd-Party: {machine.thirdPartyCompany}]
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── BUY / RENT Toggle ── */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-900 rounded-xl border border-slate-800 mb-4">
          {[
            { type: 'BUY',  icon: ShoppingCart, label: 'Path 1: Direct Sale (BUY)',        cls: 'from-cyan-600 to-blue-600' },
            { type: 'RENT', icon: Calendar,     label: 'Path 2: Rental Agreement (RENT)',  cls: 'from-amber-600 to-emerald-600' },
          ].map(({ type, icon: Icon, label, cls }) => (
            <button
              key={type}
              type="button"
              onClick={() => setDispatchType(type)}
              className={`py-2.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition ${
                dispatchType === type
                  ? `bg-gradient-to-r ${cls} text-white shadow-lg`
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{type}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── Customer Selection ── */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <User className="w-4 h-4 text-cyan-400" />
                <span>{t('selectClient')}</span>
              </label>
              <span className="text-[10px] text-slate-500">Auto-fills contact &amp; region</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={selectedCustomerId}
                onChange={(e) => handleSelectCustomer(e.target.value)}
                className="w-full glass-input px-3 py-2.5 rounded-xl text-xs"
                required
              >
                <option value="" disabled className="bg-slate-900">-- Select Apparel Customer --</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id} className="bg-slate-900 text-white">
                    {c.name} ({c.cid})
                  </option>
                ))}
              </select>
              {selectedCustomer && (
                <div className="text-xs text-slate-400 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-0.5">
                  <div><span className="font-semibold text-slate-200">Phone:</span> {selectedCustomer.phone}</div>
                  <div><span className="font-semibold text-slate-200">Region:</span> {selectedCustomer.region}</div>
                  <div className="truncate"><span className="font-semibold text-slate-200">Address:</span> {selectedCustomer.address}</div>
                </div>
              )}
            </div>
          </div>

          {/* ── Common: Qty / Date / Delivery ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">{t('quantity')}</label>
              <input
                type="number" min="1" max={inWarehouse} value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs font-bold" required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Dispatch Date</label>
              <input
                type="date" value={dispatchDate}
                onChange={(e) => setDispatchDate(e.target.value)}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs" required
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-400 mb-1">{t('deliveryFee')} (LKR)</label>
              <input
                type="number" min="0" value={deliveryCharges}
                onChange={(e) => setDeliveryCharges(Number(e.target.value))}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* ── Serial Numbers ── */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <label className="block text-xs font-semibold text-slate-300">{t('serialNumbers')}</label>
            <div className="flex gap-2">
              <input
                type="text" value={serialInput}
                onChange={(e) => setSerialInput(e.target.value)}
                placeholder="e.g. JK-8700-449 — press Enter or Add"
                className="flex-1 glass-input px-3 py-2 rounded-xl text-xs"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSerial(); }}}
              />
              <button type="button" onClick={handleAddSerial}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-400 border border-cyan-800">
                Add
              </button>
            </div>
            {serialNumbers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {serialNumbers.map((s, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 text-xs font-mono border border-cyan-800">
                    {s}
                    <button type="button" onClick={() => setSerialNumbers(serialNumbers.filter((_, i) => i !== idx))}
                      className="text-cyan-400 hover:text-rose-400">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ══════════════ PATH 1: BUY ══════════════ */}
          {dispatchType === 'BUY' && (
            <div className="space-y-4 p-4 sm:p-5 rounded-2xl bg-cyan-950/20 border border-cyan-500/20">
              <div className="flex items-center justify-between border-b border-cyan-900/60 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4" />
                  Sales &amp; Profit Configuration
                </h3>
                <span className="text-[10px] text-slate-400">Direct Equipment Purchase</span>
              </div>

              {/* Benchmark / Unit Price / Other Charges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Price Benchmark</label>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800">
                    {['Wholesale', 'Retail', 'Custom'].map((b) => (
                      <button key={b} type="button" onClick={() => setBenchmarkType(b)}
                        className={`col-span-1 py-1.5 text-[11px] font-semibold rounded-lg transition ${
                          benchmarkType === b ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                        } ${b === 'Custom' ? 'col-span-2' : ''}`}>
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">{t('unitPrice')} (LKR)</label>
                  <input type="number" value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-bold" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">{t('otherCharges')} (LKR)</label>
                  <input type="number" min="0" value={otherCharges} onChange={(e) => setOtherCharges(Number(e.target.value))}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs" />
                </div>
              </div>

              {/* Tax */}
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                  <input type="checkbox" checked={taxIncluded} onChange={(e) => setTaxIncluded(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-600 bg-slate-900 border-slate-700" />
                  {t('taxIncluded')}
                </label>
                {taxIncluded && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    VAT / Tax (%):
                    <input type="number" value={taxPercent} onChange={(e) => setTaxPercent(Number(e.target.value))}
                      className="w-16 glass-input px-2.5 py-1 rounded-lg text-xs font-bold" />
                  </div>
                )}
              </div>

              {/* Payment */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">{t('paymentTerms')}</label>
                  <select value={paymentTermsBuy} onChange={(e) => setPaymentTermsBuy(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs">
                    {paymentTermsOptions.map(o => <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Paid Amount (LKR)</label>
                  <input type="number" value={paidAmountBuy} onChange={(e) => setPaidAmountBuy(Number(e.target.value))}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-bold text-emerald-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">{t('paymentRef')}</label>
                  <input type="text" value={paymentRefBuy} onChange={(e) => setPaymentRefBuy(e.target.value)}
                    placeholder="e.g. SLIP-9921"
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs" />
                </div>
              </div>

              {/* Profit Split (3-option presets) */}
              <ProfitSplitSelector
                grossProfit={grossProfitBuy}
                anujayaPct={anujayaSplitBuy} setAnujayaPct={setAnujayaSplitBuy}
                globalPct={globalSplitBuy}   setGlobalPct={setGlobalSplitBuy}
                accentClass="text-cyan-400"
                borderClass="border-cyan-900/60"
              />

              {/* T&C */}
              <TermsEditor terms={buyTerms} setTerms={setBuyTerms} accentColor="cyan" />
            </div>
          )}

          {/* ══════════════ PATH 2: RENT ══════════════ */}
          {dispatchType === 'RENT' && (
            <div className="space-y-4 p-4 sm:p-5 rounded-2xl bg-amber-950/20 border border-amber-500/20">
              <div className="flex items-center justify-between border-b border-amber-900/60 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  Rental Agreement Configuration
                </h3>
                <span className="text-[10px] text-slate-400">Monthly Machinery Rental</span>
              </div>

              {/* Duration / Monthly rate / Total */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">{t('durationMonths')}</label>
                  <input type="number" min="1" value={durationMonths} onChange={(e) => setDurationMonths(Number(e.target.value))}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-bold" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">{t('rentPrice')} /mo (LKR)</label>
                  <input type="number" value={rentPricePerMonth} onChange={(e) => setRentPricePerMonth(Number(e.target.value))}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-bold" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Total Rent Value</label>
                  <div className="glass-input px-3 py-2 rounded-xl text-xs font-bold text-cyan-300">
                    LKR {totalRentValue.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Key Money */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                    <input type="checkbox" checked={hasKeyMoney} onChange={(e) => setHasKeyMoney(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700" />
                    {t('keyMoney')}
                  </label>
                  <span className="text-[10px] text-slate-500">Refundable Security Deposit</span>
                </div>
                {hasKeyMoney && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] text-slate-400">Deposit Amount (LKR):</span>
                      <input type="number" value={keyMoneyAmount} onChange={(e) => setKeyMoneyAmount(Number(e.target.value))}
                        className="w-full glass-input px-3 py-1.5 rounded-lg text-xs font-bold mt-1" />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400">Deposit Paid (LKR):</span>
                      <input type="number" value={keyMoneyPaidAmount} onChange={(e) => setKeyMoneyPaidAmount(Number(e.target.value))}
                        className="w-full glass-input px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-400 mt-1" />
                    </div>
                  </div>
                )}
              </div>

              {/* Advance + Payment Terms */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    First 2 Months Advance Paid (LKR)
                  </label>
                  <input type="number" value={firstTwoMonthsPaidAmount}
                    onChange={(e) => setFirstTwoMonthsPaidAmount(Number(e.target.value))}
                    placeholder={`Required: LKR ${first2MonthsReq.toLocaleString()}`}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-bold text-emerald-400" />
                  <div className="text-[10px] text-slate-500 mt-1">Expected 2-month advance: LKR {first2MonthsReq.toLocaleString()}</div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">{t('paymentTerms')}</label>
                  <select value={paymentTermsRent} onChange={(e) => setPaymentTermsRent(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs">
                    {paymentTermsOptions.map(o => <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>)}
                  </select>
                  <div className="mt-2">
                    <input type="text" value={paymentRefRent} onChange={(e) => setPaymentRefRent(e.target.value)}
                      placeholder="Payment Reference (e.g. SLIP-9921)"
                      className="w-full glass-input px-3 py-1.5 rounded-lg text-xs" />
                  </div>
                </div>
              </div>

              {/* 5th-Day Rule notice */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong>{t('returnRuleNotice')}</strong>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Automated alerts fire 7 days, 3 days, Due Today, and Overdue via email &amp; dashboard.
                  </p>
                </div>
              </div>

              {/* Profit Split (3-option presets) */}
              <ProfitSplitSelector
                grossProfit={grossProfitRent}
                anujayaPct={anujayaSplitRent} setAnujayaPct={setAnujayaSplitRent}
                globalPct={globalSplitRent}   setGlobalPct={setGlobalSplitRent}
                accentClass="text-amber-400"
                borderClass="border-amber-900/60"
              />

              {/* T&C */}
              <TermsEditor terms={rentTerms} setTerms={setRentTerms} accentColor="amber" />
            </div>
          )}

          {/* ── Checkout Summary Bar ── */}
          <div className="p-4 rounded-xl glass-card border border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-400">Total Transaction Value:</div>
              <div className="text-xl sm:text-2xl font-black text-white">
                LKR {(dispatchType === 'BUY' ? totalAmountBuy : totalRentPayable).toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Outstanding: <span className="font-bold text-rose-400">
                  LKR {(dispatchType === 'BUY' ? outstandingBuy : outstandingRent).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button type="button" onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition">
                {t('cancel')}
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-500 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xl shadow-cyan-500/25 transition disabled:opacity-50">
                <CheckCircle2 className="w-4 h-4" />
                <span>{loading ? 'Processing…' : 'Confirm Dispatch & Generate Document'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
