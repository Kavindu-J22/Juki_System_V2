const CompanySettings = require('../models/CompanySettings');

// @desc    Get company settings
// @route   GET /api/settings
// @access  Private
const getSettings = async (req, res) => {
  try {
    let settings = await CompanySettings.findOne();
    if (!settings) {
      settings = await CompanySettings.create({
        companyName: 'Anujaya & Global Enterprises Consortium',
        tagline: 'Industrial Apparel Machinery & Heavy Equipment Solutions',
        address: 'No. 45/A, Katunayake Export Processing Zone & 112 Textile Hub, Colombo, Sri Lanka',
        phone: '+94 11 234 5678 / +94 77 123 4567',
        email: 'kavindujayasinghesecondary@gmail.com',
        taxId: 'VAT-102938475-7000 / SVAT-09281',
        anujayaSharePercent: 50,
        globalSharePercent: 50,
        exchangeRateUsdToLkr: 310,
        invoiceFooterNote: 'Consortium certified genuine parts & machinery. Standard industrial warranty applies.',
        rentalAgreementTerms: [
          'Monthly rental must be paid on or before the agreed cycle date.',
          'Returns past the 5th day of a calendar cycle are subject to full month rental charge.',
          'Consortium technical engineers maintain 24/7 priority breakdown service support.',
          'Lessees are responsible for routine operator cleaning and specified lubrication oils.',
        ],
        authorizedSignatoryName: 'Consortium Executive Board / Managing Director',
      });
    }
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update company settings
// @route   PUT /api/settings
// @access  Private/Admin
const updateSettings = async (req, res) => {
  try {
    let settings = await CompanySettings.findOne();
    if (!settings) {
      settings = await CompanySettings.create(req.body);
    } else {
      settings = await CompanySettings.findByIdAndUpdate(settings._id, req.body, {
        new: true,
        runValidators: true,
      });
    }
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
