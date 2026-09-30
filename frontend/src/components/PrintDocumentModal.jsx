import React from 'react';
import { Printer, X, Download, ShieldCheck } from 'lucide-react';

export const PrintDocumentModal = ({ docType, data, onClose }) => {
  if (!data) return null;

  const handlePrint = () => {
    window.print();
  };

  const isBuy = data.transactionType === 'BUY' || docType === 'INVOICE';
  const isRent = data.transactionType === 'RENT' || docType === 'AGREEMENT';
  const isDelivery = docType === 'DELIVERY_NOTE';
  const isReturn = docType === 'RETURN_NOTE';
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

  const docNumber = data.invoiceNumber || data.agreementNumber || `DOC-${Date.now().toString().slice(-6)}`;
  const customer = data.customerSnapshot || data.customer || {};
  const machine = data.machinerySnapshot || data.machinery || {};
  const serials = data.serialNumbers || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Top Floating Action Bar (hidden in print) */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3 no-print">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm shadow-xl shadow-cyan-500/30 transition cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Save as PDF</span>
        </button>
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Printable Sheet (Standard A4 / Letter) */}
      <div className="printable-document w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-2xl p-8 md:p-12 my-8 border border-slate-200">
        {/* Consortium Header */}
        <div className="border-b-2 border-slate-900 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-widest uppercase px-2 py-0.5 bg-slate-900 text-white rounded">
                CONSORTIUM
              </span>
              <span className="text-xs font-bold text-cyan-800 tracking-wider">
                APPAREL MACHINERY ALLIANCE
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-950 mt-1">
              ANUJAYA & GLOBAL ENTERPRISES
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Industrial Sewing Machinery, Automated Cutters & Apparel Production Solutions
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Katunayake Export Processing Zone & Textile Hub, Colombo, Sri Lanka • Phone: +94 11 234 5678 / +94 77 123 4567
            </p>
          </div>

          <div className="text-right">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tax Registration / VAT</div>
            <div className="text-xs font-semibold text-slate-800">VAT-102938475-7000 / SVAT-09281</div>
            <div className="mt-2 inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900">
              {docNumber}
            </div>
          </div>
        </div>

        {/* Document Title Banner */}
        <div className="my-6 py-2 px-4 bg-slate-900 text-white rounded-lg flex items-center justify-between">
          <span className="font-bold tracking-wide text-sm md:text-base">{documentTitle}</span>
          <span className="text-xs text-slate-300">
            Date: {new Date(data.dispatchDate || data.createdAt || Date.now()).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>

        {/* Client & Dispatch Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div>
            <div className="font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-1">
              Customer / Apparel Client
            </div>
            <div className="text-sm font-bold text-slate-900">{customer.name || 'Valued Apparel Client'}</div>
            <div className="text-slate-600 mt-1">
              <span className="font-semibold text-slate-800">Customer ID:</span> {customer.cid || 'CUST-N/A'}
            </div>
            <div className="text-slate-600">
              <span className="font-semibold text-slate-800">Phone:</span> {customer.phone || 'N/A'}
            </div>
            <div className="text-slate-600">
              <span className="font-semibold text-slate-800">Region:</span> {customer.region || 'N/A'}
            </div>
            <div className="text-slate-600">
              <span className="font-semibold text-slate-800">Delivery Address:</span> {customer.address || 'N/A'}
            </div>
          </div>

          <div className="space-y-1 md:border-l md:border-slate-200 md:pl-6">
            <div className="font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-1">
              Consortium Dispatch Details
            </div>
            <div>
              <span className="font-semibold text-slate-800">Transaction Type:</span>{' '}
              <span className="font-bold uppercase text-cyan-900">{data.transactionType || 'COMMERCIAL'}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-800">Delivery Status:</span>{' '}
              <span className="font-bold text-slate-900">{data.deliveryStatus || 'Pending'}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-800">Payment Terms:</span>{' '}
              {isBuy ? data.buyDetails?.paymentTerms : data.rentDetails?.paymentTerms || 'Bank Wire'}
            </div>
            {data.buyDetails?.paymentReference || data.rentDetails?.paymentReference ? (
              <div>
                <span className="font-semibold text-slate-800">Reference:</span>{' '}
                {data.buyDetails?.paymentReference || data.rentDetails?.paymentReference}
              </div>
            ) : null}
            {isRent && (
              <div>
                <span className="font-semibold text-slate-800">Agreement Term:</span>{' '}
                {data.rentDetails?.durationMonths || 1} Months (Monthly Rent: LKR{' '}
                {Number(data.rentDetails?.rentPricePerMonth || 0).toLocaleString()})
              </div>
            )}
          </div>
        </div>

        {/* Equipment & Specification Table */}
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3">Item / SKU</th>
                <th className="p-3">Brand & Model Specifications</th>
                <th className="p-3 text-center">Qty</th>
                <th className="p-3 text-right">Unit Rate (LKR)</th>
                <th className="p-3 text-right">Total Amount (LKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              <tr>
                <td className="p-3 font-mono font-bold text-slate-900">{machine.sku || 'M-01'}</td>
                <td className="p-3">
                  <div className="font-bold text-slate-950">
                    {machine.brand} {machine.model}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Ownership:{' '}
                    {machine.ownershipType === 'THIRD_PARTY_ASSET'
                      ? `Third-Party Partner (${machine.thirdPartyCompany})`
                      : 'Anujaya & Global Consortium Fleet'}
                  </div>
                </td>
                <td className="p-3 text-center font-bold">{data.quantity || 1} SETS</td>
                <td className="p-3 text-right font-medium">
                  {isBuy
                    ? Number(data.buyDetails?.unitPrice || 0).toLocaleString()
                    : `${Number(data.rentDetails?.rentPricePerMonth || 0).toLocaleString()} /mo`}
                </td>
                <td className="p-3 text-right font-bold text-slate-950">
                  {isBuy
                    ? Number(data.buyDetails?.subtotal || (data.buyDetails?.unitPrice || 0) * (data.quantity || 1)).toLocaleString()
                    : Number(data.rentDetails?.totalRentValue || 0).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Assigned Serial Numbers Asset Audit */}
        <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
          <span className="font-bold text-slate-700">Tracked Asset Serial Numbers: </span>
          <span className="font-mono text-cyan-900 font-semibold">
            {serials.length > 0 ? serials.join(', ') : 'Assigned from stock fleet upon delivery dispatch'}
          </span>
        </div>

        {/* Financial Summary & Settlement Box */}
        <div className="mt-6 flex flex-col md:flex-row justify-between items-start gap-6">
          {/* Terms & Warranty Clauses */}
          <div className="flex-1 text-[11px] text-slate-600 space-y-1.5 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
              Terms of Agreement & Operational Warranty
            </div>
            {isRent ? (
              <>
                <p>• <strong>Flexible Return Engine:</strong> Machine return exceeding the monthly cycle past the 5th day will be billed for the full month; early return waives remaining months.</p>
                <p>• <strong>Key Money Deposit:</strong> LKR {Number(data.rentDetails?.keyMoneyAmount || 0).toLocaleString()} is held as refundable equipment security.</p>
                <p>• <strong>Technical Support:</strong> Consortium mechanics provide regular servicing and priority breakdown repairs.</p>
              </>
            ) : (
              <>
                <p>• <strong>Warranty:</strong> 12 Months Consortium Technical & Drive Motor Warranty on all apparel units.</p>
                <p>• <strong>Bank Beneficiary:</strong> Commercial Bank of Ceylon PLC / Account # 1000847291 / Anujaya Enterprises.</p>
                <p>• Goods once sold remain backed by consortium genuine replacement parts.</p>
              </>
            )}
          </div>

          {/* Pricing Totals */}
          <div className="w-full md:w-72 space-y-2 text-xs">
            {isBuy ? (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold">LKR {Number(data.buyDetails?.subtotal || 0).toLocaleString()}</span>
                </div>
                {data.buyDetails?.taxIncluded && (
                  <div className="flex justify-between text-slate-600">
                    <span>Tax ({data.buyDetails?.taxPercent}%):</span>
                    <span className="font-semibold">LKR {Number(data.buyDetails?.taxAmount || 0).toLocaleString()}</span>
                  </div>
                )}
                {data.deliveryCharges > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery Charges:</span>
                    <span className="font-semibold">LKR {Number(data.deliveryCharges).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-300 pt-2">
                  <span>Total Amount:</span>
                  <span>LKR {Number(data.buyDetails?.totalAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Amount Paid:</span>
                  <span>LKR {Number(data.buyDetails?.paidAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-rose-700 font-bold border-t border-slate-200 pt-1">
                  <span>Outstanding Balance:</span>
                  <span>LKR {Number(data.buyDetails?.outstandingAmount || 0).toLocaleString()}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>Total Rental ({data.rentDetails?.durationMonths || 1} Mo):</span>
                  <span className="font-semibold">LKR {Number(data.rentDetails?.totalRentValue || 0).toLocaleString()}</span>
                </div>
                {data.rentDetails?.hasKeyMoney && (
                  <div className="flex justify-between text-slate-600">
                    <span>Key Money Deposit:</span>
                    <span className="font-semibold">LKR {Number(data.rentDetails?.keyMoneyAmount || 0).toLocaleString()}</span>
                  </div>
                )}
                {data.deliveryCharges > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery Charges:</span>
                    <span className="font-semibold">LKR {Number(data.deliveryCharges).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-300 pt-2">
                  <span>Total Payable:</span>
                  <span>LKR {Number(data.rentDetails?.totalRentalPayable || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Total Paid to Date:</span>
                  <span>LKR {Number(data.rentDetails?.totalRentalPaid || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-rose-700 font-bold border-t border-slate-200 pt-1">
                  <span>Outstanding Rental:</span>
                  <span>LKR {Number(data.rentDetails?.outstandingRentalBalance || 0).toLocaleString()}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Return Details Section if Return Note */}
        {isReturn && (
          <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1">
            <div className="font-bold text-sm text-amber-900">Return Settlement Calculation (5th-Day Rule Engine):</div>
            <div>• Actual Months Billed: <strong>{data.rentDetails?.monthsBilled} Months</strong></div>
            <div>• Early Return Waived Months: <strong>{data.rentDetails?.monthsWaived} Months</strong></div>
            <div>• Return Condition Notes: {data.rentDetails?.returnNotes || 'Inspected and certified in order.'}</div>
            <div>• Recorded By: {data.rentDetails?.returnRecordedBy || 'Consortium Staff'}</div>
          </div>
        )}

        {/* Official Consortium Signatures and Seals */}
        <div className="mt-12 pt-8 border-t-2 border-slate-200 grid grid-cols-3 gap-6 text-center text-xs">
          <div className="space-y-12">
            <div className="h-10 flex items-center justify-center font-serif text-slate-400 italic">
              Authorized Signature
            </div>
            <div className="border-t border-slate-400 pt-1 font-semibold text-slate-800">
              Anujaya Enterprises
              <div className="text-[10px] text-slate-500 font-normal">Managing Director / Partner</div>
            </div>
          </div>

          <div className="space-y-12">
            <div className="h-10 flex items-center justify-center font-serif text-slate-400 italic">
              Authorized Signature
            </div>
            <div className="border-t border-slate-400 pt-1 font-semibold text-slate-800">
              Global Enterprises
              <div className="text-[10px] text-slate-500 font-normal">Executive Consortium Partner</div>
            </div>
          </div>

          <div className="space-y-12">
            <div className="h-10 flex items-center justify-center font-serif text-slate-400 italic">
              Authorized Signature & Seal
            </div>
            <div className="border-t border-slate-400 pt-1 font-semibold text-slate-800">
              Customer / Lessee
              <div className="text-[10px] text-slate-500 font-normal">Received in Good Order</div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center text-[10px] text-slate-400">
          This is an official commercial document generated by Jukiapp ERP System for Anujaya & Global Enterprises Consortium.
        </div>
      </div>
    </div>
  );
};
