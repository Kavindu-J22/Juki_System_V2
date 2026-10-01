const Transaction = require('../models/Transaction');
const Machinery = require('../models/Machinery');
const Customer = require('../models/Customer');
const { sendDispatchNotificationEmail } = require('../services/emailService');

// Generate Unique Invoice / Agreement Number
const generateInvoiceNumber = async (type) => {
  const prefix = type === 'BUY' ? 'INV' : 'AGR';
  const count = await Transaction.countDocuments({ transactionType: type });
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(count + 101).padStart(4, '0')}`;
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

      const firstTwoMonthsAmount = rentPricePerMonth * Math.min(2, durationMonths) * requestedQty;
      const firstTwoMonthsPaidAmount = Number(rentDetails.firstTwoMonthsPaidAmount) || 0;
      let firstTwoMonthsStatus = 'Credit / Pending';
      if (firstTwoMonthsPaidAmount >= firstTwoMonthsAmount && firstTwoMonthsAmount > 0) firstTwoMonthsStatus = 'Fully Paid';
      else if (firstTwoMonthsPaidAmount > 0) firstTwoMonthsStatus = 'Partial Payment';

      // Next payment due date (e.g. 1 month from dispatchDate or 2 months if first 2 months were paid)
      const startDate = dispatchDate ? new Date(dispatchDate) : new Date();
      const nextDue = new Date(startDate);
      const advanceMonths = firstTwoMonthsStatus === 'Fully Paid' ? 2 : 1;
      nextDue.setMonth(nextDue.getMonth() + advanceMonths);

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
        currentMonthCycle: 1,
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

      if (firstTwoMonthsPaidAmount > 0) {
        initialPayments.push({
          date: startDate,
          amount: firstTwoMonthsPaidAmount,
          paymentType: 'MONTHLY_RENT',
          paymentMethod: rentDetails.paymentTerms || 'Bank Wire/SLIPS',
          reference: rentDetails.paymentReference || 'Initial Advance Rent',
          notes: 'First advance rent payment captured at dispatch',
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

    const paymentEntry = {
      date: new Date(),
      amount: paymentAmount,
      paymentType: paymentType || 'MONTHLY_RENT',
      paymentMethod: paymentMethod || 'Bank Wire/SLIPS',
      reference: reference || '',
      monthCovered: monthCovered || '',
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

      // Advance due date by 1 month if monthly rent collection recorded
      if (paymentType === 'MONTHLY_RENT' && transaction.rentDetails.nextPaymentDueDate) {
        const nextDate = new Date(transaction.rentDetails.nextPaymentDueDate);
        nextDate.setMonth(nextDate.getMonth() + 1);
        transaction.rentDetails.nextPaymentDueDate = nextDate;
        transaction.rentDetails.currentMonthCycle = (transaction.rentDetails.currentMonthCycle || 1) + 1;
      }
    }

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
    const { monthNumber, paymentMethod, reference, notes } = req.body;
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    if (transaction.transactionType !== 'RENT') {
      return res.status(400).json({ success: false, message: 'This endpoint is for RENT transactions only' });
    }

    // Check if this month is already covered
    const alreadyCovered = transaction.payments.some(
      (p) => p.paymentType === 'MONTHLY_RENT' && String(p.monthCovered) === String(monthNumber)
    );
    if (alreadyCovered) {
      return res.status(400).json({ success: false, message: `Month ${monthNumber} rent is already recorded as paid` });
    }

    const monthlyAmount = (transaction.rentDetails.rentPricePerMonth || 0) * (transaction.quantity || 1);

    const paymentEntry = {
      date: new Date(),
      amount: monthlyAmount,
      paymentType: 'MONTHLY_RENT',
      paymentMethod: paymentMethod || 'Bank Wire/SLIPS',
      reference: reference || `Month ${monthNumber} Rent`,
      monthCovered: String(monthNumber),
      notes: notes || `Month ${monthNumber} rental payment`,
      receivedBy: req.user ? req.user.name : 'Staff',
    };

    transaction.payments.push(paymentEntry);
    transaction.rentDetails.totalRentalPaid = (transaction.rentDetails.totalRentalPaid || 0) + monthlyAmount;
    transaction.rentDetails.outstandingRentalBalance = Math.max(
      0,
      (transaction.rentDetails.totalRentalPayable || 0) - transaction.rentDetails.totalRentalPaid
    );

    // Advance nextPaymentDueDate by 1 month
    if (transaction.rentDetails.nextPaymentDueDate) {
      const nextDate = new Date(transaction.rentDetails.nextPaymentDueDate);
      nextDate.setMonth(nextDate.getMonth() + 1);
      transaction.rentDetails.nextPaymentDueDate = nextDate;
    }
    transaction.rentDetails.currentMonthCycle = (transaction.rentDetails.currentMonthCycle || 1) + 1;

    transaction.markModified('rentDetails');
    await transaction.save();

    res.json({ success: true, message: `Month ${monthNumber} rent payment recorded`, transaction });
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
