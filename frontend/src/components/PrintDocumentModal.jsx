import React from 'react';
import { Printer, X } from 'lucide-react';

const fmt = (n) => Number(n || 0).toLocaleString();
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const PrintDocumentModal = ({ docType, data, onClose }) => {
  if (!data) return null;

  const handlePrint = () => { window.print(); };

  const isBuy      = data.transactionType === 'BUY'  || docType === 'INVOICE';
  const isRent     = data.transactionType === 'RENT'  || docType === 'AGREEMENT';
  const isDelivery = docType === 'DELIVERY_NOTE';
  const isReturn   = docType === 'RETURN_NOTE';
  const isStatement = docType === 'CUSTOMER_STATEMENT';

  const documentTitle = isDelivery
    ? 'EQUIPMENT DELIVERY & HANDOVER NOTE'
    : isReturn
    ? 'MACHINERY RETURN & RECONCILIATION NOTE'
    : isStatement
    ? 'CUSTOMER ACCOUNT RUNNING STATEMENT'
    : isBuy
    ? 'COMMERCIAL SALES INVOICE'
    : 'MACHINERY RENTAL & SERVICE AGREEMENT';

  const docNumber  = data.invoiceNumber || data.agreementNumber || `DOC-${Date.now().toString().slice(-6)}`;
  const customer   = data.customerSnapshot || (typeof data.customer === 'object' ? data.customer : {}) || {};
  const machine    = data.machinerySnapshot || (typeof data.machinery === 'object' ? data.machinery : {}) || {};
  const serials    = data.serialNumbers || [];
  const dispatchDateStr = new Date(data.dispatchDate || data.createdAt || Date.now()).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  /* ── CUSTOMER STATEMENT sub-render ─────────────────────────────────── */
  const renderStatement = () => {
    const sd = data.statementData || {};
    const stats = sd.stats || {};
    const purchased = sd.purchasedMachines || [];
    const rented = sd.rentedMachines || [];
    const allSerials = sd.allSerialNumbers || [];

    return (
      <>
        {/* Customer Info */}
        <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs mb-4">
          <div className="space-y-0.5">
            <div className="font-bold text-slate-500 uppercase tracking-wider text-[9px] mb-1">Account Holder</div>
            <div className="text-sm font-bold text-slate-900">{customer.name || '—'}</div>
            <div className="text-slate-600"><span className="font-semibold text-slate-800">CID:</span> {customer.cid || '—'}</div>
            <div className="text-slate-600"><span className="font-semibold text-slate-800">Phone:</span> {customer.phone || '—'}</div>
            <div className="text-slate-600"><span className="font-semibold text-slate-800">Region:</span> {customer.region || '—'}</div>
            <div className="text-slate-600"><span className="font-semibold text-slate-800">Address:</span> {customer.address || '—'}</div>
          </div>
          <div className="space-y-0.5 border-l border-slate-200 pl-4">
            <div className="font-bold text-slate-500 uppercase tracking-wider text-[9px] mb-1">Account Summary</div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Previous Balance:</span>
              <span className="font-semibold">LKR {fmt(stats.previousBalance)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">New Charges (Invoiced):</span>
              <span className="font-semibold">LKR {fmt(stats.totalCharges)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Total Payments Received:</span>
              <span className="font-semibold text-emerald-700">LKR {fmt(stats.totalPaymentsReceived)}</span>
            </div>
            <div className="flex justify-between text-xs border-t border-slate-200 pt-1 mt-1">
              <span className="font-bold text-slate-800">Running Balance:</span>
              <span className="font-black text-rose-700">LKR {fmt(stats.runningBalance)}</span>
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5">Prev + Charges − Payments</div>
            <div className="flex justify-between text-xs mt-2 pt-1 border-t border-slate-200">
              <span className="text-slate-600">Total Profit Contributed:</span>
              <span className="font-bold text-emerald-700">LKR {fmt(stats.totalProfitContributed)}</span>
            </div>
          </div>
        </div>

        {/* Purchased Machines */}
        {purchased.length > 0 && (
          <div className="mb-4">
            <div className="font-bold text-slate-800 text-[10px] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 inline-block shrink-0"></span>
              Purchased Machinery ({purchased.length} Commercial Orders)
            </div>
            <table className="w-full text-left text-[10px] border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-100 text-slate-600 font-bold">
                <tr>
                  <th className="p-2">Invoice #</th>
                  <th className="p-2">Date</th>
                  <th className="p-2">Brand / Model</th>
                  <th className="p-2 text-center">Qty</th>
                  <th className="p-2 text-right">Total</th>
                  <th className="p-2 text-right">Paid</th>
                  <th className="p-2 text-right">Outstanding</th>
                  <th className="p-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {purchased.map((m, idx) => (
                  <tr key={idx}>
                    <td className="p-2 font-mono font-bold text-cyan-700">{m.invoiceNumber}</td>
                    <td className="p-2">{fmtDate(m.date)}</td>
                    <td className="p-2 font-semibold">{m.brand} {m.machinery}</td>
                    <td className="p-2 text-center">{m.quantity}</td>
                    <td className="p-2 text-right">LKR {fmt(m.totalAmount)}</td>
                    <td className="p-2 text-right text-emerald-700">LKR {fmt(m.paidAmount)}</td>
                    <td className="p-2 text-right text-rose-700">
                      LKR {fmt(Math.max(0, (m.totalAmount || 0) - (m.paidAmount || 0)))}
                    </td>
                    <td className="p-2 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        m.status === 'Fully Paid' ? 'bg-emerald-100 text-emerald-700'
                        : m.status === 'Partial Payment' ? 'bg-sky-100 text-sky-700'
                        : 'bg-rose-100 text-rose-700'
                      }`}>{m.status || 'Pending'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Rented Machines */}
        {rented.length > 0 && (
          <div className="mb-4">
            <div className="font-bold text-slate-800 text-[10px] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shrink-0"></span>
              Rented Machinery ({rented.length} Active Agreements)
            </div>
            <table className="w-full text-left text-[10px] border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-100 text-slate-600 font-bold">
                <tr>
                  <th className="p-2">Agreement #</th>
                  <th className="p-2">Date</th>
                  <th className="p-2">Brand / Model</th>
                  <th className="p-2 text-center">Term</th>
                  <th className="p-2 text-right">Rate /Mo</th>
                  <th className="p-2 text-right">Total Payable</th>
                  <th className="p-2 text-right">Total Paid</th>
                  <th className="p-2 text-center">Return Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rented.map((m, idx) => (
                  <tr key={idx}>
                    <td className="p-2 font-mono font-bold text-amber-700">{m.agreementNumber}</td>
                    <td className="p-2">{fmtDate(m.date)}</td>
                    <td className="p-2 font-semibold">{m.brand} {m.machinery}</td>
                    <td className="p-2 text-center">{m.durationMonths} Mo</td>
                    <td className="p-2 text-right">LKR {fmt(m.monthlyRent)}</td>
                    <td className="p-2 text-right">LKR {fmt(m.totalRentalPayable)}</td>
                    <td className="p-2 text-right text-emerald-700">LKR {fmt(m.totalRentalPaid)}</td>
                    <td className="p-2 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        m.returnStatus === 'Returned' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-700'
                      }`}>{m.returnStatus || 'In Use'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Serial Numbers */}
        {allSerials.length > 0 && (
          <div className="mb-4 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px]">
            <span className="font-bold text-slate-700">Tracked Asset Serial Numbers: </span>
            <span className="font-mono text-cyan-800">{allSerials.join(' | ')}</span>
          </div>
        )}

        {/* Signature strip */}
        <div className="mt-6 pt-4 border-t-2 border-slate-200 grid grid-cols-2 gap-6 text-center text-[10px]">
          {['Anujaya & Global Enterprises\nAuthorised Signatory', 'Customer / Account Holder\nAcknowledged & Agreed'].map((label, i) => (
            <div key={i} className="space-y-5">
              <div className="h-6" />
              <div className="border-t border-slate-400 pt-1 font-semibold text-slate-700 whitespace-pre-line">{label}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 text-center text-[9px] text-slate-400">
          Official Account Statement — Anujaya &amp; Global Enterprises Consortium — {customer.cid} — Generated: {new Date().toLocaleDateString('en-GB')}
        </div>
      </>
    );
  };

  /* ── TRANSACTION DOCUMENT sub-render ───────────────────────────────── */
  const renderTransaction = () => (
    <>
      {/* Client & Dispatch Info */}
      <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
        <div className="space-y-0.5">
          <div className="font-bold text-slate-500 uppercase tracking-wider text-[9px] mb-1">Customer / Apparel Client</div>
          <div className="text-sm font-bold text-slate-900">{customer.name || 'Valued Apparel Client'}</div>
          <div className="text-slate-600"><span className="font-semibold text-slate-800">ID:</span> {customer.cid || 'CUST-N/A'}</div>
          <div className="text-slate-600"><span className="font-semibold text-slate-800">Phone:</span> {customer.phone || 'N/A'}</div>
          <div className="text-slate-600"><span className="font-semibold text-slate-800">Region:</span> {customer.region || 'N/A'}</div>
          <div className="text-slate-600"><span className="font-semibold text-slate-800">Address:</span> {customer.address || 'N/A'}</div>
        </div>
        <div className="space-y-0.5 border-l border-slate-200 pl-4">
          <div className="font-bold text-slate-500 uppercase tracking-wider text-[9px] mb-1">Consortium Dispatch Details</div>
          <div className="text-slate-700">
            <span className="font-semibold text-slate-800">Type:</span>{' '}
            <span className="font-bold uppercase text-cyan-900">{data.transactionType || 'COMMERCIAL'}</span>
          </div>
          <div className="text-slate-700">
            <span className="font-semibold text-slate-800">Delivery Status:</span>{' '}{data.deliveryStatus || 'Pending'}
          </div>
          <div className="text-slate-700">
            <span className="font-semibold text-slate-800">Payment Terms:</span>{' '}
            {isBuy ? (data.buyDetails?.paymentTerms || 'Bank Wire') : (data.rentDetails?.paymentTerms || 'Bank Wire')}
          </div>
          {(data.buyDetails?.paymentReference || data.rentDetails?.paymentReference) && (
            <div className="text-slate-700">
              <span className="font-semibold text-slate-800">Reference:</span>{' '}
              {data.buyDetails?.paymentReference || data.rentDetails?.paymentReference}
            </div>
          )}
          {isRent && (
            <div className="text-slate-700">
              <span className="font-semibold text-slate-800">Agreement Term:</span>{' '}
              {data.rentDetails?.durationMonths || 1} Months &nbsp;|&nbsp; LKR {Number(data.rentDetails?.rentPricePerMonth || 0).toLocaleString()}/mo
            </div>
          )}
          {isRent && data.rentDetails?.nextPaymentDueDate && (
            <div className="text-slate-700">
              <span className="font-semibold text-slate-800">Next Due Date:</span>{' '}
              {fmtDate(data.rentDetails.nextPaymentDueDate)}
            </div>
          )}
        </div>
      </div>

      {/* Equipment Table */}
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <th className="p-2.5">SKU</th>
              <th className="p-2.5">Brand &amp; Model</th>
              <th className="p-2.5 text-center">Qty</th>
              <th className="p-2.5 text-right">Unit Rate (LKR)</th>
              <th className="p-2.5 text-right">Amount (LKR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-800">
            <tr>
              <td className="p-2.5 font-mono font-bold text-slate-900">{machine.sku || 'M-N/A'}</td>
              <td className="p-2.5">
                <div className="font-bold text-slate-950">{machine.brand || ''} {machine.model || 'Industrial Machine'}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Ownership:{' '}
                  {machine.ownershipType === 'THIRD_PARTY_ASSET'
                    ? `Third-Party Partner (${machine.thirdPartyCompany || 'External'})`
                    : 'Anujaya & Global Consortium Fleet'}
                </div>
              </td>
              <td className="p-2.5 text-center font-bold">{data.quantity || 1} SETS</td>
              <td className="p-2.5 text-right font-medium">
                {isBuy
                  ? Number(data.buyDetails?.unitPrice || 0).toLocaleString()
                  : `${Number(data.rentDetails?.rentPricePerMonth || 0).toLocaleString()} /mo`}
              </td>
              <td className="p-2.5 text-right font-bold text-slate-950">
                {isBuy
                  ? Number(data.buyDetails?.subtotal || (data.buyDetails?.unitPrice || 0) * (data.quantity || 1)).toLocaleString()
                  : Number(data.rentDetails?.totalRentValue || 0).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Serial Numbers */}
      <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
        <span className="font-bold text-slate-700">Asset Serial Numbers: </span>
        <span className="font-mono text-cyan-900 font-semibold">
          {serials.length > 0 ? serials.join(', ') : 'Assigned from stock upon delivery'}
        </span>
      </div>

      {/* Financial Summary */}
      <div className="mt-4 flex flex-col sm:flex-row justify-between items-start gap-4">
        {/* Terms */}
        <div className="flex-1 text-[10px] text-slate-600 space-y-1 p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="font-bold text-slate-800 uppercase tracking-wider text-[9px] mb-1">Terms &amp; Warranty</div>
          {isRent ? (
            <>
              <p>• <strong>5th-Day Return Rule:</strong> Return after the 5th of a cycle = full month billed; before = month waived.</p>
              <p>• <strong>Key Money:</strong> LKR {Number(data.rentDetails?.keyMoneyAmount || 0).toLocaleString()} refundable security deposit held.</p>
              <p>• <strong>Maintenance:</strong> Consortium mechanics provide monthly servicing and priority breakdown support.</p>
              {(data.rentDetails?.termsAndConditions || []).slice(0, 3).map((t, i) => <p key={i}>• {t}</p>)}
            </>
          ) : (
            <>
              {(data.buyDetails?.termsAndConditions || []).length > 0
                ? (data.buyDetails.termsAndConditions).slice(0, 4).map((t, i) => <p key={i}>• {t}</p>)
                : (
                  <>
                    <p>• <strong>Warranty:</strong> 12 Months Consortium Technical &amp; Drive Motor Warranty on all apparel units.</p>
                    <p>• <strong>Bank Beneficiary:</strong> Commercial Bank of Ceylon PLC / Account # 1000847291 / Anujaya Enterprises.</p>
                    <p>• Goods once sold remain backed by consortium genuine replacement parts.</p>
                  </>
                )}
            </>
          )}
        </div>

        {/* Totals */}
        <div className="w-full sm:w-64 space-y-1.5 text-xs shrink-0">
          {isBuy ? (
            <>
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold">LKR {fmt(data.buyDetails?.subtotal)}</span>
              </div>
              {data.buyDetails?.taxIncluded && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax ({data.buyDetails?.taxPercent}%):</span>
                  <span className="font-semibold">LKR {fmt(data.buyDetails?.taxAmount)}</span>
                </div>
              )}
              {Number(data.deliveryCharges) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Delivery:</span>
                  <span className="font-semibold">LKR {Number(data.deliveryCharges).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-300 pt-1.5">
                <span>Total Amount:</span><span>LKR {fmt(data.buyDetails?.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Amount Paid:</span><span>LKR {fmt(data.buyDetails?.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-rose-700 font-bold border-t border-slate-200 pt-1">
                <span>Outstanding:</span><span>LKR {fmt(data.buyDetails?.outstandingAmount)}</span>
              </div>
              <div className="text-[10px] text-slate-500 pt-0.5">
                Status: <span className="font-semibold text-slate-700">{data.buyDetails?.settlementStatus || 'Pending'}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between text-slate-600">
                <span>Total Rental ({data.rentDetails?.durationMonths || 1} Mo):</span>
                <span className="font-semibold">LKR {fmt(data.rentDetails?.totalRentValue)}</span>
              </div>
              {data.rentDetails?.hasKeyMoney && (
                <div className="flex justify-between text-slate-600">
                  <span>Key Money Deposit:</span>
                  <span className="font-semibold">LKR {fmt(data.rentDetails?.keyMoneyAmount)}</span>
                </div>
              )}
              {Number(data.deliveryCharges) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Delivery:</span>
                  <span className="font-semibold">LKR {Number(data.deliveryCharges).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-300 pt-1.5">
                <span>Total Payable:</span><span>LKR {fmt(data.rentDetails?.totalRentalPayable)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Total Paid:</span><span>LKR {fmt(data.rentDetails?.totalRentalPaid)}</span>
              </div>
              <div className="flex justify-between text-rose-700 font-bold border-t border-slate-200 pt-1">
                <span>Outstanding:</span><span>LKR {fmt(data.rentDetails?.outstandingRentalBalance)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Return note section */}
      {isReturn && (
        <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1">
          <div className="font-bold text-sm text-amber-900">Return Settlement (5th-Day Rule Engine):</div>
          <div>• Months Billed: <strong>{data.rentDetails?.monthsBilled}</strong></div>
          <div>• Months Waived: <strong>{data.rentDetails?.monthsWaived}</strong></div>
          <div>• Condition: {data.rentDetails?.returnNotes || 'Inspected and certified in order.'}</div>
          <div>• Recorded By: {data.rentDetails?.returnRecordedBy || 'Consortium Staff'}</div>
        </div>
      )}

      {/* Signature strip */}
      <div className="mt-8 pt-6 border-t-2 border-slate-200 grid grid-cols-3 gap-4 text-center text-xs">
        {[
          'Anujaya Enterprises\nManaging Director / Partner',
          'Global Enterprises\nExecutive Consortium Partner',
          'Customer / Lessee\nReceived in Good Order',
        ].map((label, i) => (
          <div key={i} className="space-y-6">
            <div className="h-8" />
            <div className="border-t border-slate-400 pt-1 font-semibold text-slate-800 whitespace-pre-line text-[10px]">{label}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-5 text-center text-[9px] text-slate-400">
        Official document generated by Jukiapp ERP System &mdash; Anujaya &amp; Global Enterprises Consortium &mdash; {docNumber}
      </div>
    </>
  );

  /* ── Main Render ────────────────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-start justify-center p-4">

      {/* Floating action bar — hidden in print via .no-print */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3 no-print">
        <button onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm shadow-xl shadow-cyan-500/30 transition cursor-pointer">
          <Printer className="w-4 h-4" />
          <span>Print / Save as PDF</span>
        </button>
        <button onClick={onClose}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── PRINTABLE DOCUMENT SHEET ── */}
      <div className="printable-document w-full max-w-3xl bg-white text-slate-900 rounded-2xl shadow-2xl p-8 mt-14 mb-8 border border-slate-200">

        {/* Consortium Header */}
        <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-black tracking-widest uppercase px-2 py-0.5 bg-slate-900 text-white rounded">CONSORTIUM</span>
              <span className="text-[10px] font-bold text-cyan-800 tracking-wider">APPAREL MACHINERY ALLIANCE</span>
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-950">ANUJAYA &amp; GLOBAL ENTERPRISES</h1>
            <p className="text-[10px] text-slate-500 mt-0.5">Industrial Sewing Machinery, Automated Cutters &amp; Apparel Production Solutions</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Katunayake Export Processing Zone &amp; Textile Hub, Colombo, Sri Lanka &nbsp;•&nbsp; +94 11 234 5678 / +94 77 123 4567</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Tax Reg / VAT</div>
            <div className="text-[10px] font-semibold text-slate-700">VAT-102938475-7000 / SVAT-09281</div>
            <div className="mt-1 inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900">
              {isStatement ? (customer.cid || 'STMT') : docNumber}
            </div>
          </div>
        </div>

        {/* Document Title Banner */}
        <div className="print-dark-banner my-4 py-2 px-4 bg-slate-900 text-white rounded-lg flex items-center justify-between">
          <span className="font-bold tracking-wide text-sm">{documentTitle}</span>
          <span className="text-xs text-slate-300">
            {isStatement
              ? `Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
              : `Date: ${dispatchDateStr}`}
          </span>
        </div>

        {isStatement ? renderStatement() : renderTransaction()}
      </div>
    </div>
  );
};
