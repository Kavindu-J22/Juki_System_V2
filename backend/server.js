require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { checkRentalAlerts } = require('./services/alertService');
const { initAutomatedReminders } = require('./services/schedulerService');

// Connect to MongoDB
connectDB();

const app = express();

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Routes Mounting
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/brands', require('./routes/brandRoutes'));
app.use('/api/machinery', require('./routes/machineryRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/partner-ledger', require('./routes/partnerLedgerRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Anujaya & Global Enterprises Consortium ERP Backend Running',
    timestamp: new Date(),
  });
});

// Initialize Automated Daily Email Reminders Schedule (Runs 12:00 AM & 12:00 PM Asia/Colombo)
initAutomatedReminders();

// Startup rental alert deadline scan
setTimeout(() => {
  console.log('⏰ Running initial rental alert deadline scan...');
  checkRentalAlerts(false).then(alerts => {
    console.log(`📋 Found ${alerts.length} active rental payment alerts on system boot.`);
  });
}, 5000);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Juki Consortium ERP Backend running on port ${PORT}`);
});
