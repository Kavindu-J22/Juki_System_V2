import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  BarChart3, Printer, FileSpreadsheet, RefreshCw, Calendar,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n) => {
  const num = Number(n);
  if (isNaN(num)) return String(n ?? '');
  return num.toLocaleString();
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

const isDateLike = (val) => {
  if (typeof val !== 'string' && !(val instanceof Date)) return false;
  const d = new Date(val);
  return !isNaN(d.getTime()) && String(val).length >= 8;
};

const formatCellValue = (val) => {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'number') return val.toLocaleString();
  if (typeof val === 'object') {
    if (val instanceof Date) return fmtDate(val);
    return JSON.stringify(val);
  }
  if (typeof val === 'string' && isDateLike(val) && val.includes('T')) return fmtDate(val);
  return String(val);
};

const humanLabel = (key) =>
  key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()).trim();

// ── Main Component ─────────────────────────────────────────────────────────
export const ReportsView = () => {
  const { t } = useAuth();
  const { addToast } = useToast();
  const printRef = useRef(null);

  const [reportType, setReportType] = useState('PROFIT_EXPENSE_REPORT');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState([]);
  const [reportTitle, setReportTitle] = useState('');
  const [loading, setLoading] = useState(true);

  const reportTypes = [
    { id: 'PROFIT_EXPENSE_REPORT',    label: 'Consolidated Profit & Expense Report' },
    { id: 'DAILY_INCOME',             label: 'Daily Income & Collections' },
    { id: 'MONTHLY_INCOME',           label: 'Monthly Consolidated Income' },
    { id: 'CUSTOMER_PAYMENT_HISTORY', label: 'Customer Payment & Settlement Ledger' },
    { id: 'MACHINE_RENTAL_HISTORY',   label: 'Machine Rental History & Utilization' },
    { id: 'OUTSTANDING_PAYMENTS',     label: 'Outstanding Payments & Receivables' },
    { id: 'OVERDUE_CUSTOMERS',        label: 'Overdue Rental Accounts' },
    { id: 'MACHINE_UTILIZATION',      label: 'Consortium Fleet Inventory Utilization' },
  ];

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await api.getDetailedReport(reportType, { startDate, endDate });
      if (res.success) {
        setReportData(res.data || []);
        setReportTitle(res.reportTitle || 'Consortium Report');
      }
    } catch {
      addToast('error', 'Error fetching report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, [reportType, startDate, endDate]);

  // ── Print Handler — uses printRef div injected into DOM ─────────────────
  const handlePrint = () => {
    if (reportData.length === 0) {
      addToast('warning', 'No data to print.');
      return;
    }

    const dateRange = startDate || endDate
      ? `Period: ${startDate ? fmtDate(startDate) : 'All'} — ${endDate ? fmtDate(endDate) : 'All'}`
      : 'All Dates';
    const cols = Object.keys(reportData[0]);

    const tableRows = reportData.map((row) => {
      const isTotal = row.category && (
        String(row.category).toUpperCase().includes('TOTAL') ||
        String(row.category).toUpperCase().includes('NET')
      );
      const cells = cols.map((col) => {
        const val = row[col];
        const isNum = typeof val === 'number';
        const displayVal = formatCellValue(val);
        const color = isNum && val < 0 ? 'color:#dc2626;' : isNum && val > 0 && isTotal ? 'color:#16a34a;' : '';
        const align = isNum ? 'text-align:right;' : '';
        return `<td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;${align}${color}${isTotal ? 'font-weight:700;' : ''}">${displayVal}</td>`;
      }).join('');
      const rowBg = isTotal ? 'background:#f0fdf4;font-weight:700;' : '';
      return `<tr style="${rowBg}">${cells}</tr>`;
    }).join('');

    const headerCells = cols.map(
      (k) => `<th style="padding:8px 10px;background:#1e293b;color:#cbd5e1;font-size:10px;text-align:left;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;white-space:nowrap;">${humanLabel(k)}</th>`
    ).join('');

    const printHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${reportTitle} — Anujaya &amp; Global Enterprises</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; }
    @page { margin: 15mm 12mm; size: A4 landscape; }
    .header { border-bottom: 3px solid #1e293b; padding-bottom: 12px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end; }
    .logo-block .tag { font-size: 8px; font-weight: 900; letter-spacing: 0.15em; text-transform: uppercase; background: #1e293b; color: #fff; padding: 2px 6px; border-radius: 3px; display: inline-block; margin-bottom: 3px; }
    .logo-block h1 { font-size: 16px; font-weight: 900; }
    .logo-block p { font-size: 9px; color: #64748b; margin-top: 2px; }
    .doc-meta { text-align: right; font-size: 9px; color: #64748b; }
    .doc-meta .doc-num { font-size: 11px; font-weight: 700; color: #1e293b; margin-top: 4px; font-family: monospace; }
    .banner { background: #1e293b; color: #fff; padding: 8px 14px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .banner .title { font-size: 13px; font-weight: 700; letter-spacing: 0.02em; }
    .banner .meta { font-size: 10px; color: #94a3b8; }
    .summary-row { display: flex; gap: 16px; margin-bottom: 10px; flex-wrap: wrap; }
    .stat-box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 14px; min-width: 140px; flex: 1; }
    .stat-box .label { font-size: 9px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-box .value { font-size: 14px; font-weight: 800; color: #1e293b; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr th { border-bottom: 2px solid #334155; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    .footer { margin-top: 18px; border-top: 1px solid #e2e8f0; padding-top: 8px; text-align: center; font-size: 8.5px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-block">
      <span class="tag">Consortium</span>
      <h1>ANUJAYA &amp; GLOBAL ENTERPRISES</h1>
      <p>Industrial Sewing Machinery &amp; Apparel Production Solutions — Katunayake EPZ, Sri Lanka</p>
      <p>+94 11 234 5678 &nbsp;|&nbsp; VAT-102938475-7000 / SVAT-09281</p>
    </div>
    <div class="doc-meta">
      <div>Report Generated:</div>
      <div class="doc-num">${new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
      <div style="margin-top:6px;">${dateRange}</div>
      <div>Total Records: <strong>${reportData.length}</strong></div>
    </div>
  </div>

  <div class="banner">
    <span class="title">${reportTitle}</span>
    <span class="meta">Anujaya &amp; Global Enterprises — Consortium General Ledger</span>
  </div>

  <table>
    <thead>
      <tr>${headerCells}</tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <div class="footer">
    Official Consortium Report — Anujaya &amp; Global Enterprises — Printed: ${new Date().toLocaleString('en-GB')} — This document is system-generated and certified.
  </div>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=1100,height=750');
    if (!printWindow) {
      addToast('error', 'Pop-up blocked. Please allow pop-ups for this site.');
      return;
    }
    printWindow.document.write(printHTML);
    printWindow.document.close();
    printWindow.focus();
    // Small delay to allow resources to load
    setTimeout(() => {
      printWindow.print();
      // Close after print dialog is dismissed
      printWindow.onafterprint = () => printWindow.close();
    }, 400);
  };

  // ── Excel Export ─────────────────────────────────────────────────────────
  const handleExportExcel = async () => {
    if (reportData.length === 0) { addToast('warning', 'No records to export'); return; }
    try {
      const res = await fetch('http://localhost:5000/api/reports/export-excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('juki_token')}`,
        },
        body: JSON.stringify({ reportType, title: reportTitle, data: reportData }),
      });
      if (!res.ok) throw new Error('Excel export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      addToast('success', 'Excel report downloaded!');
    } catch (err) { addToast('error', err.message); }
  };

  const columns = reportData.length > 0 ? Object.keys(reportData[0]) : [];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl glass-card border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white tracking-tight">{t('reports')}</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
              Business Intelligence
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Audited Financial Statements, Fleet Utilization &amp; Customer Settlement Analytics
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition cursor-pointer">
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t('exportExcel')}</span>
          </button>

          <button onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold text-xs border border-slate-700 transition cursor-pointer">
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Report Selector & Date Filters */}
      <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Select Report Type</label>
            <select value={reportType} onChange={(e) => setReportType(e.target.value)}
              className="w-full glass-input px-3.5 py-2 rounded-xl font-semibold text-cyan-300">
              {reportTypes.map((r) => (
                <option key={r.id} value={r.id} className="bg-slate-900 text-white">{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="w-full glass-input px-3.5 py-2 rounded-xl" />
          </div>
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="w-full glass-input px-3.5 py-2 rounded-xl" />
          </div>
        </div>
      </div>

      {/* REPORT DATA TABLE (on-screen) */}
      <div className="rounded-2xl glass-card border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">{reportTitle || 'Select a report'}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {reportData.length} record{reportData.length !== 1 ? 's' : ''}
              {(startDate || endDate) && (
                <span className="text-slate-500 ml-2">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  {startDate ? fmtDate(startDate) : 'All'} — {endDate ? fmtDate(endDate) : 'Present'}
                </span>
              )}
            </p>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Consortium General Ledger</span>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center items-center text-xs text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2 text-cyan-400" />
            <span>Compiling report ledger…</span>
          </div>
        ) : reportData.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 text-slate-700" />
            No report data found for the selected period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800">
                  {columns.map((key) => (
                    <th key={key} className="p-3 whitespace-nowrap">{humanLabel(key)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {reportData.map((row, rowIdx) => {
                  const isTotal = row.category && (
                    String(row.category).toUpperCase().includes('TOTAL') ||
                    String(row.category).toUpperCase().includes('NET')
                  );
                  return (
                    <tr key={rowIdx}
                      className={`hover:bg-slate-900/40 transition ${isTotal ? 'bg-cyan-950/20 font-bold border-t-2 border-slate-700' : ''}`}>
                      {columns.map((col) => {
                        const val = row[col];
                        const isNum = typeof val === 'number';
                        const displayVal = formatCellValue(val);
                        return (
                          <td key={col}
                            className={`p-3 ${isNum ? 'text-right font-mono' : ''} ${
                              isNum && val < 0
                                ? 'text-rose-400'
                                : isNum && val > 0 && isTotal
                                ? 'text-emerald-400 text-sm'
                                : ''
                            }`}>
                            {displayVal}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
