const nodemailer = require('nodemailer');

// Configure transporter using the user's provided credentials
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER || 'kavindujayasinghesecondary@gmail.com',
    pass: process.env.SMTP_PASS || 'ittk ceqg thed ktqs', // Gmail App Password
  },
});

// Verify connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.warn('⚠️ Nodemailer Transporter Warning:', error.message);
  } else {
    console.log('📧 Email Service Ready: SMTP Authenticated (Jukiapp / kavindujayasinghesecondary@gmail.com)');
  }
});

const sendRentalAlertEmail = async ({
  customerEmail,
  customerName,
  machineModel,
  invoiceNumber,
  alertType,
  dueDate,
  amountDue,
  serialNumbers = []
}) => {
  try {
    const recipient = customerEmail || process.env.SMTP_USER; // fallback to admin if customer has no email
    let subject = '';
    let badgeColor = '#0284c7';
    let urgencyText = '';

    const formattedDate = new Date(dueDate).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    switch (alertType) {
      case '7_DAYS_REMAINING':
        subject = `📢 [Consortium Reminder] Rental Payment Due in 7 Days - Agreement #${invoiceNumber}`;
        badgeColor = '#0ea5e9';
        urgencyText = 'This is a friendly reminder that your monthly machinery rental payment is due in 7 days.';
        break;
      case '3_DAYS_REMAINING':
        subject = `⚠️ [Urgent Reminder] Rental Payment Due in 3 Days - Agreement #${invoiceNumber}`;
        badgeColor = '#f59e0b';
        urgencyText = 'Your machinery rental payment is due in 3 days. Please arrange timely transfer to ensure uninterrupted service.';
        break;
      case 'DUE_TODAY':
        subject = `🚨 [Payment Due Today] Machinery Rental Payment Due - Agreement #${invoiceNumber}`;
        badgeColor = '#ea580c';
        urgencyText = 'Your monthly machinery rental payment is due TODAY. Kindly submit your bank wire or slip reference.';
        break;
      case 'OVERDUE':
        subject = `🔴 [OVERDUE NOTICE] Immediate Settlement Required - Agreement #${invoiceNumber}`;
        badgeColor = '#dc2626';
        urgencyText = 'ATTENTION: Your rental payment cycle is OVERDUE. Please contact Consortium Accounts immediately.';
        break;
      default:
        subject = `Machinery Rental Alert - Agreement #${invoiceNumber}`;
        urgencyText = 'Notice regarding your apparel machinery rental agreement.';
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; background-color: #0b1120; color: #f8fafc; padding: 30px; border-radius: 8px; max-width: 600px; margin: auto;">
        <div style="text-align: center; border-bottom: 2px solid #334155; padding-bottom: 16px;">
          <h2 style="color: #38bdf8; margin: 0; font-size: 22px;">ANUJAYA & GLOBAL ENTERPRISES</h2>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Industrial Apparel Machinery & Heavy Equipment Consortium</p>
        </div>

        <div style="margin-top: 24px;">
          <span style="background-color: ${badgeColor}; color: white; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase;">
            ${alertType.replace(/_/g, ' ')}
          </span>
          <h3 style="color: #f1f5f9; margin-top: 14px;">Dear ${customerName || 'Valued Partner'},</h3>
          <p style="color: #cbd5e1; line-height: 1.6;">${urgencyText}</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #1e293b; border-radius: 6px; overflow: hidden;">
            <tr style="border-bottom: 1px solid #334155;">
              <td style="padding: 12px; color: #94a3b8; font-size: 13px;">Agreement / Invoice:</td>
              <td style="padding: 12px; color: #f8fafc; font-weight: bold;">${invoiceNumber}</td>
            </tr>
            <tr style="border-bottom: 1px solid #334155;">
              <td style="padding: 12px; color: #94a3b8; font-size: 13px;">Machinery Model:</td>
              <td style="padding: 12px; color: #38bdf8; font-weight: bold;">${machineModel}</td>
            </tr>
            <tr style="border-bottom: 1px solid #334155;">
              <td style="padding: 12px; color: #94a3b8; font-size: 13px;">Assigned Serial(s):</td>
              <td style="padding: 12px; color: #f8fafc;">${serialNumbers.length > 0 ? serialNumbers.join(', ') : 'Asset Fleet Unit'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #334155;">
              <td style="padding: 12px; color: #94a3b8; font-size: 13px;">Due Date:</td>
              <td style="padding: 12px; color: #fbbf24; font-weight: bold;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding: 12px; color: #94a3b8; font-size: 13px;">Amount Due:</td>
              <td style="padding: 12px; color: #34d399; font-size: 16px; font-weight: bold;">LKR ${Number(amountDue).toLocaleString()}</td>
            </tr>
          </table>

          <div style="background-color: #1e293b; padding: 14px; border-left: 4px solid #38bdf8; border-radius: 4px; font-size: 12px; color: #94a3b8;">
            <strong>Consortium Banking Details:</strong><br/>
            Bank: Commercial Bank of Ceylon PLC / Account: 1000847291<br/>
            Beneficiary: Anujaya Enterprises (Consortium Ops)<br/>
            Reference: ${invoiceNumber}
          </div>

          <p style="color: #64748b; font-size: 11px; margin-top: 24px; text-align: center;">
            This is an automated notification from Jukiapp ERP System. For inquiries, contact accounts@anujaya-global.com
          </p>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"Jukiapp Consortium Alerts" <${process.env.SMTP_USER}>`,
      to: recipient,
      bcc: process.env.SMTP_USER, // always keep consortium admin in loop
      subject,
      html: htmlContent,
    });

    console.log(`✅ Alert Email Sent successfully to ${recipient}: Message ID ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending alert email:', error.message);
    return { success: false, error: error.message };
  }
};

const sendDispatchNotificationEmail = async ({
  customerEmail,
  customerName,
  transactionType,
  invoiceNumber,
  machineModel,
  quantity,
  serialNumbers,
  totalAmount,
  paidAmount,
  outstandingAmount
}) => {
  try {
    const recipient = customerEmail || process.env.SMTP_USER;
    const typeLabel = transactionType === 'BUY' ? 'Sales Commercial Invoice' : 'Machinery Rental Agreement & Delivery';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; background-color: #0b1120; color: #f8fafc; padding: 30px; border-radius: 8px; max-width: 600px; margin: auto;">
        <div style="text-align: center; border-bottom: 2px solid #334155; padding-bottom: 16px;">
          <h2 style="color: #38bdf8; margin: 0;">ANUJAYA & GLOBAL ENTERPRISES</h2>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Official Dispatch & Commercial Documentation</p>
        </div>

        <div style="margin-top: 20px;">
          <h3 style="color: #10b981;">✅ Machinery Dispatch Confirmed!</h3>
          <p style="color: #cbd5e1;">Your order has been officially processed and authorized for dispatch.</p>

          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background-color: #1e293b; border-radius: 6px;">
            <tr style="border-bottom: 1px solid #334155;">
              <td style="padding: 10px; color: #94a3b8;">Document No:</td>
              <td style="padding: 10px; color: #f8fafc; font-weight: bold;">${invoiceNumber}</td>
            </tr>
            <tr style="border-bottom: 1px solid #334155;">
              <td style="padding: 10px; color: #94a3b8;">Type:</td>
              <td style="padding: 10px; color: #38bdf8;">${typeLabel}</td>
            </tr>
            <tr style="border-bottom: 1px solid #334155;">
              <td style="padding: 10px; color: #94a3b8;">Machinery:</td>
              <td style="padding: 10px; color: #f8fafc;">${machineModel} (${quantity} Units)</td>
            </tr>
            <tr style="border-bottom: 1px solid #334155;">
              <td style="padding: 10px; color: #94a3b8;">Serial Numbers:</td>
              <td style="padding: 10px; color: #f8fafc;">${serialNumbers ? serialNumbers.join(', ') : 'Assigned at handover'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #334155;">
              <td style="padding: 10px; color: #94a3b8;">Total Value:</td>
              <td style="padding: 10px; color: #f8fafc; font-weight: bold;">LKR ${Number(totalAmount).toLocaleString()}</td>
            </tr>
            <tr style="border-bottom: 1px solid #334155;">
              <td style="padding: 10px; color: #94a3b8;">Paid Amount:</td>
              <td style="padding: 10px; color: #34d399; font-weight: bold;">LKR ${Number(paidAmount).toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 10px; color: #94a3b8;">Outstanding Balance:</td>
              <td style="padding: 10px; color: #f87171; font-weight: bold;">LKR ${Number(outstandingAmount).toLocaleString()}</td>
            </tr>
          </table>

          <p style="color: #94a3b8; font-size: 12px;">Official printed agreement / delivery note will accompany the equipment dispatch truck.</p>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"Jukiapp Consortium" <${process.env.SMTP_USER}>`,
      to: recipient,
      bcc: process.env.SMTP_USER,
      subject: `📜 Dispatch Order #${invoiceNumber} - Anujaya & Global Enterprises`,
      html: htmlContent,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending dispatch email:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  transporter,
  sendRentalAlertEmail,
  sendDispatchNotificationEmail,
};
