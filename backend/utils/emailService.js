const nodemailer = require('nodemailer');

let cachedTransporter;
const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[emailService] EMAIL_USER or EMAIL_PASS not set — emails will be skipped.');
    return null;
  }
  if (cachedTransporter) return cachedTransporter; // reuse the same connection pool instead of reconnecting every send
  cachedTransporter = nodemailer.createTransport({
    service: 'gmail',
    pool: true,       // keep a warm connection pool instead of a fresh TLS+auth handshake per email
    maxConnections: 3,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  return cachedTransporter;
};

const sendEmail = async ({ to, subject, html }) => {
  const transporter = createTransporter();
  if (!transporter) return false;
  try {
    await transporter.sendMail({
      from: `"PMS Platform" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[emailService] Email sent to ${to}`);
    return true;
  } catch (err) {
    console.error(`[emailService] Failed to send to ${to}:`, err.message);
    return false;
  }
};

// Welcome email — CTA/dashboard link removed
const sendWelcomeEmail = async ({ name, email, password, role, employeeId, createdByName }) => {
  await sendEmail({
    to: email,
    subject: 'Your PMS Account Has Been Created',
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;width:100%;max-width:560px;margin:auto;background:#0f0a1e;border-radius:16px;overflow:hidden;border:1px solid #231d4d;box-sizing:border-box;">
        
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#5b21b6,#4338ca);padding:32px 32px 24px;">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
            PM<span style="color:#c4b5fd;">S</span>
          </h1>
          <p style="margin:8px 0 0;color:#ddd6fe;font-size:13px;">Project Management System</p>
        </div>

        <!-- Body -->
        <div style="padding:24px;box-sizing:border-box;">
          <h2 style="color:#fff;margin:0 0 8px;font-size:20px;">Welcome, ${name}!</h2>
          <p style="color:#9ca3af;margin:0 0 24px;font-size:14px;line-height:1.6;">
            Your account has been created by <strong style="color:#c4b5fd;">${createdByName}</strong> on the PMS platform.
            Here are your login credentials:
          </p>

          <!-- Credentials box -->
          <div style="background:#1f1a42;border:1px solid #2d265e;border-radius:12px;padding:18px;margin-bottom:24px;box-sizing:border-box;">
            <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-size:13px;width:120px;">Email</td>
                <td style="padding:8px 0;color:#fff;font-size:13px;font-weight:600;word-break:break-word;overflow-wrap:anywhere;">${email}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-size:13px;">Unique ID</td>
                <td style="padding:8px 0;">
                  <span style="display:inline-block;max-width:100%;background:#2d265e;color:#fcd34d;padding:4px 10px;border-radius:6px;font-family:monospace;font-size:14px;letter-spacing:1px;word-break:break-word;box-sizing:border-box;">${employeeId}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-size:13px;">Temp Password</td>
                <td style="padding:8px 0;">
                  <span style="display:inline-block;max-width:100%;background:#2d265e;color:#a78bfa;padding:4px 10px;border-radius:6px;font-family:monospace;font-size:14px;letter-spacing:1px;word-break:break-word;box-sizing:border-box;">${password}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-size:13px;">Role</td>
                <td style="padding:8px 0;">
                  <span style="background:${role === 'admin' ? '#422006' : '#1e1b4b'};color:${role === 'admin' ? '#fbbf24' : '#818cf8'};padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">
                    ${role === 'admin' ? ' Admin' : 'Employee'}
                  </span>
                </td>
              </tr>
            </table>
          </div>

          <!-- Warning -->
          <div style="background:#422006;border:1px solid #92400e;border-radius:10px;padding:14px 16px;">
            <p style="margin:0;color:#fcd34d;font-size:13px;line-height:1.5;">
              <strong>You will be required to change this password</strong> the first time you log in.
              Please keep these credentials safe until then.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding:20px 32px;border-top:1px solid #1f1a42;text-align:center;">
          <p style="color:#4b5563;font-size:11px;margin:0;">
            This is an automated message from PMS Platform. Do not reply to this email.
          </p>
        </div>
      </div>
    `,
  });
};

const sendPasswordResetEmail = async ({ name, email, newPassword, resetByName }) => {
  await sendEmail({
    to: email,
    subject: 'Your PMS Password Has Been Reset',
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;width:100%;max-width:560px;margin:auto;background:#0f0a1e;border-radius:16px;overflow:hidden;border:1px solid #231d4d;box-sizing:border-box;">
        
        <div style="background:linear-gradient(135deg,#7c2d12,#92400e);padding:32px 32px 24px;">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">
            PM<span style="color:#fcd34d;">S</span>
          </h1>
          <p style="margin:8px 0 0;color:#fde68a;font-size:13px;">Password Reset Notification</p>
        </div>

        <div style="padding:24px;box-sizing:border-box;">
          <h2 style="color:#fff;margin:0 0 8px;font-size:20px;">Hi ${name},</h2>
          <p style="color:#9ca3af;margin:0 0 24px;font-size:14px;line-height:1.6;">
            Your password was reset by <strong style="color:#fcd34d;">${resetByName}</strong>.
            Use the temporary password below to log in:
          </p>

          <div style="background:#1f1a42;border:1px solid #2d265e;border-radius:12px;padding:18px;margin-bottom:24px;box-sizing:border-box;text-align:center;">
            <p style="color:#6b7280;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">New Temporary Password</p>
            <span style="display:inline-block;max-width:100%;background:#2d265e;color:#fbbf24;padding:8px 20px;border-radius:8px;font-family:monospace;font-size:18px;letter-spacing:2px;word-break:break-word;box-sizing:border-box;">${newPassword}</span>
          </div>

          <div style="background:#422006;border:1px solid #92400e;border-radius:10px;padding:14px 16px;">
            <p style="margin:0;color:#fcd34d;font-size:13px;">
               You will be prompted to set a new personal password when you log in.
            </p>
          </div>
        </div>

        <div style="padding:20px 32px;border-top:1px solid #1f1a42;text-align:center;">
          <p style="color:#4b5563;font-size:11px;margin:0;">
            If you did not expect this reset, contact your administrator immediately.
          </p>
        </div>
      </div>
    `,
  });
};

const sendContactAdminEmail = async ({ adminEmail, adminName, senderName, senderEmail, subject, message }) => {
  return sendEmail({
    to: adminEmail,
    subject: `PMS Admin Contact: ${subject}`,
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;width:100%;max-width:560px;margin:auto;background:#0f0a1e;border-radius:16px;overflow:hidden;border:1px solid #231d4d;box-sizing:border-box;">
        <div style="background:linear-gradient(135deg,#5b21b6,#4338ca);padding:28px 32px 22px;">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">PM<span style="color:#c4b5fd;">S</span></h1>
          <p style="margin:8px 0 0;color:#ddd6fe;font-size:13px;">New message for ${adminName}</p>
        </div>

        <div style="padding:24px;box-sizing:border-box;">
          <p style="color:#9ca3af;margin:0 0 18px;font-size:14px;line-height:1.6;">
            A visitor sent you a message through Contact Admin.
          </p>

          <div style="background:#1f1a42;border:1px solid #2d265e;border-radius:12px;padding:18px;margin-bottom:20px;">
            <p style="margin:0 0 8px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;">From</p>
            <p style="margin:0;color:#fff;font-size:14px;font-weight:600;">${senderName || 'Website Visitor'}</p>
            <p style="margin:4px 0 0;color:#a78bfa;font-size:13px;word-break:break-word;overflow-wrap:anywhere;">${senderEmail}</p>
          </div>

          <div style="background:#1f1a42;border:1px solid #2d265e;border-radius:12px;padding:18px;">
            <p style="margin:0 0 8px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Subject</p>
            <p style="margin:0 0 16px;color:#fff;font-size:15px;font-weight:600;word-break:break-word;overflow-wrap:anywhere;">${subject}</p>
            <p style="margin:0;color:#d1d5db;font-size:14px;line-height:1.7;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;">${message}</p>
          </div>
        </div>
      </div>
    `,
  });
};

module.exports = { sendWelcomeEmail, sendPasswordResetEmail, sendContactAdminEmail };