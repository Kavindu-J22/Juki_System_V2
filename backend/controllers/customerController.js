const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');

// Generate Next CID (e.g. CUST-001, CUST-002)
const generateCID = async () => {
  const lastCustomer = await Customer.findOne().sort({ createdAt: -1 });
  if (!lastCustomer || !lastCustomer.cid) {
    return 'CUST-001';
  }
  const match = lastCustomer.cid.match(/CUST-(\d+)/);
  if (match) {
    const nextNum = parseInt(match[1], 10) + 1;
    return `CUST-${String(nextNum).padStart(3, '0')}`;
  }
  return `CUST-${Date.now().toString().slice(-4)}`;
};

// @desc    Get all customers with search & pagination
// @route   GET /api/customers
// @access  Private
const getCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      // Check if search matches serial number in transactions
      const matchingTransactions = await Transaction.find({
        serialNumbers: { $regex: search, $options: 'i' },
      }).select('customer');

      const customerIdsFromSerial = matchingTransactions.map(t => t.customer);

      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { cid: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { nic: { $regex: search, $options: 'i' } },
          { region: { $regex: search, $options: 'i' } },
          { _id: { $in: customerIdsFromSerial } },
        ],
      };
    }

    const customers = await Customer.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: customers.length, customers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single customer profile with full history & running balance
// @route   GET /api/customers/:id
// @access  Private
const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Retrieve all transactions (Sales & Rentals) for this customer
    const transactions = await Transaction.find({ customer: customer._id })
      .populate('machinery')
      .sort({ createdAt: -1 });

    // Calculate running balance and statistics
    let totalPurchasedUnits = 0;
    let totalRentedUnits = 0;
    let totalCharges = 0;
    let totalPaymentsReceived = 0;
    let totalProfitContributed = 0;

    const purchasedMachines = [];
    const rentedMachines = [];
    const allSerialNumbers = [];
    const paymentLedger = [];

    for (const tx of transactions) {
      if (tx.serialNumbers && tx.serialNumbers.length > 0) {
        allSerialNumbers.push(...tx.serialNumbers);
      }

      if (tx.transactionType === 'BUY') {
        totalPurchasedUnits += tx.quantity || 1;
        const subtotal = tx.buyDetails?.totalAmount || 0;
        const paid = tx.buyDetails?.paidAmount || 0;
        const profit = tx.buyDetails?.totalGrossProfit || 0;

        totalCharges += subtotal;
        totalPaymentsReceived += paid;
        totalProfitContributed += profit;

        purchasedMachines.push({
          invoiceNumber: tx.invoiceNumber,
          date: tx.dispatchDate || tx.createdAt,
          machinery: tx.machinerySnapshot?.model || (tx.machinery ? tx.machinery.model : 'Machinery'),
          brand: tx.machinerySnapshot?.brand || (tx.machinery ? tx.machinery.brand : ''),
          quantity: tx.quantity,
          serialNumbers: tx.serialNumbers,
          totalAmount: subtotal,
          paidAmount: paid,
          outstandingAmount: tx.buyDetails?.outstandingAmount || 0,
          status: tx.buyDetails?.settlementStatus,
        });
      } else if (tx.transactionType === 'RENT') {
        totalRentedUnits += tx.quantity || 1;
        const totalRent = tx.rentDetails?.totalRentalPayable || tx.rentDetails?.totalRentValue || 0;
        const paid = tx.rentDetails?.totalRentalPaid || 0;
        const profit = paid; // Simplified rental net contribution

        totalCharges += totalRent;
        totalPaymentsReceived += paid;
        totalProfitContributed += profit;

        rentedMachines.push({
          agreementNumber: tx.invoiceNumber,
          date: tx.dispatchDate || tx.createdAt,
          machinery: tx.machinerySnapshot?.model || (tx.machinery ? tx.machinery.model : 'Machinery'),
          brand: tx.machinerySnapshot?.brand || (tx.machinery ? tx.machinery.brand : ''),
          quantity: tx.quantity,
          serialNumbers: tx.serialNumbers,
          durationMonths: tx.rentDetails?.durationMonths,
          monthlyRent: tx.rentDetails?.rentPricePerMonth,
          totalRentalPayable: totalRent,
          totalRentalPaid: paid,
          outstandingBalance: tx.rentDetails?.outstandingRentalBalance || 0,
          returnStatus: tx.rentDetails?.returnStatus,
          deliveryStatus: tx.deliveryStatus,
          nextDueDate: tx.rentDetails?.nextPaymentDueDate,
        });
      }

      // Collect payments
      if (tx.payments && tx.payments.length > 0) {
        tx.payments.forEach(p => {
          paymentLedger.push({
            txId: tx._id,
            invoiceNumber: tx.invoiceNumber,
            date: p.date,
            amount: p.amount,
            paymentType: p.paymentType,
            paymentMethod: p.paymentMethod,
            reference: p.reference,
            notes: p.notes,
          });
        });
      }
    }

    // Running Balance = Previous Balance + New Charges - Payments
    const previousBalance = customer.previousBalance || 0;
    const runningBalance = previousBalance + totalCharges - totalPaymentsReceived;

    res.json({
      success: true,
      customer,
      stats: {
        totalPurchasedUnits,
        totalRentedUnits,
        totalCharges,
        totalPaymentsReceived,
        previousBalance,
        runningBalance,
        totalProfitContributed,
      },
      purchasedMachines,
      rentedMachines,
      allSerialNumbers: [...new Set(allSerialNumbers)],
      paymentLedger: paymentLedger.sort((a, b) => new Date(b.date) - new Date(a.date)),
      rawTransactions: transactions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create customer
// @route   POST /api/customers
// @access  Private
const createCustomer = async (req, res) => {
  try {
    const { name, nic, phone, email, region, address, previousBalance, notes } = req.body;

    if (!name || !phone || !region || !address) {
      return res.status(400).json({ success: false, message: 'Please provide Name, Phone, Region, and Address' });
    }

    const cid = await generateCID();

    const customer = await Customer.create({
      cid,
      name,
      nic,
      phone,
      email,
      region,
      address,
      previousBalance: Number(previousBalance) || 0,
      notes,
    });

    res.status(201).json({ success: true, customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({ success: true, customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private/Admin
const deleteCustomer = async (req, res) => {
  try {
    const txCount = await Transaction.countDocuments({ customer: req.params.id });
    if (txCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete customer with ${txCount} existing transactions in sales or rental ledger`,
      });
    }

    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({ success: true, message: 'Customer removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
