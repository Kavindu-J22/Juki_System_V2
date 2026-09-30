import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';

export const ReportsView = () => {
  const { t } = useAuth();
  const { addToast } = useToast();

  const [reportType, setReportType] = useState('PROFIT_EXPENSE_REPORT');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState([]);
  const [reportTitle, setReportTitle] = useState('');
  const [loading, setLoading] = useState(true);

  const reportTypes = [
    { id: 'PROFIT_EXPENSE_REPORT', label: 'Consolidated Profit & Expense Report' },
    { id: 'DAILY_INCOME', label: 'Daily Income & Collections' },
    { id: 'MONTHLY_INCOME', label: 'Monthly Consolidated Income' },
    { id: 'CUSTOMER_PAYMENT_HISTORY', label: 'Customer Payment & Settlement Ledger' },
    { id: 'MACHINE_RENTAL_HISTORY', label: 'Machine Rental History & Utilization' },
    { id: 'OUTSTANDING_PAYMENTS', label: 'Outstanding Payments & Receivables' },
    { id: 'OVERDUE_CUSTOMERS', label: 'Overdue Rental Accounts' },
    { id: 'MACHINE_UTILIZATION', label: 'Consortium Fleet Inventory Utilization' },
  ];

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await api.getDetailedReport(reportType, {
        startDate,
        endDate,
      });
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

  useEffect(() => {
    fetchReport();
  }, [reportType, startDate, endDate]);

  // Export to Excel
  const handleExportExcel = async () => {
    if (reportData.length === 0) {
      addToast('warning', 'No records to export');
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/reports/export-excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('juki_token')}`,
        },
        body: JSON.stringify({
          reportType,
          title: reportTitle,
          data: reportData,
        }),
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
      addToast('success', 'Excel report downloaded successfully!');
    } catch (err) {
      addToast('error', err.message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

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
            Audited Financial Statements, Fleet Utilization & Customer Settlement Analytics
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t('exportExcel')}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold text-xs border border-slate-700 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Report Selector & Date Filter Controls */}
      <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Select Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full glass-input px-3.5 py-2 rounded-xl font-semibold text-cyan-300"
            >
              {reportTypes.map((r) => (
                <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full glass-input px-3.5 py-2 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full glass-input px-3.5 py-2 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* REPORT DATA DISPLAY */}
      <div className="rounded-2xl glass-card border border-slate-800 overflow-hidden shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">{reportTitle}</h3>
            <p className="text-xs text-slate-400">
              Total Records: <span className="font-bold text-cyan-400">{reportData.length}</span>
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono">Consortium General Ledger</span>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center items-center text-xs text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2 text-cyan-400" />
            <span>Compiling report ledger...</span>
          </div>
        ) : reportData.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No report data found for this selection and date range.
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Auto table header & cell generation from keys */}
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800">
                  {Object.keys(reportData[0]).map((key, i) => (
                    <th key={i} className="p-3 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {reportData.map((row, rowIdx) => {
                  const isTotalRow = row.category && (row.category.includes('TOTAL') || row.category.includes('NET'));

                  return (
                    <tr
                      key={rowIdx}
                      className={`hover:bg-slate-900/40 transition ${
                        isTotalRow ? 'bg-cyan-950/20 font-bold border-t-2 border-slate-700' : ''
                      }`}
                    >
                      {Object.values(row).map((val, cellIdx) => {
                        const isNum = typeof val === 'number';
                        const displayVal = isNum
                          ? val.toLocaleString()
                          : typeof val === 'object' && val !== null
                          ? JSON.stringify(val)
                          : String(val);

                        return (
                          <td
                            key={cellIdx}
                            className={`p-3 ${isNum ? 'text-right font-mono' : ''} ${
                              isNum && val < 0 ? 'text-rose-400' : isNum && val > 0 && isTotalRow ? 'text-emerald-400 text-sm' : ''
                            }`}
                          >
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
