/**
 * Run this once after deploying the backend, to tell Telegram where to send updates.
 * Usage: BACKEND_PUBLIC_URL=https://yourdomain.com npm run set-webhook
 */
require("dotenv").config();
const telegramService = require("../services/telegramService");

const publicUrl = process.env.BACKEND_PUBLIC_URL;

if (!publicUrl) {
  console.error("Set BACKEND_PUBLIC_URL env var to your public backend URL first, e.g.:");
  console.error("BACKEND_PUBLIC_URL=https://api.example.com npm run set-webhook");
  process.exit(1);
}

const webhookUrl = `${publicUrl.replace(/\/$/, "")}/api/telegram/webhook`;

telegramService
  .setWebhook(webhookUrl, process.env.WEBHOOK_SECRET)
  .then((result) => {
    console.log("Webhook set successfully:", result);
    console.log("Webhook URL:", webhookUrl);
  })
  .catch((err) => {
    console.error("Failed to set webhook:", err.message);
    process.exit(1);
  });
