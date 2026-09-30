const express = require('express');
const router = express.Router();
const {
  getMachinery,
  getMachineryById,
  createMachinery,
  updateMachinery,
  deleteMachinery,
} = require('../controllers/machineryController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getMachinery)
  .post(authorize('Admin'), createMachinery);

router.route('/:id')
  .get(getMachineryById)
  .put(authorize('Admin'), updateMachinery)
  .delete(authorize('Admin'), deleteMachinery);

module.exports = router;
