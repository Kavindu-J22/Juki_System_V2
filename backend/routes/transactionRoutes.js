const express = require('express');
const router = express.Router();
const {
  getTransactions,
  getTransactionById,
  createTransaction,
  payMonthRent,
  updateTransaction,
  updateDeliveryStatus,
  processReturn,
  recordPayment,
} = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getTransactions)
  .post(createTransaction);

router.route('/:id')
  .get(getTransactionById)
  .put(updateTransaction);

router.route('/:id/delivery-status')
  .put(updateDeliveryStatus);

router.route('/:id/return')
  .post(processReturn);

router.route('/:id/payments')
  .post(recordPayment);

router.route('/:id/pay-month')
  .post(payMonthRent);

module.exports = router;
