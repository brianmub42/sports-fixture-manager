import nodemailer from 'nodemailer';
import crypto from 'crypto';

/**
 * Hash a string (token or OTP) using SHA-256
 */
export function hashToken(value) {
  if (!value) return '';
  return crypto.createHash('sha256').update(String(value).trim()).digest('hex');
}

/**
 * Generate a random 6-digit numeric OTP string
 */
export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate a random 32-byte hexadecimal crypto token
 */
export function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get or create the nodemailer transporter
 */
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass }
    });
  }

  // Fallback transporter (dev/testing mode)
  return null;
}

/**
 * Send password reset email with 1-click link and 6-digit OTP
 */
export async function sendPasswordResetEmail({ toEmail, name, resetToken, otp, clientUrl }) {
  const appName = process.env.APP_NAME || 'FixtureGrid';
  const fromEmail = process.env.EMAIL_FROM || '"FixtureGrid Support" <no-reply@fixturegrid.com>';
  const baseUrl = clientUrl || process.env.CLIENT_URL || 'http://localhost:5173';
  const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

  const subject = `[${appName}] Password Reset Request`;

  const textContent = `Hello ${name || 'there'},

We received a request to reset your password for your ${appName} account.

You can reset your password using the link below:
${resetLink}

Or, if you are using the mobile app, enter this 6-digit verification code:
${otp}

This code and link will expire in 15 minutes. If you did not request this password reset, please ignore this email.

Best regards,
The ${appName} Team`;

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
      .container { max-width: 540px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; padding: 32px; border: 1px solid #334155; }
      .header { text-align: center; margin-bottom: 24px; }
      .title { font-size: 24px; font-weight: 800; color: #3b82f6; margin: 0; }
      .subtitle { font-size: 14px; color: #94a3b8; margin-top: 4px; }
      .content { font-size: 15px; line-height: 1.6; color: #cbd5e1; margin-bottom: 24px; }
      .button-wrapper { text-align: center; margin: 28px 0; }
      .button { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }
      .divider { height: 1px; background-color: #334155; margin: 24px 0; }
      .otp-card { background-color: #0f172a; border-radius: 12px; padding: 16px; text-align: center; border: 1px solid #334155; }
      .otp-code { font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #60a5fa; font-family: monospace; }
      .footer { font-size: 12px; color: #64748b; text-align: center; margin-top: 24px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 class="title">${appName}</h1>
        <div class="subtitle">Sports Fixture & Tournament Manager</div>
      </div>
      <div class="content">
        <p>Hello <strong>${name || 'Official'}</strong>,</p>
        <p>We received a request to reset your password. Click the button below to choose a new password:</p>
      </div>
      <div class="button-wrapper">
        <a href="${resetLink}" class="button" target="_blank">Reset My Password</a>
      </div>
      <div class="divider"></div>
      <div class="content">
        <p style="margin-bottom: 8px;">If you are using the mobile app, use this 6-digit verification code:</p>
        <div class="otp-card">
          <div class="otp-code">${otp}</div>
        </div>
      </div>
      <div class="footer">
        <p>This code and link will expire in <strong>15 minutes</strong>.</p>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
    </div>
  </body>
  </html>
  `;

  const transporter = getTransporter();

  if (!transporter) {
    console.log('\n================ [DEV PASSWORD RESET EMAIL] ================');
    console.log(`To: ${toEmail} (${name || 'User'})`);
    console.log(`Subject: ${subject}`);
    console.log(`Reset URL: ${resetLink}`);
    console.log(`6-Digit OTP: ${otp}`);
    console.log('============================================================\n');
    return { success: true, mode: 'dev-console' };
  }

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to: toEmail,
      subject,
      text: textContent,
      html: htmlContent
    });
    return { success: true, messageId: info.messageId, mode: 'smtp' };
  } catch (err) {
    console.error('Failed to send email via SMTP, logging fallback:', err.message);
    console.log(`[FALLBACK EMAIL] To: ${toEmail} | Reset Link: ${resetLink} | OTP: ${otp}`);
    return { success: true, mode: 'fallback-logged', error: err.message };
  }
}
