const express = require('express');
const router = express.Router();
const {
  getPartnerLedger,
  createPartnerEntry,
  updatePartnerEntry,
  deletePartnerEntry,
} = require('../controllers/partnerLedgerController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(authorize('Admin', 'Partner'), getPartnerLedger)
  .post(authorize('Admin', 'Partner'), createPartnerEntry);

router.route('/:id')
  .put(authorize('Admin', 'Partner'), updatePartnerEntry)
  .delete(authorize('Admin'), deletePartnerEntry);

module.exports = router;
