const mongoose = require('mongoose');

const partnerLedgerSchema = new mongoose.Schema({
  partnerCompany: {
    type: String,
    enum: ['Anujaya Enterprises', 'Global Enterprises'],
    required: true,
  },
  entryType: {
    type: String,
    enum: ['CAPITAL_DRAW', 'EQUITY_INJECTION', 'DISBURSEMENT', 'PROFIT_DISTRIBUTION'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  paymentMethod: {
    type: String,
    enum: ['Bank Wire/SLIPS', 'Corporate Cheque', 'Cash'],
    default: 'Bank Wire/SLIPS',
  },
  referenceDoc: {
    type: String,
    default: '',
  },
  approvedBy: {
    type: String,
    default: 'Admin',
  },
  notes: {
    type: String,
    default: '',
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('PartnerLedger', partnerLedgerSchema);
