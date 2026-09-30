const Transaction = require('../models/Transaction');
const { sendRentalAlertEmail } = require('./emailService');

/**
 * Checks all active rentals and determines their alert level:
 * - 7 days remaining
 * - 3 days remaining
 * - Due today
 * - Overdue
 */
const checkRentalAlerts = async (sendEmails = false) => {
  try {
    const activeRentals = await Transaction.find({
      transactionType: 'RENT',
      'rentDetails.returnStatus': 'In Use',
    }).populate('customer machinery');

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const alerts = [];

    for (const rental of activeRentals) {
      if (!rental.rentDetails.nextPaymentDueDate) continue;

      const dueDate = new Date(rental.rentDetails.nextPaymentDueDate);
      dueDate.setHours(0, 0, 0, 0);

      const diffTime = dueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let alertType = null;
      let alertLabel = '';
      let severity = 'info';

      if (diffDays < 0) {
        alertType = 'OVERDUE';
        alertLabel = `Overdue by ${Math.abs(diffDays)} day(s)`;
        severity = 'danger';
      } else if (diffDays === 0) {
        alertType = 'DUE_TODAY';
        alertLabel = 'Payment Due Today!';
        severity = 'warning';
      } else if (diffDays <= 3) {
        alertType = '3_DAYS_REMAINING';
        alertLabel = `Due in ${diffDays} day(s)`;
        severity = 'warning';
      } else if (diffDays <= 7) {
        alertType = '7_DAYS_REMAINING';
        alertLabel = `Due in ${diffDays} day(s)`;
        severity = 'info';
      }

      if (alertType) {
        const alertObj = {
          rentalId: rental._id,
          invoiceNumber: rental.invoiceNumber,
          customerName: rental.customer ? rental.customer.name : rental.customerSnapshot?.name,
          customerPhone: rental.customer ? rental.customer.phone : rental.customerSnapshot?.phone,
          customerEmail: rental.customer ? rental.customer.email : '',
          machineryModel: rental.machinery ? `${rental.machinery.brand} ${rental.machinery.model}` : rental.machinerySnapshot?.model,
          serialNumbers: rental.serialNumbers || [],
          monthlyRent: rental.rentDetails.rentPricePerMonth,
          dueDate: rental.rentDetails.nextPaymentDueDate,
          diffDays,
          alertType,
          alertLabel,
          severity,
        };

        alerts.push(alertObj);

        // Optionally send email alert
        if (sendEmails) {
          await sendRentalAlertEmail({
            customerEmail: alertObj.customerEmail,
            customerName: alertObj.customerName,
            machineModel: alertObj.machineryModel,
            invoiceNumber: alertObj.invoiceNumber,
            alertType: alertObj.alertType,
            dueDate: alertObj.dueDate,
            amountDue: alertObj.monthlyRent,
            serialNumbers: alertObj.serialNumbers,
          });
        }
      }
    }

    return alerts;
  } catch (error) {
    console.error('Error running checkRentalAlerts:', error.message);
    return [];
  }
};

module.exports = {
  checkRentalAlerts,
};
