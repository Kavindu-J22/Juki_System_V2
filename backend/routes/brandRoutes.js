const express = require('express');
const router = express.Router();
const {
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand,
} = require('../controllers/brandController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getBrands)
  .post(authorize('Admin'), createBrand);

router.route('/:id')
  .put(authorize('Admin'), updateBrand)
  .delete(authorize('Admin'), deleteBrand);

module.exports = router;
