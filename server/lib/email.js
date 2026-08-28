import nodemailer from 'nodemailer';

/**
 * Triggers an email notification to the superadmin when POP is uploaded.
 * Wrap in try/catch to guarantee that SMTP delivery errors never interrupt the application flow.
 *
 * @param {string} orgName 
 * @param {Date|string} uploadedAt 
 */
export async function sendPopUploadNotification(orgName, uploadedAt) {
  try {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    const from = process.env.SMTP_FROM_EMAIL;
    const to = process.env.SUPERADMIN_NOTIFY_EMAIL;

    // Gracefully check if SMTP settings are not configured
    if (!host || !user || !pass || !from || !to) {
      console.log('[Email Info] SMTP configuration variables are incomplete. Skipping proof of payment email notification.');
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for SSL port 465, false for STARTTLS port 587 or 25
      auth: {
        user,
        pass
      }
    });

    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const link = `${appUrl}/superadmin?search=${encodeURIComponent(orgName)}`;
    const formattedDate = uploadedAt ? new Date(uploadedAt).toLocaleString() : new Date().toLocaleString();

    const mailOptions = {
      from,
      to,
      subject: `New Payment Proof Uploaded — ${orgName}`,
      text: `Hello Superadmin,

A new Proof of Payment (POP) has been uploaded for a workspace term license.

Organization Name: ${orgName}
Uploaded At: ${formattedDate}

You can view and verify this payment record in the Superadmin Dashboard here:
${link}

Best regards,
Sports Fixture Manager System`
    };

    console.log(`[Email] Sending POP upload notification for organization "${orgName}" to <${to}>...`);
    const info = await transporter.sendMail(mailOptions);
    console.log('[Email] Notification sent successfully! MessageId:', info.messageId);
    if (host.includes('ethereal.email')) {
      console.log('[Email] Ethereal Preview URL:', nodemailer.getTestMessageUrl(info));
    }
  } catch (err) {
    console.error('[Email Error] Failed to send POP upload email notification:', err);
  }
}
