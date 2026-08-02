const axios = require("axios");

// Gmail SMTP is blocked outbound on most container hosts (Railway, Render, Fly, etc.) —
// that's what the "Connection timeout" errors were. We send over plain HTTPS instead,
// via Resend's API, which works from anywhere.
const RESEND_API_URL = "https://api.resend.com/emails";

/**
 * Call this once at server boot (see server.js) to confirm email is configured.
 * We can't fully "verify" an HTTP API key without spending a send, so this just
 * checks the required env vars are present and logs a clear reason if not.
 */
async function verifyEmailConfig() {
  const missing = [
    !process.env.RESEND_API_KEY && "RESEND_API_KEY",
    !process.env.ADMIN_EMAIL && "ADMIN_EMAIL",
  ].filter(Boolean);

  if (missing.length) {
    console.error(
      "[Email] Not configured — missing env var(s):",
      missing.join(", "),
      "→ set these in your host's Variables/Environment tab. Get a free RESEND_API_KEY at https://resend.com/api-keys"
    );
    return;
  }

  console.log("[Email] Resend API key present — notifications will be sent to", process.env.ADMIN_EMAIL);
}

/**
 * Sends a "new message" notification email to the admin.
 * Called for every incoming Telegram message (see telegramController).
 */
async function sendNewMessageNotification({ userDisplayName, telegramUsername, messagePreview, messageTime }) {
  if (!process.env.RESEND_API_KEY || !process.env.ADMIN_EMAIL) {
    console.error(
      "[Email] Skipped — missing env var(s):",
      [!process.env.RESEND_API_KEY && "RESEND_API_KEY", !process.env.ADMIN_EMAIL && "ADMIN_EMAIL"]
        .filter(Boolean)
        .join(", "),
      "→ set these in your host's Variables/Environment tab (a local .env file is NOT deployed automatically)."
    );
    return;
  }

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

  // Resend's shared test sender. Works immediately with no domain setup, but Resend
  // only lets it deliver to the email address you signed up with. To send to any
  // ADMIN_EMAIL, verify your own domain in Resend and set EMAIL_FROM to an address
  // on it (e.g. "Telegram Dashboard <notify@yourdomain.com>").
  const from = process.env.EMAIL_FROM || "Telegram Dashboard <onboarding@resend.dev>";

  try {
    const { data } = await axios.post(
      RESEND_API_URL,
      {
        from,
        to: process.env.ADMIN_EMAIL,
        subject: `New message from ${userDisplayName}`,
        html,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );
    console.log("[Email] Notification sent, id:", data.id, "→ to:", process.env.ADMIN_EMAIL);
  } catch (err) {
    console.error(
      "[Email] Failed to send notification:",
      err.response?.data?.message || err.message
    );
  }
}

module.exports = { sendNewMessageNotification, verifyEmailConfig };
