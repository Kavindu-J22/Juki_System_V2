const mongoose = require('mongoose');

const machinerySchema = new mongoose.Schema({
  sku: {
    type: String,
    unique: true,
    required: true,
    trim: true,
  },
  brand: {
    type: String,
    required: true,
    trim: true,
  },
  model: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  initialBatchSets: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  dispatched: {
    type: Number,
    default: 0,
    min: 0,
  },
  unit: {
    type: String,
    default: 'SETS',
    trim: true,
  },
  unitWeight: {
    type: String,
    default: '',
  },
  // Financial parameters
  factoryFobUsd: {
    type: Number,
    required: true,
    default: 0,
  },
  exchangeRate: {
    type: Number,
    required: true,
    default: 310, // USD to LKR
  },
  baseLkr: {
    type: Number,
    default: 0,
  },
  customsDutyLkr: {
    type: Number,
    default: 0,
  },
  landedUnitCost: {
    type: Number,
    default: 0,
  },
  wholesaleBenchmark: {
    type: Number,
    required: true,
    default: 0,
  },
  retailBenchmark: {
    type: Number,
    required: true,
    default: 0,
  },
  rentPricePerMonth: {
    type: Number,
    required: true,
    default: 0,
  },
  // Asset Ownership
  ownershipType: {
    type: String,
    enum: ['OUR_ASSET', 'THIRD_PARTY_ASSET'],
    default: 'OUR_ASSET',
  },
  thirdPartyCompany: {
    type: String,
    default: '',
    trim: true,
  },
  thirdPartyRentalCostOwed: {
    type: Number,
    default: 0, // monthly cost consortium owes to third party
  },
  availableSerialNumbers: [{
    type: String,
    trim: true,
  }],
  status: {
    type: String,
    enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'],
    default: 'IN_STOCK',
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Auto calculate Base LKR, Landed Cost and inWarehouse
machinerySchema.virtual('inWarehouse').get(function() {
  return Math.max(0, (this.initialBatchSets || 0) - (this.dispatched || 0));
});

machinerySchema.pre('save', function(next) {
  this.baseLkr = (this.factoryFobUsd || 0) * (this.exchangeRate || 310);
  this.landedUnitCost = this.baseLkr + (this.customsDutyLkr || 0);

  const available = (this.initialBatchSets || 0) - (this.dispatched || 0);
  if (available <= 0) {
    this.status = 'OUT_OF_STOCK';
  } else if (available < 5) {
    this.status = 'LOW_STOCK';
  } else {
    this.status = 'IN_STOCK';
  }
  next();
});

module.exports = mongoose.model('Machinery', machinerySchema);
