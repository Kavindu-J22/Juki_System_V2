const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    enum: ['RENTS_OWED', 'SALARIES', 'LIABILITIES_LOANS', 'OPERATING_EXPENSES'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  paidAmount: {
    type: Number,
    default: 0,
  },
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'PARTIAL', 'PAID'],
    default: 'PENDING',
  },
  dueDate: {
    type: Date,
  },
  paymentDate: {
    type: Date,
  },
  recipientOrEntity: {
    type: String,
    required: true,
    trim: true, // e.g. "Ceylon Sewing Machineries Ltd (Third-Party Rent)", "Driver - Kamal", "Commercial Bank Loan #449"
  },
  machineryRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Machinery',
  },
  paymentMethod: {
    type: String,
    enum: ['Bank Wire/SLIPS', 'Corporate Cheque', 'Cash', 'Petty Cash', 'Other'],
    default: 'Bank Wire/SLIPS',
  },
  referenceDoc: {
    type: String,
    default: '',
  },
  notes: {
    type: String,
    default: '',
  },
  recordedBy: {
    type: String,
    default: 'Admin',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Expense', expenseSchema);
