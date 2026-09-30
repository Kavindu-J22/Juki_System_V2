const Expense = require('../models/Expense');

// @desc    Get all expenses with category and status filter
// @route   GET /api/expenses
// @access  Private
const getExpenses = async (req, res) => {
  try {
    const { category, paymentStatus, search } = req.query;
    let query = {};

    if (category && category !== 'ALL') {
      query.category = category;
    }

    if (paymentStatus && paymentStatus !== 'ALL') {
      query.paymentStatus = paymentStatus;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { recipientOrEntity: { $regex: search, $options: 'i' } },
        { referenceDoc: { $regex: search, $options: 'i' } },
      ];
    }

    const expenses = await Expense.find(query)
      .populate('machineryRef', 'sku brand model')
      .sort({ createdAt: -1 });

    // Summary calculations
    const summary = {
      totalRentsOwed: 0,
      totalSalaries: 0,
      totalLiabilitiesLoans: 0,
      totalOperatingExpenses: 0,
      totalPaid: 0,
      totalPending: 0,
    };

    expenses.forEach(e => {
      const remaining = Math.max(0, e.amount - (e.paidAmount || 0));
      if (e.paymentStatus === 'PAID') {
        summary.totalPaid += e.amount;
      } else {
        summary.totalPaid += e.paidAmount || 0;
        summary.totalPending += remaining;
      }

      if (e.category === 'RENTS_OWED') summary.totalRentsOwed += e.amount;
      else if (e.category === 'SALARIES') summary.totalSalaries += e.amount;
      else if (e.category === 'LIABILITIES_LOANS') summary.totalLiabilitiesLoans += e.amount;
      else if (e.category === 'OPERATING_EXPENSES') summary.totalOperatingExpenses += e.amount;
    });

    res.json({ success: true, count: expenses.length, summary, expenses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new expense or liability
// @route   POST /api/expenses
// @access  Private/Admin
const createExpense = async (req, res) => {
  try {
    const {
      title,
      category,
      amount,
      paidAmount = 0,
      dueDate,
      recipientOrEntity,
      machineryRef,
      paymentMethod,
      referenceDoc,
      notes,
    } = req.body;

    if (!title || !category || !amount || !recipientOrEntity) {
      return res.status(400).json({ success: false, message: 'Please provide Title, Category, Amount, and Recipient' });
    }

    const totalAmt = Number(amount);
    const paidAmt = Number(paidAmount);
    let paymentStatus = 'PENDING';
    if (paidAmt >= totalAmt) {
      paymentStatus = 'PAID';
    } else if (paidAmt > 0) {
      paymentStatus = 'PARTIAL';
    }

    const expense = await Expense.create({
      title,
      category,
      amount: totalAmt,
      paidAmount: paidAmt,
      paymentStatus,
      dueDate: dueDate || undefined,
      paymentDate: paidAmt > 0 ? new Date() : undefined,
      recipientOrEntity,
      machineryRef: machineryRef || undefined,
      paymentMethod: paymentMethod || 'Bank Wire/SLIPS',
      referenceDoc: referenceDoc || '',
      notes: notes || '',
      recordedBy: req.user ? req.user.name : 'Admin',
    });

    res.status(201).json({ success: true, expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Record payment on an expense / liability
// @route   PUT /api/expenses/:id/pay
// @access  Private/Admin
const payExpense = async (req, res) => {
  try {
    const { amountPaid, paymentMethod, referenceDoc, notes } = req.body;
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense record not found' });
    }

    const addAmount = Number(amountPaid) || (expense.amount - (expense.paidAmount || 0));
    expense.paidAmount = (expense.paidAmount || 0) + addAmount;

    if (expense.paidAmount >= expense.amount) {
      expense.paymentStatus = 'PAID';
      expense.paymentDate = new Date();
    } else {
      expense.paymentStatus = 'PARTIAL';
    }

    if (paymentMethod) expense.paymentMethod = paymentMethod;
    if (referenceDoc) expense.referenceDoc = referenceDoc;
    if (notes) expense.notes = `${expense.notes ? expense.notes + ' | ' : ''}${notes}`;

    await expense.save();
    res.json({ success: true, message: 'Payment recorded on expense', expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private/Admin
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    res.json({ success: true, message: 'Expense record removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getExpenses,
  createExpense,
  payExpense,
  deleteExpense,
};
