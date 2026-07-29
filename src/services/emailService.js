const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

/**
 * Call this once at server boot (see server.js) to confirm Gmail actually accepts the
 * SMTP_USER/SMTP_PASS combo. Logs a clear reason instead of failing silently later when
 * the first real notification tries to go out.
 */
async function verifyEmailConfig() {
  try {
    await getTransporter().verify();
    console.log("[Email] SMTP connection OK — notifications will be sent from", process.env.SMTP_USER);
  } catch (err) {
    console.error(
      "[Email] SMTP verification FAILED — notifications will not be sent. Reason:",
      err.message,
      "\n  → Common causes: SMTP_USER/SMTP_PASS wrong, 2-Step Verification not enabled on that Gmail account " +
        "(required for App Passwords), or the App Password was revoked/regenerated."
    );
  }
}

/**
 * Sends a "new message" notification email to the admin.
 * Called for every incoming Telegram message (see telegramController).
 */
async function sendNewMessageNotification({ userDisplayName, telegramUsername, messagePreview, messageTime }) {
  const dashboardLink = process.env.DASHBOARD_URL || "http://localhost:3000/dashboard";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; border: 1px solid #e2e2e2; border-radius: 8px; overflow: hidden;">
      <div style="background:#2AABEE; padding:16px; color:#fff;">
        <h2 style="margin:0; font-size:18px;">New Telegram Message</h2>
      </div>
      <div style="padding:16px;">
        <p style="margin:4px 0;"><strong>From:</strong> ${userDisplayName}</p>
        <p style="margin:4px 0;"><strong>Telegram Username:</strong> ${telegramUsername ? "@" + telegramUsername : "N/A"}</p>
        <p style="margin:4px 0;"><strong>Time:</strong> ${messageTime}</p>
        <p style="margin:12px 0; padding:10px; background:#f5f5f5; border-radius:6px;">${messagePreview}</p>
        <a href="${dashboardLink}" style="display:inline-block; margin-top:12px; background:#2AABEE; color:#fff; text-decoration:none; padding:10px 16px; border-radius:6px;">Open Dashboard</a>
      </div>
    </div>
  `;

  await getTransporter().sendMail({
    from: `"Telegram Dashboard" <${process.env.SMTP_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: `New message from ${userDisplayName}`,
    html,
  });
}

module.exports = { sendNewMessageNotification, verifyEmailConfig };
