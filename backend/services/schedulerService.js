const cron = require('node-cron');
const { checkRentalAlerts } = require('./alertService');

// State tracking for the automated email reminder scheduler
let schedulerState = {
  isActive: true,
  scheduleDescription: 'Daily at 12:00 AM (Midnight) & 12:00 PM (Noon)',
  cronExpression: '0 0,12 * * *',
  timezone: 'Asia/Colombo',
  lastRunTime: null,
  lastRunAlertsCount: 0,
  lastRunEmailsSent: 0,
  lastRunStatus: 'INITIALIZED',
  runHistory: [],
};

const calculateNextRun = () => {
  const now = new Date();
  // Colombo timezone offset or local time
  const colomboDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Colombo' }));
  const hours = colomboDate.getHours();

  let next = new Date(colomboDate);
  if (hours < 12) {
    next.setHours(12, 0, 0, 0);
  } else {
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
  }
  return next.toLocaleString('en-GB', {
    timeZone: 'Asia/Colombo',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const executeAutomatedReminderScan = async (triggerSource = 'AUTOMATIC_CRON') => {
  console.log(`\n========================================================================`);
  console.log(`⏰ [${new Date().toISOString()}] Automated Rental Reminder Scan Initiated (${triggerSource})`);
  console.log(`Checking rental agreements for 7-day, 3-day, Due Today, and Overdue deadlines...`);
  console.log(`========================================================================`);

  try {
    // Run alert check with sendEmails = true so reminders are automatically dispatched!
    const alerts = await checkRentalAlerts(true);

    const logEntry = {
      timestamp: new Date(),
      triggerSource,
      alertsFound: alerts.length,
      emailsSent: alerts.length, // checkRentalAlerts attempts email for each found alert
      details: alerts.map(a => ({
        invoiceNumber: a.invoiceNumber,
        customerName: a.customerName,
        customerEmail: a.customerEmail,
        alertType: a.alertType,
        dueDate: a.dueDate,
      })),
      status: 'SUCCESS',
    };

    schedulerState.lastRunTime = new Date();
    schedulerState.lastRunAlertsCount = alerts.length;
    schedulerState.lastRunEmailsSent = alerts.length;
    schedulerState.lastRunStatus = 'SUCCESS';
    schedulerState.runHistory.unshift(logEntry);
    if (schedulerState.runHistory.length > 20) schedulerState.runHistory.pop();

    console.log(`✅ Automated Scan Completed Successfully!`);
    console.log(`📧 Alerts Identified & Email Reminders Sent: ${alerts.length}`);
    alerts.forEach((a, i) => {
      console.log(`   ${i + 1}. [${a.alertType}] ${a.customerName} - ${a.invoiceNumber} (${a.machineryModel})`);
    });
    console.log(`========================================================================\n`);

    return { success: true, count: alerts.length, alerts };
  } catch (error) {
    console.error(`❌ Automated Reminder Scan Failed:`, error.message);
    schedulerState.lastRunStatus = 'ERROR';
    return { success: false, error: error.message };
  }
};

/**
 * Initializes the automated daily schedule:
 * Runs twice daily at:
 * - 12:00 AM (00:00 - Midnight)
 * - 12:00 PM (12:00 - Noon)
 * in Asia/Colombo timezone (Sri Lanka Standard Time)
 */
const initAutomatedReminders = () => {
  console.log('📅 Initializing Automated Email Reminder Scheduler...');
  console.log('   Schedule: 0 0,12 * * * (12:00 AM & 12:00 PM daily)');
  console.log('   Timezone: Asia/Colombo');
  console.log(`   Next Scheduled Run: ${calculateNextRun()}`);

  cron.schedule(
    '0 0,12 * * *',
    async () => {
      console.log('🔔 CRON TRIGGER: 12:00 AM / 12:00 PM Automated Reminder Scan firing now!');
      await executeAutomatedReminderScan('DAILY_CRON_12_AM_12_PM');
    },
    {
      scheduled: true,
      timezone: 'Asia/Colombo',
    }
  );

  schedulerState.isActive = true;
};

const getSchedulerStatus = () => {
  return {
    ...schedulerState,
    nextRunTime: calculateNextRun(),
  };
};

module.exports = {
  initAutomatedReminders,
  executeAutomatedReminderScan,
  getSchedulerStatus,
};
