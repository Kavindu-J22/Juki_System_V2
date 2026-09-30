const express = require('express');
const router = express.Router();
const {
  getExpenses,
  createExpense,
  payExpense,
  deleteExpense,
} = require('../controllers/expenseController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getExpenses)
  .post(authorize('Admin'), createExpense);

router.route('/:id/pay')
  .put(authorize('Admin'), payExpense);

router.route('/:id')
  .delete(authorize('Admin'), deleteExpense);

module.exports = router;
