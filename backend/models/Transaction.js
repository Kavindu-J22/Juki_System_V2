const mongoose = require('mongoose');

const paymentHistorySchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now,
  },
  amount: {
    type: Number,
    required: true,
  },
  paymentType: {
    type: String,
    enum: ['MONTHLY_RENT', 'KEY_MONEY', 'SALES_SETTLEMENT', 'DELIVERY_FEE', 'OTHER'],
    default: 'MONTHLY_RENT',
  },
  paymentMethod: {
    type: String,
    enum: ['Bank Wire/SLIPS', 'Corporate Cheque', 'COD', 'Letter of Credit (LC)', '30-Day Credit', 'Cash'],
    default: 'Bank Wire/SLIPS',
  },
  reference: {
    type: String,
    default: '',
  },
  monthCovered: {
    type: String, // e.g. "Month 1", "Month 2 - Oct 2026"
    default: '',
  },
  notes: {
    type: String,
    default: '',
  },
  receivedBy: {
    type: String,
    default: 'Staff',
  }
});

const transactionSchema = new mongoose.Schema({
  transactionType: {
    type: String,
    enum: ['BUY', 'RENT'],
    required: true,
  },
  invoiceNumber: {
    type: String,
    unique: true,
    required: true,
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  customerSnapshot: {
    name: String,
    cid: String,
    phone: String,
    region: String,
    address: String,
  },
  machinery: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Machinery',
    required: true,
  },
  machinerySnapshot: {
    sku: String,
    brand: String,
    model: String,
    landedUnitCost: Number,
    ownershipType: String,
    thirdPartyCompany: String,
    thirdPartyRentalCostOwed: Number,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  serialNumbers: [{
    type: String,
    trim: true,
  }],
  dispatchDate: {
    type: Date,
    default: Date.now,
  },
  deliveryStatus: {
    type: String,
    enum: ['Pending', 'Ongoing', 'Hand Overed'],
    default: 'Pending',
  },
  handOverDate: {
    type: Date,
  },
  deliveryCharges: {
    type: Number,
    default: 0,
  },
  otherCharges: {
    type: Number,
    default: 0,
  },

  // BUY SPECIFICS
  buyDetails: {
    benchmarkType: {
      type: String,
      enum: ['Wholesale', 'Retail', 'Custom'],
      default: 'Wholesale',
    },
    unitPrice: {
      type: Number,
      default: 0,
    },
    subtotal: {
      type: Number,
      default: 0,
    },
    taxIncluded: {
      type: Boolean,
      default: false,
    },
    taxPercent: {
      type: Number,
      default: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    outstandingAmount: {
      type: Number,
      default: 0,
    },
    settlementStatus: {
      type: String,
      enum: ['Fully Paid', 'Partial Payment', 'Credit / Pending'],
      default: 'Credit / Pending',
    },
    paymentTerms: {
      type: String,
      enum: ['Bank Wire/SLIPS', 'Corporate Cheque', 'COD', 'Letter of Credit (LC)', '30-Day Credit', 'Cash'],
      default: 'Bank Wire/SLIPS',
    },
    paymentReference: {
      type: String,
      default: '',
    },
    // Profit Calculation & Split
    totalCostOfGoods: {
      type: Number,
      default: 0,
    },
    totalGrossProfit: {
      type: Number,
      default: 0,
    },
    profitSplitPercent: {
      anujayaPercent: {
        type: Number,
        default: 50,
      },
      globalPercent: {
        type: Number,
        default: 50,
      }
    },
    anujayaNetProfit: {
      type: Number,
      default: 0,
    },
    globalNetProfit: {
      type: Number,
      default: 0,
    }
  },

  // RENT SPECIFICS
  rentDetails: {
    durationMonths: {
      type: Number,
      default: 1,
      min: 1,
    },
    rentPricePerMonth: {
      type: Number,
      default: 0,
    },
    totalRentValue: {
      type: Number,
      default: 0,
    },
    // Key Money
    hasKeyMoney: {
      type: Boolean,
      default: false,
    },
    keyMoneyAmount: {
      type: Number,
      default: 0,
    },
    keyMoneyPaidAmount: {
      type: Number,
      default: 0,
    },
    keyMoneyStatus: {
      type: String,
      enum: ['Fully Paid', 'Partial Payment', 'Credit / Pending'],
      default: 'Credit / Pending',
    },
    // First 2 Months Payment
    firstTwoMonthsAmount: {
      type: Number,
      default: 0,
    },
    firstTwoMonthsPaidAmount: {
      type: Number,
      default: 0,
    },
    firstTwoMonthsStatus: {
      type: String,
      enum: ['Fully Paid', 'Partial Payment', 'Credit / Pending'],
      default: 'Credit / Pending',
    },
    paymentTerms: {
      type: String,
      enum: ['Bank Wire/SLIPS', 'Corporate Cheque', 'COD', 'Letter of Credit (LC)', '30-Day Credit', 'Cash'],
      default: 'Bank Wire/SLIPS',
    },
    paymentReference: {
      type: String,
      default: '',
    },
    termsAndConditions: [{
      type: String,
    }],
    warrantyCertificateTerms: {
      type: String,
      default: 'Standard 12 Months Consortium Technical & Service Warranty on Electronics and Mechanical Drive Assemblies.',
    },
    nextPaymentDueDate: {
      type: Date,
    },
    currentMonthCycle: {
      type: Number,
      default: 1,
    },
    // Return Lifecycle & 5th Day Rule Engine
    returnStatus: {
      type: String,
      enum: ['In Use', 'Returned'],
      default: 'In Use',
    },
    returnDate: {
      type: Date,
    },
    monthsBilled: {
      type: Number,
      default: 0,
    },
    monthsWaived: {
      type: Number,
      default: 0,
    },
    returnNotes: {
      type: String,
      default: '',
    },
    returnRecordedBy: {
      type: String,
      default: '',
    },
    // Total Financials for Rent
    totalRentalPayable: {
      type: Number,
      default: 0,
    },
    totalRentalPaid: {
      type: Number,
      default: 0,
    },
    outstandingRentalBalance: {
      type: Number,
      default: 0,
    },
    // Profit split on rental income
    anujayaRentalShare: {
      type: Number,
      default: 0,
    },
    globalRentalShare: {
      type: Number,
      default: 0,
    }
  },

  // Payment receipts recorded against this transaction
  payments: [paymentHistorySchema],

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdByName: {
    type: String,
    default: 'Staff',
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('Transaction', transactionSchema);
