const PartnerLedger = require('../models/PartnerLedger');

// @desc    Get partner capital entries & equity balance
// @route   GET /api/partner-ledger
// @access  Private (Admin & Partner)
const getPartnerLedger = async (req, res) => {
  try {
    const { partnerCompany, entryType } = req.query;
    let query = {};

    if (partnerCompany && partnerCompany !== 'ALL') {
      query.partnerCompany = partnerCompany;
    }

    if (entryType && entryType !== 'ALL') {
      query.entryType = entryType;
    }

    const entries = await PartnerLedger.find(query).sort({ date: -1 });

    // Calculate Partner Equity balances
    const stats = {
      anujaya: {
        equityInjected: 0,
        capitalDraws: 0,
        disbursements: 0,
        profitDistributed: 0,
        netBalance: 0,
      },
      global: {
        equityInjected: 0,
        capitalDraws: 0,
        disbursements: 0,
        profitDistributed: 0,
        netBalance: 0,
      },
    };

    const allEntries = await PartnerLedger.find();
    allEntries.forEach(item => {
      const isAnujaya = item.partnerCompany === 'Anujaya Enterprises';
      const target = isAnujaya ? stats.anujaya : stats.global;

      if (item.entryType === 'EQUITY_INJECTION') {
        target.equityInjected += item.amount;
      } else if (item.entryType === 'CAPITAL_DRAW') {
        target.capitalDraws += item.amount;
      } else if (item.entryType === 'DISBURSEMENT') {
        target.disbursements += item.amount;
      } else if (item.entryType === 'PROFIT_DISTRIBUTION') {
        target.profitDistributed += item.amount;
      }
    });

    stats.anujaya.netBalance = stats.anujaya.equityInjected - stats.anujaya.capitalDraws - stats.anujaya.disbursements;
    stats.global.netBalance = stats.global.equityInjected - stats.global.capitalDraws - stats.global.disbursements;

    res.json({
      success: true,
      stats,
      count: entries.length,
      entries,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add partner ledger entry (Capital draw, equity, disbursement)
// @route   POST /api/partner-ledger
// @access  Private (Admin & Partner)
const createPartnerEntry = async (req, res) => {
  try {
    const { partnerCompany, entryType, amount, description, paymentMethod, referenceDoc, notes } = req.body;

    if (!partnerCompany || !entryType || !amount || !description) {
      return res.status(400).json({ success: false, message: 'Please provide Company, Entry Type, Amount, and Description' });
    }

    const entry = await PartnerLedger.create({
      partnerCompany,
      entryType,
      amount: Number(amount),
      description,
      paymentMethod: paymentMethod || 'Bank Wire/SLIPS',
      referenceDoc: referenceDoc || '',
      approvedBy: req.user ? req.user.name : 'Authorized Signatory',
      notes: notes || '',
    });

    res.status(201).json({ success: true, entry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a partner ledger entry (edit Capital Draw, etc.)
// @route   PUT /api/partner-ledger/:id
// @access  Private (Admin & Partner)
const updatePartnerEntry = async (req, res) => {
  try {
    const entry = await PartnerLedger.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Ledger entry not found' });
    }

    const { amount, description, paymentMethod, referenceDoc, notes, entryType } = req.body;

    if (amount !== undefined) entry.amount = Number(amount);
    if (description !== undefined) entry.description = description;
    if (paymentMethod !== undefined) entry.paymentMethod = paymentMethod;
    if (referenceDoc !== undefined) entry.referenceDoc = referenceDoc;
    if (notes !== undefined) entry.notes = notes;
    if (entryType !== undefined) entry.entryType = entryType;
    entry.approvedBy = req.user ? req.user.name : 'Authorized Signatory';

    await entry.save();
    res.json({ success: true, entry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a partner ledger entry
// @route   DELETE /api/partner-ledger/:id
// @access  Private (Admin only)
const deletePartnerEntry = async (req, res) => {
  try {
    const entry = await PartnerLedger.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Ledger entry not found' });
    }
    await entry.deleteOne();
    res.json({ success: true, message: 'Ledger entry deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPartnerLedger,
  createPartnerEntry,
  updatePartnerEntry,
  deletePartnerEntry,
};
