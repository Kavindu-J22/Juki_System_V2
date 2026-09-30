const express = require('express');
const router = express.Router();
const {
  getPartnerLedger,
  createPartnerEntry,
} = require('../controllers/partnerLedgerController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(authorize('Admin', 'Partner'), getPartnerLedger)
  .post(authorize('Admin', 'Partner'), createPartnerEntry);

module.exports = router;
