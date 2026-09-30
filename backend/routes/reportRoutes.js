const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getDetailedReports,
  exportReportExcel,
  triggerAlertCheck,
} = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/dashboard-stats', getDashboardStats);
router.get('/detailed', getDetailedReports);
router.post('/export-excel', exportReportExcel);
router.post('/trigger-alerts', triggerAlertCheck);

module.exports = router;
