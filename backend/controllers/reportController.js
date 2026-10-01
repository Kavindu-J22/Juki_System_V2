const Transaction = require('../models/Transaction');
const Machinery = require('../models/Machinery');
const Customer = require('../models/Customer');
const Expense = require('../models/Expense');
const PartnerLedger = require('../models/PartnerLedger');
const { checkRentalAlerts } = require('../services/alertService');
const { getSchedulerStatus, executeAutomatedReminderScan } = require('../services/schedulerService');
const XLSX = require('xlsx');

// @desc    Get real-time Executive Dashboard Metrics
// @route   GET /api/reports/dashboard-stats
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const transactions = await Transaction.find().populate('machinery customer');
    const machinery = await Machinery.find();
    const expenses = await Expense.find();

    let grossRevenue = 0;
    let completedDispatches = 0;
    let totalCostOfGoods = 0;
    let totalCustomsDutyDispatched = 0;
    let totalReceivables = 0;
    let outstandingCredit = 0;

    let buyRevenue = 0;
    let rentRevenue = 0;

    transactions.forEach(tx => {
      completedDispatches += 1;

      if (tx.transactionType === 'BUY') {
        const total = tx.buyDetails?.totalAmount || 0;
        const paid = tx.buyDetails?.paidAmount || 0;
        const outstanding = tx.buyDetails?.outstandingAmount || 0;
        const cog = tx.buyDetails?.totalCostOfGoods || 0;

        grossRevenue += total;
        buyRevenue += total;
        totalCostOfGoods += cog;
        totalReceivables += outstanding;
        outstandingCredit += outstanding;

        if (tx.machinery && tx.machinery.customsDutyLkr) {
          totalCustomsDutyDispatched += tx.machinery.customsDutyLkr * (tx.quantity || 1);
        }
      } else if (tx.transactionType === 'RENT') {
        const totalPayable = tx.rentDetails?.totalRentalPayable || tx.rentDetails?.totalRentValue || 0;
        const paid = tx.rentDetails?.totalRentalPaid || 0;
        const outstanding = tx.rentDetails?.outstandingRentalBalance || 0;

        grossRevenue += paid; // For rentals, cash realized/paid
        rentRevenue += paid;
        totalReceivables += outstanding;
      }
    });

    // Total Operating Expenses, Rents Owed, Salaries, Loans
    let totalExpenses = 0;
    let thirdPartyRentsPaid = 0;
    let salariesPaid = 0;
    let liabilitiesPaid = 0;
    let operatingOpsPaid = 0;

    expenses.forEach(e => {
      const paid = e.paidAmount || (e.paymentStatus === 'PAID' ? e.amount : 0);
      totalExpenses += paid;
      if (e.category === 'RENTS_OWED') thirdPartyRentsPaid += paid;
      else if (e.category === 'SALARIES') salariesPaid += paid;
      else if (e.category === 'LIABILITIES_LOANS') liabilitiesPaid += paid;
      else if (e.category === 'OPERATING_EXPENSES') operatingOpsPaid += paid;
    });

    // Stock Valuation & Fleet Counts
    let totalFleetSets = 0;
    let dispatchedFleetSets = 0;
    let inWarehouseSets = 0;
    let stockValuationWarehouse = 0;
    let totalCustomsDutyInStock = 0;

    machinery.forEach(m => {
      const initial = m.initialBatchSets || 0;
      const disp = m.dispatched || 0;
      const inWh = Math.max(0, initial - disp);
      const landed = m.landedUnitCost || 0;
      const duty = m.customsDutyLkr || 0;

      totalFleetSets += initial;
      dispatchedFleetSets += disp;
      inWarehouseSets += inWh;
      stockValuationWarehouse += inWh * landed;
      totalCustomsDutyInStock += inWh * duty;
    });

    const fleetTurnover = totalFleetSets > 0 ? ((dispatchedFleetSets / totalFleetSets) * 100).toFixed(1) : 0;

    // Consortium Net Profit = Gross Revenue - Total Cost of Goods - Total Expenses
    const consortiumNetProfit = grossRevenue - totalCostOfGoods - totalExpenses;
    const netMargin = grossRevenue > 0 ? ((consortiumNetProfit / grossRevenue) * 100).toFixed(1) : 0;

    // Rental Alerts
    const alerts = await checkRentalAlerts(false);

    const alertCounts = {
      total: alerts.length,
      overdue: alerts.filter(a => a.alertType === 'OVERDUE').length,
      dueToday: alerts.filter(a => a.alertType === 'DUE_TODAY').length,
      dueIn3Days: alerts.filter(a => a.alertType === '3_DAYS_REMAINING').length,
      dueIn7Days: alerts.filter(a => a.alertType === '7_DAYS_REMAINING').length,
    };

    // Recent Dispatches
    const recentDispatches = transactions.slice(0, 7).map(tx => ({
      _id: tx._id,
      invoiceNumber: tx.invoiceNumber,
      type: tx.transactionType,
      customer: tx.customerSnapshot?.name || 'Customer',
      model: tx.machinerySnapshot?.model || 'Machine',
      quantity: tx.quantity,
      date: tx.dispatchDate || tx.createdAt,
      status: tx.transactionType === 'BUY' ? tx.buyDetails?.settlementStatus : tx.rentDetails?.returnStatus,
      deliveryStatus: tx.deliveryStatus,
      totalAmount: tx.transactionType === 'BUY' ? tx.buyDetails?.totalAmount : tx.rentDetails?.totalRentalPayable,
    }));

    res.json({
      success: true,
      metrics: {
        grossRevenue,
        buyRevenue,
        rentRevenue,
        completedDispatches,
        totalCostOfGoods,
        totalExpenses,
        portAndCustomsDuty: totalCustomsDutyInStock + totalCustomsDutyDispatched,
        customsDutyInStock: totalCustomsDutyInStock,
        consortiumNetProfit,
        netMargin: Number(netMargin),
        totalFleetSets,
        dispatchedFleetSets,
        inWarehouseSets,
        fleetTurnover: Number(fleetTurnover),
        stockValuationWarehouse,
        totalReceivables,
        outstandingCredit,
      },
      alertCounts,
      alerts: alerts.slice(0, 10),
      recentDispatches,
      expenseBreakdown: {
        thirdPartyRentsPaid,
        salariesPaid,
        liabilitiesPaid,
        operatingOpsPaid,
      },
      scheduler: getSchedulerStatus(),
    });
  } catch (error) {
    console.error('getDashboardStats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Detailed Report based on reportType and filters
// @route   GET /api/reports/detailed
// @access  Private
const getDetailedReports = async (req, res) => {
  try {
    const { reportType = 'DAILY_INCOME', startDate, endDate, customerId, machineryId } = req.query;

    let dateQuery = {};
    if (startDate || endDate) {
      dateQuery.createdAt = {};
      if (startDate) dateQuery.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateQuery.createdAt.$lte = end;
      }
    }

    let reportData = [];
    let reportTitle = '';

    switch (reportType) {
      case 'DAILY_INCOME': {
        reportTitle = 'Daily Income & Collections Report';
        const txs = await Transaction.find(dateQuery).populate('customer machinery').sort({ createdAt: -1 });
        const grouped = {};

        txs.forEach(tx => {
          const dateStr = new Date(tx.createdAt).toISOString().split('T')[0];
          if (!grouped[dateStr]) {
            grouped[dateStr] = { date: dateStr, salesIncome: 0, rentalIncome: 0, totalCollections: 0, transactionsCount: 0 };
          }
          if (tx.transactionType === 'BUY') {
            const paid = tx.buyDetails?.paidAmount || 0;
            grouped[dateStr].salesIncome += paid;
            grouped[dateStr].totalCollections += paid;
          } else {
            const paid = tx.rentDetails?.totalRentalPaid || 0;
            grouped[dateStr].rentalIncome += paid;
            grouped[dateStr].totalCollections += paid;
          }
          grouped[dateStr].transactionsCount += 1;
        });
        reportData = Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));
        break;
      }

      case 'MONTHLY_INCOME': {
        reportTitle = 'Monthly Consolidated Income Report';
        const txs = await Transaction.find().populate('customer machinery');
        const grouped = {};

        txs.forEach(tx => {
          const d = new Date(tx.createdAt);
          const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (!grouped[monthStr]) {
            grouped[monthStr] = { month: monthStr, salesRevenue: 0, rentalRevenue: 0, totalIncome: 0, count: 0 };
          }
          const salesVal = tx.transactionType === 'BUY' ? (tx.buyDetails?.paidAmount || 0) : 0;
          const rentVal = tx.transactionType === 'RENT' ? (tx.rentDetails?.totalRentalPaid || 0) : 0;
          grouped[monthStr].salesRevenue += salesVal;
          grouped[monthStr].rentalRevenue += rentVal;
          grouped[monthStr].totalIncome += (salesVal + rentVal);
          grouped[monthStr].count += 1;
        });
        reportData = Object.values(grouped).sort((a, b) => b.month.localeCompare(a.month));
        break;
      }

      case 'CUSTOMER_PAYMENT_HISTORY': {
        reportTitle = 'Customer Payment & Settlement Ledger';
        let txQuery = { ...dateQuery };
        if (customerId) txQuery.customer = customerId;

        const txs = await Transaction.find(txQuery).populate('customer machinery').sort({ createdAt: -1 });
        const list = [];

        txs.forEach(tx => {
          (tx.payments || []).forEach(p => {
            list.push({
              paymentDate: p.date,
              invoiceNumber: tx.invoiceNumber,
              customerName: tx.customerSnapshot?.name || 'Customer',
              phone: tx.customerSnapshot?.phone || '',
              machine: tx.machinerySnapshot?.model || 'Equipment',
              paymentType: p.paymentType,
              paymentMethod: p.paymentMethod,
              reference: p.reference,
              amount: p.amount,
              receivedBy: p.receivedBy,
            });
          });
        });
        reportData = list.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
        break;
      }

      case 'MACHINE_RENTAL_HISTORY': {
        reportTitle = 'Consortium Machine Rental History & Fleet Track';
        let rentQuery = { transactionType: 'RENT', ...dateQuery };
        if (machineryId) rentQuery.machinery = machineryId;

        const rentals = await Transaction.find(rentQuery).populate('customer machinery').sort({ createdAt: -1 });
        reportData = rentals.map(r => ({
          agreementNumber: r.invoiceNumber,
          customer: r.customerSnapshot?.name,
          machinery: `${r.machinerySnapshot?.brand} ${r.machinerySnapshot?.model}`,
          quantity: r.quantity,
          serials: (r.serialNumbers || []).join(', '),
          dispatchDate: r.dispatchDate,
          durationMonths: r.rentDetails?.durationMonths,
          monthlyRent: r.rentDetails?.rentPricePerMonth,
          totalRentalPayable: r.rentDetails?.totalRentalPayable,
          totalPaid: r.rentDetails?.totalRentalPaid,
          outstandingBalance: r.rentDetails?.outstandingRentalBalance,
          returnStatus: r.rentDetails?.returnStatus,
          returnDate: r.rentDetails?.returnDate,
          monthsBilled: r.rentDetails?.monthsBilled,
          monthsWaived: r.rentDetails?.monthsWaived,
        }));
        break;
      }

      case 'OUTSTANDING_PAYMENTS': {
        reportTitle = 'Outstanding Receivables & Credit Ledger';
        const txs = await Transaction.find().populate('customer machinery');
        const pending = [];

        txs.forEach(tx => {
          const isBuy = tx.transactionType === 'BUY';
          const outstanding = isBuy ? (tx.buyDetails?.outstandingAmount || 0) : (tx.rentDetails?.outstandingRentalBalance || 0);

          if (outstanding > 0) {
            pending.push({
              invoiceNumber: tx.invoiceNumber,
              type: tx.transactionType,
              customer: tx.customerSnapshot?.name,
              phone: tx.customerSnapshot?.phone,
              region: tx.customerSnapshot?.region,
              machinery: tx.machinerySnapshot?.model,
              totalAmount: isBuy ? tx.buyDetails?.totalAmount : tx.rentDetails?.totalRentalPayable,
              paidAmount: isBuy ? tx.buyDetails?.paidAmount : tx.rentDetails?.totalRentalPaid,
              outstandingBalance: outstanding,
              dueDate: isBuy ? '30-Day Credit' : tx.rentDetails?.nextPaymentDueDate,
              status: isBuy ? tx.buyDetails?.settlementStatus : 'Rent In Progress',
            });
          }
        });
        reportData = pending.sort((a, b) => b.outstandingBalance - a.outstandingBalance);
        break;
      }

      case 'OVERDUE_CUSTOMERS': {
        reportTitle = 'Overdue Rental Customers';
        const alerts = await checkRentalAlerts(false);
        reportData = alerts.filter(a => a.alertType === 'OVERDUE');
        break;
      }

      case 'MACHINE_UTILIZATION': {
        reportTitle = 'Consortium Fleet Inventory Utilization';
        const machines = await Machinery.find().sort({ initialBatchSets: -1 });
        reportData = machines.map(m => {
          const total = m.initialBatchSets || 0;
          const dispatched = m.dispatched || 0;
          const inWh = Math.max(0, total - dispatched);
          const utilRate = total > 0 ? ((dispatched / total) * 100).toFixed(1) : 0;
          return {
            sku: m.sku,
            brand: m.brand,
            model: m.model,
            ownershipType: m.ownershipType === 'OUR_ASSET' ? 'Consortium Asset' : `Third Party (${m.thirdPartyCompany})`,
            totalSets: total,
            dispatched,
            inWarehouse: inWh,
            utilizationRate: `${utilRate}%`,
            monthlyRentPrice: m.rentPricePerMonth,
            landedCost: m.landedUnitCost,
            warehouseValuation: inWh * (m.landedUnitCost || 0),
          };
        });
        break;
      }

      case 'PROFIT_EXPENSE_REPORT':
      default: {
        reportTitle = 'Consolidated Profit, Revenue & Expense Report';
        const txs = await Transaction.find(dateQuery);
        const expenses = await Expense.find(dateQuery);

        let salesRev = 0;
        let rentalRev = 0;
        let cogs = 0;

        txs.forEach(t => {
          if (t.transactionType === 'BUY') {
            salesRev += t.buyDetails?.totalAmount || 0;
            cogs += t.buyDetails?.totalCostOfGoods || 0;
          } else {
            rentalRev += t.rentDetails?.totalRentalPaid || 0;
          }
        });

        let rentsOwed = 0;
        let salaries = 0;
        let liabilities = 0;
        let ops = 0;

        expenses.forEach(e => {
          const amt = e.paidAmount || (e.paymentStatus === 'PAID' ? e.amount : 0);
          if (e.category === 'RENTS_OWED') rentsOwed += amt;
          else if (e.category === 'SALARIES') salaries += amt;
          else if (e.category === 'LIABILITIES_LOANS') liabilities += amt;
          else if (e.category === 'OPERATING_EXPENSES') ops += amt;
        });

        const grossRevenue = salesRev + rentalRev;
        const totalExpenses = rentsOwed + salaries + liabilities + ops;
        const netProfit = grossRevenue - cogs - totalExpenses;

        reportData = [
          { category: 'Machinery Sales Revenue', amount: salesRev, notes: 'Direct equipment sales' },
          { category: 'Machinery Rental Income', amount: rentalRev, notes: 'Monthly rent realized' },
          { category: 'Gross Consortium Revenue', amount: grossRevenue, notes: 'Total revenue realized' },
          { category: 'Cost of Goods Sold (COGS)', amount: -cogs, notes: 'Landed cost of sold inventory' },
          { category: 'Gross Profit', amount: grossRevenue - cogs, notes: 'Revenue minus COGS' },
          { category: 'Third-Party Machinery Rents', amount: -rentsOwed, notes: 'Liabilities to outsource partners' },
          { category: 'Staff Salaries & Payroll', amount: -salaries, notes: 'Operations and technicians' },
          { category: 'Liabilities & Loan Servicing', amount: -liabilities, notes: 'Debt service & capital borrowing' },
          { category: 'Operating Expenses & Logistics', amount: -ops, notes: 'Utilities, fuel, port charges' },
          { category: 'TOTAL OPERATIONAL EXPENSES', amount: -totalExpenses, notes: 'Total consortium overhead' },
          { category: 'CONSORTIUM NET PROFIT', amount: netProfit, notes: 'Net distributable income' },
        ];
        break;
      }
    }

    res.json({
      success: true,
      reportType,
      reportTitle,
      recordCount: reportData.length,
      data: reportData,
    });
  } catch (error) {
    console.error('getDetailedReports error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export report data to Excel (.xlsx)
// @route   POST /api/reports/export-excel
// @access  Private
const exportReportExcel = async (req, res) => {
  try {
    const { reportType, title, data } = req.body;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ success: false, message: 'No data to export' });
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, reportType || 'Report');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename="${reportType || 'consortium_report'}_${Date.now()}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Trigger automated rental alert check & email dispatch (Manual Dashboard Action)
// @route   POST /api/reports/trigger-alerts
// @access  Private
const triggerAlertCheck = async (req, res) => {
  try {
    const { sendEmails = false } = req.body;
    let alerts = [];

    if (sendEmails) {
      const result = await executeAutomatedReminderScan('MANUAL_DASHBOARD_BUTTON');
      alerts = result.alerts || [];
    } else {
      alerts = await checkRentalAlerts(false);
    }

    res.json({
      success: true,
      message: `Checked ${alerts.length} active rental alerts. Emails sent: ${sendEmails}`,
      count: alerts.length,
      scheduler: getSchedulerStatus(),
      alerts,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get automated scheduler status & logs
// @route   GET /api/reports/scheduler-status
// @access  Private
const getScheduler = async (req, res) => {
  try {
    res.json({
      success: true,
      scheduler: getSchedulerStatus(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getDetailedReports,
  exportReportExcel,
  triggerAlertCheck,
  getScheduler,
};
