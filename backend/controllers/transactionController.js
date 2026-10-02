const Transaction = require('../models/Transaction');
const Machinery = require('../models/Machinery');
const Customer = require('../models/Customer');
const { sendDispatchNotificationEmail } = require('../services/emailService');

// Generate Unique Invoice / Agreement Number
const generateInvoiceNumber = async (type) => {
  const prefix = type === 'BUY' ? 'INV' : 'AGR';
  const year = new Date().getFullYear();
  try {
    const regex = new RegExp(`^${prefix}-${year}-(\\d+)`);
    const txs = await Transaction.find({ invoiceNumber: regex }, 'invoiceNumber');
    let maxNum = 100;
    for (const t of txs) {
      if (t.invoiceNumber) {
        const match = t.invoiceNumber.match(regex);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }
    return `${prefix}-${year}-${String(maxNum + 1).padStart(4, '0')}`;
  } catch (err) {
    const count = await Transaction.countDocuments({ transactionType: type });
    return `${prefix}-${year}-${String(count + 101).padStart(4, '0')}`;
  }
};

// Calculate rent schedule coverage and next due date
const calculateRentScheduleStatus = (transaction) => {
  const rd = transaction.rentDetails;
  if (!rd) return { nextDueMonth: 1, nextDueDate: null, isAllPaid: false, monthPaidMap: {} };

  const duration = rd.durationMonths || 1;
  const monthlyTarget = (rd.rentPricePerMonth || 0) * (transaction.quantity || 1);
  const start = new Date(transaction.dispatchDate || transaction.createdAt);

  const rentPayments = (transaction.payments || []).filter(p => p.paymentType === 'MONTHLY_RENT');

  const monthPaidMap = {};
  for (let i = 1; i <= duration; i++) monthPaidMap[i] = 0;

  const unassigned = [];
  for (const p of rentPayments) {
    const m = parseInt(p.monthCovered, 10);
    if (!isNaN(m) && m >= 1 && m <= duration) {
      monthPaidMap[m] = (monthPaidMap[m] || 0) + Number(p.amount || 0);
    } else {
      unassigned.push(p);
    }
  }

  // Allocate unassigned or legacy payments sequentially
  for (const p of unassigned) {
    let amt = Number(p.amount || 0);
    for (let i = 1; i <= duration; i++) {
      if (amt <= 0) break;
      const needed = Math.max(0, monthlyTarget - monthPaidMap[i]);
      if (needed > 0) {
        const alloc = Math.min(amt, needed);
        monthPaidMap[i] += alloc;
        amt -= alloc;
      }
    }
  }

  // Find earliest incomplete month
  let nextDueMonth = null;
  for (let i = 1; i <= duration; i++) {
    if (monthPaidMap[i] < monthlyTarget) {
      nextDueMonth = i;
      break;
    }
  }

  if (nextDueMonth) {
    const nextDate = new Date(start);
    nextDate.setMonth(nextDate.getMonth() + (nextDueMonth - 1));
    return { nextDueMonth, nextDueDate: nextDate, isAllPaid: false, monthPaidMap };
  } else {
    return { nextDueMonth: duration + 1, nextDueDate: null, isAllPaid: true, monthPaidMap };
  }
};

// @desc    Get all transactions with filtering (BUY or RENT)
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res) => {
  try {
    const { type, deliveryStatus, returnStatus, search } = req.query;
    let query = {};

    if (type && type !== 'ALL') {
      query.transactionType = type;
    }

    if (deliveryStatus && deliveryStatus !== 'ALL') {
      query.deliveryStatus = deliveryStatus;
    }

    if (returnStatus && returnStatus !== 'ALL') {
      query['rentDetails.returnStatus'] = returnStatus;
    }

    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'customerSnapshot.name': { $regex: search, $options: 'i' } },
        { 'customerSnapshot.phone': { $regex: search, $options: 'i' } },
        { 'machinerySnapshot.model': { $regex: search, $options: 'i' } },
        { serialNumbers: { $regex: search, $options: 'i' } },
      ];
    }

    const transactions = await Transaction.find(query)
      .populate('customer machinery createdBy', 'name email role')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: transactions.length, transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single transaction
// @route   GET /api/transactions/:id
// @access  Private
const getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('customer machinery createdBy', 'name email role phone');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.json({ success: true, transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new Dispatch (BUY or RENT)
// @route   POST /api/transactions
// @access  Private
const createTransaction = async (req, res) => {
  try {
    const {
      transactionType,
      customerId,
      machineryId,
      quantity = 1,
      serialNumbers = [],
      dispatchDate,
      deliveryCharges = 0,
      otherCharges = 0,
      // Buy payload
      buyDetails,
      // Rent payload
      rentDetails,
    } = req.body;

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Selected customer not found' });
    }

    const machine = await Machinery.findById(machineryId);
    if (!machine) {
      return res.status(404).json({ success: false, message: 'Selected machinery not found' });
    }

    const requestedQty = Number(quantity) || 1;
    const availableStock = (machine.initialBatchSets || 0) - (machine.dispatched || 0);

    if (availableStock < requestedQty) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock in warehouse. Available: ${availableStock}, Requested: ${requestedQty}`,
      });
    }

    const invoiceNumber = await generateInvoiceNumber(transactionType);

    // Snapshot representations for audit trail & invoice permanence
    const customerSnapshot = {
      name: customer.name,
      cid: customer.cid,
      phone: customer.phone,
      region: customer.region,
      address: customer.address,
    };

    const machinerySnapshot = {
      sku: machine.sku,
      brand: machine.brand,
      model: machine.model,
      landedUnitCost: machine.landedUnitCost,
      ownershipType: machine.ownershipType,
      thirdPartyCompany: machine.thirdPartyCompany,
      thirdPartyRentalCostOwed: machine.thirdPartyRentalCostOwed,
    };

    let processedBuyDetails = {};
    let processedRentDetails = {};
    const initialPayments = [];

    if (transactionType === 'BUY') {
      const unitPrice = Number(buyDetails.unitPrice) || machine.wholesaleBenchmark || 0;
      const subtotal = unitPrice * requestedQty;
      const taxIncluded = Boolean(buyDetails.taxIncluded);
      const taxPercent = Number(buyDetails.taxPercent) || 0;
      const taxAmount = taxIncluded ? (subtotal * taxPercent) / 100 : 0;
      const otherFees = Number(otherCharges) || 0;
      const delivery = Number(deliveryCharges) || 0;
      const totalAmount = subtotal + taxAmount + otherFees + delivery;

      const paidAmount = Number(buyDetails.paidAmount) || 0;
      const outstandingAmount = Math.max(0, totalAmount - paidAmount);
      let settlementStatus = 'Credit / Pending';
      if (outstandingAmount === 0 && paidAmount > 0) {
        settlementStatus = 'Fully Paid';
      } else if (paidAmount > 0) {
        settlementStatus = 'Partial Payment';
      }

      // Cost of goods & profit calculation
      const totalCostOfGoods = (machine.landedUnitCost || 0) * requestedQty;
      const totalGrossProfit = totalAmount - totalCostOfGoods - delivery - otherFees;

      const anujayaPct = Number(buyDetails.profitSplitPercent?.anujayaPercent ?? 50);
      const globalPct = Number(buyDetails.profitSplitPercent?.globalPercent ?? 50);

      const anujayaNetProfit = (totalGrossProfit * anujayaPct) / 100;
      const globalNetProfit = (totalGrossProfit * globalPct) / 100;

      processedBuyDetails = {
        benchmarkType: buyDetails.benchmarkType || 'Wholesale',
        unitPrice,
        subtotal,
        taxIncluded,
        taxPercent,
        taxAmount,
        totalAmount,
        paidAmount,
        outstandingAmount,
        settlementStatus,
        paymentTerms: buyDetails.paymentTerms || 'Bank Wire/SLIPS',
        paymentReference: buyDetails.paymentReference || '',
        totalCostOfGoods,
        totalGrossProfit,
        profitSplitPercent: {
          anujayaPercent: anujayaPct,
          globalPercent: globalPct,
        },
        anujayaNetProfit,
        globalNetProfit,
      };

      if (paidAmount > 0) {
        initialPayments.push({
          date: dispatchDate || new Date(),
          amount: paidAmount,
          paymentType: 'SALES_SETTLEMENT',
          paymentMethod: buyDetails.paymentTerms || 'Bank Wire/SLIPS',
          reference: buyDetails.paymentReference || 'Initial Sales Payment',
          notes: 'Settlement captured at dispatch',
          receivedBy: req.user ? req.user.name : 'Staff',
        });
      }
    } else if (transactionType === 'RENT') {
      const durationMonths = Number(rentDetails.durationMonths) || 1;
      const rentPricePerMonth = Number(rentDetails.rentPricePerMonth) || machine.rentPricePricePerMonth || machine.rentPricePerMonth || 0;
      const totalRentValue = durationMonths * rentPricePerMonth * requestedQty;

      const hasKeyMoney = Boolean(rentDetails.hasKeyMoney);
      const keyMoneyAmount = hasKeyMoney ? Number(rentDetails.keyMoneyAmount) || 0 : 0;
      const keyMoneyPaidAmount = hasKeyMoney ? Number(rentDetails.keyMoneyPaidAmount) || 0 : 0;
      let keyMoneyStatus = 'Credit / Pending';
      if (keyMoneyPaidAmount >= keyMoneyAmount && keyMoneyAmount > 0) keyMoneyStatus = 'Fully Paid';
      else if (keyMoneyPaidAmount > 0) keyMoneyStatus = 'Partial Payment';

      const perMonthRent = rentPricePerMonth * requestedQty;
      const firstTwoMonthsAmount = perMonthRent * Math.min(2, durationMonths);
      const firstTwoMonthsPaidAmount = Number(rentDetails.firstTwoMonthsPaidAmount) || 0;
      let firstTwoMonthsStatus = 'Credit / Pending';
      if (firstTwoMonthsPaidAmount >= firstTwoMonthsAmount && firstTwoMonthsAmount > 0) firstTwoMonthsStatus = 'Fully Paid';
      else if (firstTwoMonthsPaidAmount > 0) firstTwoMonthsStatus = 'Partial Payment';

      // Distribute advance payment across Month 1 and Month 2
      const startDate = dispatchDate ? new Date(dispatchDate) : new Date();
      if (firstTwoMonthsPaidAmount > 0) {
        // Month 1 advance allocation
        const month1Amount = Math.min(firstTwoMonthsPaidAmount, perMonthRent);
        if (month1Amount > 0) {
          initialPayments.push({
            date: startDate,
            amount: month1Amount,
            paymentType: 'MONTHLY_RENT',
            paymentMethod: rentDetails.paymentTerms || 'Bank Wire/SLIPS',
            reference: rentDetails.paymentReference || 'Month 1 Advance Rent',
            monthCovered: '1',
            notes: month1Amount === perMonthRent
              ? 'First month advance rent captured at dispatch'
              : `Partial first month advance rent (LKR ${month1Amount.toLocaleString()} of ${perMonthRent.toLocaleString()})`,
            receivedBy: req.user ? req.user.name : 'Staff',
          });
        }

        // Month 2 advance allocation
        const remainingForMonth2 = firstTwoMonthsPaidAmount - month1Amount;
        const month2Amount = Math.min(remainingForMonth2, perMonthRent);
        if (month2Amount > 0) {
          initialPayments.push({
            date: startDate,
            amount: month2Amount,
            paymentType: 'MONTHLY_RENT',
            paymentMethod: rentDetails.paymentTerms || 'Bank Wire/SLIPS',
            reference: rentDetails.paymentReference || 'Month 2 Advance Rent',
            monthCovered: '2',
            notes: month2Amount === perMonthRent
              ? 'Second month advance rent captured at dispatch'
              : `Partial second month advance rent (LKR ${month2Amount.toLocaleString()} of ${perMonthRent.toLocaleString()})`,
            receivedBy: req.user ? req.user.name : 'Staff',
          });
        }
      }

      // Next payment due date & current cycle
      const nextDue = new Date(startDate);
      let initialCycle = 1;
      const month1Paid = Math.min(firstTwoMonthsPaidAmount, perMonthRent);
      const month2Paid = Math.min(Math.max(0, firstTwoMonthsPaidAmount - month1Paid), perMonthRent);
      if (month1Paid >= perMonthRent && month2Paid >= perMonthRent) {
        // Months 1 & 2 fully covered -> Next due is Month 3 (2 months after start)
        nextDue.setMonth(nextDue.getMonth() + 2);
        initialCycle = 3;
      } else if (month1Paid >= perMonthRent) {
        // Month 1 covered, Month 2 partial or unpaid -> Next due is Month 2 (1 month after start)
        nextDue.setMonth(nextDue.getMonth() + 1);
        initialCycle = 2;
      } else {
        // Month 1 not fully covered -> Due Month 1
        initialCycle = 1;
      }

      const totalRentalPaid = keyMoneyPaidAmount + firstTwoMonthsPaidAmount;
      const totalRentalPayable = totalRentValue + keyMoneyAmount + (Number(deliveryCharges) || 0);
      const outstandingRentalBalance = Math.max(0, totalRentalPayable - totalRentalPaid);

      // Profit split on rental
      const anujayaRentalShare = totalRentalPaid * 0.5;
      const globalRentalShare = totalRentalPaid * 0.5;

      processedRentDetails = {
        durationMonths,
        rentPricePerMonth,
        totalRentValue,
        hasKeyMoney,
        keyMoneyAmount,
        keyMoneyPaidAmount,
        keyMoneyStatus,
        firstTwoMonthsAmount,
        firstTwoMonthsPaidAmount,
        firstTwoMonthsStatus,
        paymentTerms: rentDetails.paymentTerms || 'Bank Wire/SLIPS',
        paymentReference: rentDetails.paymentReference || '',
        termsAndConditions: rentDetails.termsAndConditions || [
          'Machine must be operated under safe electrical voltage conditions with surge protection.',
          'Consortium technicians are entitled to monthly maintenance inspections.',
          'Any damage caused by negligence will be charged to the Lessee at landed replacement cost.',
        ],
        warrantyCertificateTerms: rentDetails.warrantyCertificateTerms || 'Standard 12 Months Consortium Technical & Service Warranty on Electronics and Mechanical Drive Assemblies.',
        nextPaymentDueDate: nextDue,
        currentMonthCycle: initialCycle,
        returnStatus: 'In Use',
        monthsBilled: durationMonths,
        monthsWaived: 0,
        totalRentalPayable,
        totalRentalPaid,
        outstandingRentalBalance,
        anujayaRentalShare,
        globalRentalShare,
      };

      if (keyMoneyPaidAmount > 0) {
        initialPayments.push({
          date: startDate,
          amount: keyMoneyPaidAmount,
          paymentType: 'KEY_MONEY',
          paymentMethod: rentDetails.paymentTerms || 'Bank Wire/SLIPS',
          reference: rentDetails.paymentReference || 'Key Money Deposit',
          notes: 'Security Deposit captured at dispatch',
          receivedBy: req.user ? req.user.name : 'Staff',
        });
      }
    }

    // Create the Transaction record
    const transaction = await Transaction.create({
      transactionType,
      invoiceNumber,
      customer: customer._id,
      customerSnapshot,
      machinery: machine._id,
      machinerySnapshot,
      quantity: requestedQty,
      serialNumbers: Array.isArray(serialNumbers) ? serialNumbers : [],
      dispatchDate: dispatchDate || new Date(),
      deliveryStatus: 'Pending',
      deliveryCharges: Number(deliveryCharges) || 0,
      otherCharges: Number(otherCharges) || 0,
      buyDetails: processedBuyDetails,
      rentDetails: processedRentDetails,
      payments: initialPayments,
      createdBy: req.user ? req.user._id : undefined,
      createdByName: req.user ? req.user.name : 'Staff',
    });

    // Update machinery stock count
    machine.dispatched = (machine.dispatched || 0) + requestedQty;
    // Remove assigned serial numbers from available pool if any
    if (machine.availableSerialNumbers && machine.availableSerialNumbers.length > 0 && serialNumbers.length > 0) {
      machine.availableSerialNumbers = machine.availableSerialNumbers.filter(
        sn => !serialNumbers.includes(sn)
      );
    }
    await machine.save();

    // Trigger email notification asynchronously
    sendDispatchNotificationEmail({
      customerEmail: customer.email,
      customerName: customer.name,
      transactionType,
      invoiceNumber,
      machineModel: `${machine.brand} ${machine.model}`,
      quantity: requestedQty,
      serialNumbers,
      totalAmount: transactionType === 'BUY' ? processedBuyDetails.totalAmount : processedRentDetails.totalRentalPayable,
      paidAmount: transactionType === 'BUY' ? processedBuyDetails.paidAmount : processedRentDetails.totalRentalPaid,
      outstandingAmount: transactionType === 'BUY' ? processedBuyDetails.outstandingAmount : processedRentDetails.outstandingRentalBalance,
    }).catch(err => console.warn('Could not send dispatch email:', err.message));

    res.status(201).json({ success: true, transaction });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Delivery Status (Pending -> Ongoing -> Hand Overed)
// @route   PUT /api/transactions/:id/delivery-status
// @access  Private
const updateDeliveryStatus = async (req, res) => {
  try {
    const { deliveryStatus } = req.body;
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    transaction.deliveryStatus = deliveryStatus;
    if (deliveryStatus === 'Hand Overed') {
      transaction.handOverDate = new Date();
    }
    await transaction.save();

    res.json({ success: true, transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Process Machine Return (with Flexible Return 5th Day Rule Engine)
// @route   POST /api/transactions/:id/return
// @access  Private
const processReturn = async (req, res) => {
  try {
    const { returnDate = new Date(), returnNotes = '' } = req.body;
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.transactionType !== 'RENT') {
      return res.status(400).json({ success: false, message: 'Returns are only applicable to RENT transactions' });
    }

    if (transaction.rentDetails.returnStatus === 'Returned') {
      return res.status(400).json({ success: false, message: 'Machine has already been marked as Returned' });
    }

    const retDate = new Date(returnDate);
    const dispatchDate = new Date(transaction.dispatchDate || transaction.createdAt);

    /**
     * FLEXIBLE RETURN RULE ENGINE:
     * "Customers can return machines before or after the agreed month.
     * If the return date exceeds a monthly cycle past the 5th day (e.g., past the 5th of the month),
     * that month's rent must be recorded as payable; if returned early, that respective month's rent is waived.
     * Overdue payments must remain recorded as active receivables."
     */
    // Calculate months elapsed
    let monthsElapsed = (retDate.getFullYear() - dispatchDate.getFullYear()) * 12 + (retDate.getMonth() - dispatchDate.getMonth());
    const dayOfReturnMonth = retDate.getDate();

    // If day of month is > 5, this cycle month is counted and payable
    if (dayOfReturnMonth > 5) {
      monthsElapsed += 1;
    } else {
      // Returned early before or on the 5th => month is waived
      // ensure at least 0 months or minimum 1 if returned within first month after day 5
    }

    // Minimum billable months is 1 if actually used
    const actualMonthsBilled = Math.max(1, monthsElapsed);
    const agreedMonths = transaction.rentDetails.durationMonths || 1;
    const waivedMonths = Math.max(0, agreedMonths - actualMonthsBilled);

    const monthlyRate = transaction.rentDetails.rentPricePerMonth * transaction.quantity;
    const revisedRentValue = actualMonthsBilled * monthlyRate;
    const keyMoney = transaction.rentDetails.hasKeyMoney ? transaction.rentDetails.keyMoneyAmount : 0;
    const delivery = transaction.deliveryCharges || 0;

    const revisedTotalPayable = revisedRentValue + keyMoney + delivery;
    const totalPaid = transaction.rentDetails.totalRentalPaid || 0;
    const revisedOutstanding = Math.max(0, revisedTotalPayable - totalPaid);

    transaction.rentDetails.returnStatus = 'Returned';
    transaction.rentDetails.returnDate = retDate;
    transaction.rentDetails.monthsBilled = actualMonthsBilled;
    transaction.rentDetails.monthsWaived = waivedMonths;
    transaction.rentDetails.totalRentalPayable = revisedTotalPayable;
    transaction.rentDetails.outstandingRentalBalance = revisedOutstanding;
    transaction.rentDetails.returnNotes = returnNotes;
    transaction.rentDetails.returnRecordedBy = req.user ? req.user.name : 'Staff';

    await transaction.save();

    // Reconcile Inventory: Decrement dispatched count (thus incrementing inWarehouse count)
    const machine = await Machinery.findById(transaction.machinery);
    if (machine) {
      machine.dispatched = Math.max(0, (machine.dispatched || 0) - transaction.quantity);
      // Return serial numbers to available list
      if (transaction.serialNumbers && transaction.serialNumbers.length > 0) {
        machine.availableSerialNumbers = [...new Set([...(machine.availableSerialNumbers || []), ...transaction.serialNumbers])];
      }
      await machine.save();
    }

    res.json({
      success: true,
      message: `Return recorded successfully. Billed: ${actualMonthsBilled} month(s), Waived: ${waivedMonths} month(s) per 5th-day rule engine.`,
      transaction,
    });
  } catch (error) {
    console.error('Process return error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Record a Payment against Transaction (Rent collection or Buy settlement)
// @route   POST /api/transactions/:id/payments
// @access  Private
const recordPayment = async (req, res) => {
  try {
    const { amount, paymentType, paymentMethod, reference, monthCovered, notes } = req.body;
    const paymentAmount = Number(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid payment amount greater than 0' });
    }

    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    let targetMonth = monthCovered ? String(monthCovered) : '';

    if (transaction.transactionType === 'RENT' && (!paymentType || paymentType === 'MONTHLY_RENT')) {
      if (!targetMonth) {
        const schedule = calculateRentScheduleStatus(transaction);
        if (schedule.nextDueMonth <= (transaction.rentDetails.durationMonths || 1)) {
          targetMonth = String(schedule.nextDueMonth);
        }
      }
    }

    const paymentEntry = {
      date: new Date(),
      amount: paymentAmount,
      paymentType: paymentType || (transaction.transactionType === 'RENT' ? 'MONTHLY_RENT' : 'SALES_SETTLEMENT'),
      paymentMethod: paymentMethod || 'Bank Wire/SLIPS',
      reference: reference || '',
      monthCovered: targetMonth,
      notes: notes || '',
      receivedBy: req.user ? req.user.name : 'Staff',
    };

    transaction.payments.push(paymentEntry);

    if (transaction.transactionType === 'BUY') {
      transaction.buyDetails.paidAmount = (transaction.buyDetails.paidAmount || 0) + paymentAmount;
      transaction.buyDetails.outstandingAmount = Math.max(0, (transaction.buyDetails.totalAmount || 0) - transaction.buyDetails.paidAmount);
      if (transaction.buyDetails.outstandingAmount === 0) {
        transaction.buyDetails.settlementStatus = 'Fully Paid';
      } else {
        transaction.buyDetails.settlementStatus = 'Partial Payment';
      }
    } else if (transaction.transactionType === 'RENT') {
      transaction.rentDetails.totalRentalPaid = (transaction.rentDetails.totalRentalPaid || 0) + paymentAmount;
      transaction.rentDetails.outstandingRentalBalance = Math.max(
        0,
        (transaction.rentDetails.totalRentalPayable || 0) - transaction.rentDetails.totalRentalPaid
      );

      // Recalculate schedule status and nextPaymentDueDate
      const scheduleStatus = calculateRentScheduleStatus(transaction);
      transaction.rentDetails.nextPaymentDueDate = scheduleStatus.nextDueDate;
      transaction.rentDetails.currentMonthCycle = scheduleStatus.nextDueMonth;
      transaction.markModified('rentDetails');
    }

    transaction.markModified('payments');
    await transaction.save();
    res.json({ success: true, message: 'Payment recorded successfully', transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Pay a specific month's rent for a RENT transaction
// @route   POST /api/transactions/:id/pay-month
// @access  Private
const payMonthRent = async (req, res) => {
  try {
    const { monthNumber, paymentMethod, reference, notes, amount } = req.body;
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    if (transaction.transactionType !== 'RENT') {
      return res.status(400).json({ success: false, message: 'This endpoint is for RENT transactions only' });
    }

    const monthlyTarget = (transaction.rentDetails?.rentPricePerMonth || 0) * (transaction.quantity || 1);
    const mNum = parseInt(monthNumber, 10);
    if (isNaN(mNum) || mNum < 1) {
      return res.status(400).json({ success: false, message: 'Invalid month number' });
    }

    // Calculate how much has already been paid for this month
    const existingPaid = (transaction.payments || [])
      .filter((p) => p.paymentType === 'MONTHLY_RENT' && String(p.monthCovered) === String(mNum))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const remainingForMonth = Math.max(0, monthlyTarget - existingPaid);
    if (remainingForMonth <= 0) {
      return res.status(400).json({ success: false, message: `Month ${mNum} rent is already fully paid` });
    }

    // If an explicit amount was provided (e.g. paying partial or paying rest), use it up to remaining
    const paymentToRecord = amount ? Math.min(Number(amount), remainingForMonth) : remainingForMonth;
    if (paymentToRecord <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    const isClearingRest = (existingPaid + paymentToRecord) >= monthlyTarget;

    const paymentEntry = {
      date: new Date(),
      amount: paymentToRecord,
      paymentType: 'MONTHLY_RENT',
      paymentMethod: paymentMethod || 'Bank Wire/SLIPS',
      reference: reference || `Month ${mNum} Rent Payment`,
      monthCovered: String(mNum),
      notes: notes || (isClearingRest
        ? `Month ${mNum} rent completed (LKR ${paymentToRecord.toLocaleString()})`
        : `Partial payment for Month ${mNum} (LKR ${paymentToRecord.toLocaleString()} of remaining LKR ${remainingForMonth.toLocaleString()})`),
      receivedBy: req.user ? req.user.name : 'Staff',
    };

    transaction.payments.push(paymentEntry);
    transaction.rentDetails.totalRentalPaid = (transaction.rentDetails.totalRentalPaid || 0) + paymentToRecord;
    transaction.rentDetails.outstandingRentalBalance = Math.max(
      0,
      (transaction.rentDetails.totalRentalPayable || 0) - transaction.rentDetails.totalRentalPaid
    );

    // Recalculate rent schedule status and advance nextPaymentDueDate
    const scheduleStatus = calculateRentScheduleStatus(transaction);
    transaction.rentDetails.nextPaymentDueDate = scheduleStatus.nextDueDate;
    transaction.rentDetails.currentMonthCycle = scheduleStatus.nextDueMonth;

    transaction.markModified('rentDetails');
    transaction.markModified('payments');
    await transaction.save();

    res.json({
      success: true,
      message: isClearingRest
        ? `Month ${mNum} rent recorded as fully paid!`
        : `Payment of LKR ${paymentToRecord.toLocaleString()} recorded for Month ${mNum} (Remaining: LKR ${(remainingForMonth - paymentToRecord).toLocaleString()})`,
      transaction,
    });
  } catch (error) {
    console.error('Pay month rent error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update/Edit a Transaction (editable fields only)
// @route   PUT /api/transactions/:id
// @access  Private
const updateTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const {
      serialNumbers,
      deliveryCharges,
      otherCharges,
      dispatchDate,
      // BUY editable
      buyDetails,
      // RENT editable
      rentDetails,
      // mark as paid shortcut
      markAsPaid,
    } = req.body;

    if (serialNumbers !== undefined) transaction.serialNumbers = serialNumbers;
    if (deliveryCharges !== undefined) transaction.deliveryCharges = Number(deliveryCharges);
    if (otherCharges !== undefined) transaction.otherCharges = Number(otherCharges);
    if (dispatchDate !== undefined) transaction.dispatchDate = new Date(dispatchDate);

    if (transaction.transactionType === 'BUY') {
      if (markAsPaid) {
        // Fully settle the BUY transaction
        const outstanding = transaction.buyDetails.outstandingAmount || 0;
        if (outstanding > 0) {
          transaction.payments.push({
            date: new Date(),
            amount: outstanding,
            paymentType: 'SALES_SETTLEMENT',
            paymentMethod: buyDetails?.paymentMethod || 'Bank Wire/SLIPS',
            reference: buyDetails?.reference || 'Mark as Paid',
            notes: 'Marked as fully paid by staff',
            receivedBy: req.user ? req.user.name : 'Staff',
          });
          transaction.buyDetails.paidAmount = transaction.buyDetails.totalAmount;
          transaction.buyDetails.outstandingAmount = 0;
          transaction.buyDetails.settlementStatus = 'Fully Paid';
        }
      } else if (buyDetails) {
        if (buyDetails.unitPrice !== undefined) {
          const newUnitPrice = Number(buyDetails.unitPrice);
          const qty = transaction.quantity || 1;
          const subtotal = newUnitPrice * qty;
          const taxAmt = transaction.buyDetails.taxIncluded ? (subtotal * (transaction.buyDetails.taxPercent || 0)) / 100 : 0;
          const totalAmount = subtotal + taxAmt + (transaction.deliveryCharges || 0) + (transaction.otherCharges || 0);
          transaction.buyDetails.unitPrice = newUnitPrice;
          transaction.buyDetails.subtotal = subtotal;
          transaction.buyDetails.taxAmount = taxAmt;
          transaction.buyDetails.totalAmount = totalAmount;
          transaction.buyDetails.outstandingAmount = Math.max(0, totalAmount - (transaction.buyDetails.paidAmount || 0));
          transaction.buyDetails.settlementStatus =
            transaction.buyDetails.outstandingAmount === 0 ? 'Fully Paid'
            : transaction.buyDetails.paidAmount > 0 ? 'Partial Payment' : 'Credit / Pending';
        }
        if (buyDetails.paidAmount !== undefined) {
          transaction.buyDetails.paidAmount = Number(buyDetails.paidAmount);
          transaction.buyDetails.outstandingAmount = Math.max(0, (transaction.buyDetails.totalAmount || 0) - transaction.buyDetails.paidAmount);
          transaction.buyDetails.settlementStatus =
            transaction.buyDetails.outstandingAmount === 0 ? 'Fully Paid'
            : transaction.buyDetails.paidAmount > 0 ? 'Partial Payment' : 'Credit / Pending';
        }
        if (buyDetails.paymentTerms !== undefined) transaction.buyDetails.paymentTerms = buyDetails.paymentTerms;
        if (buyDetails.paymentReference !== undefined) transaction.buyDetails.paymentReference = buyDetails.paymentReference;
        if (buyDetails.termsAndConditions !== undefined) transaction.buyDetails.termsAndConditions = buyDetails.termsAndConditions;
      }
    } else if (transaction.transactionType === 'RENT') {
      if (markAsPaid) {
        // Settle outstanding rental balance
        const outstanding = transaction.rentDetails.outstandingRentalBalance || 0;
        if (outstanding > 0) {
          transaction.payments.push({
            date: new Date(),
            amount: outstanding,
            paymentType: 'MONTHLY_RENT',
            paymentMethod: rentDetails?.paymentMethod || 'Bank Wire/SLIPS',
            reference: rentDetails?.reference || 'Mark as Paid',
            notes: 'Marked as fully paid by staff',
            receivedBy: req.user ? req.user.name : 'Staff',
          });
          transaction.rentDetails.totalRentalPaid = transaction.rentDetails.totalRentalPayable;
          transaction.rentDetails.outstandingRentalBalance = 0;
          // Clear next due date
          transaction.rentDetails.nextPaymentDueDate = null;
        }
      } else if (rentDetails) {
        if (rentDetails.rentPricePerMonth !== undefined) transaction.rentDetails.rentPricePerMonth = Number(rentDetails.rentPricePerMonth);
        if (rentDetails.durationMonths !== undefined) transaction.rentDetails.durationMonths = Number(rentDetails.durationMonths);
        if (rentDetails.keyMoneyAmount !== undefined) transaction.rentDetails.keyMoneyAmount = Number(rentDetails.keyMoneyAmount);
        if (rentDetails.keyMoneyPaidAmount !== undefined) transaction.rentDetails.keyMoneyPaidAmount = Number(rentDetails.keyMoneyPaidAmount);
        if (rentDetails.paymentTerms !== undefined) transaction.rentDetails.paymentTerms = rentDetails.paymentTerms;
        if (rentDetails.paymentReference !== undefined) transaction.rentDetails.paymentReference = rentDetails.paymentReference;
        if (rentDetails.termsAndConditions !== undefined) transaction.rentDetails.termsAndConditions = rentDetails.termsAndConditions;
        if (rentDetails.nextPaymentDueDate !== undefined) transaction.rentDetails.nextPaymentDueDate = rentDetails.nextPaymentDueDate ? new Date(rentDetails.nextPaymentDueDate) : null;
        // Recalculate totals if price/duration changed
        const qty = transaction.quantity || 1;
        const totalRentValue = (transaction.rentDetails.durationMonths || 1) * (transaction.rentDetails.rentPricePerMonth || 0) * qty;
        const keyMoney = transaction.rentDetails.hasKeyMoney ? (transaction.rentDetails.keyMoneyAmount || 0) : 0;
        const delivery = transaction.deliveryCharges || 0;
        transaction.rentDetails.totalRentValue = totalRentValue;
        transaction.rentDetails.totalRentalPayable = totalRentValue + keyMoney + delivery;
        transaction.rentDetails.outstandingRentalBalance = Math.max(0, transaction.rentDetails.totalRentalPayable - (transaction.rentDetails.totalRentalPaid || 0));
      }
    }

    transaction.markModified('buyDetails');
    transaction.markModified('rentDetails');
    await transaction.save();

    res.json({ success: true, transaction });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getTransactions,
  getTransactionById,
  createTransaction,
  payMonthRent,
  updateTransaction,
  updateDeliveryStatus,
  processReturn,
  recordPayment,
};
