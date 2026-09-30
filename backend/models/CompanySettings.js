const mongoose = require('mongoose');

const companySettingsSchema = new mongoose.Schema({
  companyName: {
    type: String,
    default: 'Anujaya & Global Enterprises Consortium',
  },
  tagline: {
    type: String,
    default: 'Industrial Apparel Machinery & Heavy Equipment Solutions',
  },
  address: {
    type: String,
    default: 'No. 45/A, Katunayake Industrial Zone & 112 Textile Hub, Colombo, Sri Lanka',
  },
  phone: {
    type: String,
    default: '+94 11 234 5678 / +94 77 123 4567',
  },
  email: {
    type: String,
    default: 'kavindujayasinghesecondary@gmail.com',
  },
  taxId: {
    type: String,
    default: 'VAT-102938475-7000 / SVAT-09281',
  },
  anujayaSharePercent: {
    type: Number,
    default: 50,
  },
  globalSharePercent: {
    type: Number,
    default: 50,
  },
  exchangeRateUsdToLkr: {
    type: Number,
    default: 310,
  },
  invoiceFooterNote: {
    type: String,
    default: 'Thank you for your business with Anujaya & Global Consortium. Goods once sold are backed by standard warranty.',
  },
  rentalAgreementTerms: [{
    type: String,
  }],
  authorizedSignatoryName: {
    type: String,
    default: 'Managing Director / Consortium Executive Board',
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('CompanySettings', companySettingsSchema);
