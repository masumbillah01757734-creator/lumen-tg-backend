const express = require("express");
const { handleWebhook } = require("../controllers/telegramController");
const { verifyTelegramSecret } = require("../middleware/auth");

const router = express.Router();

// Telegram will POST every update here. Protected by secret token header.
router.post("/webhook", verifyTelegramSecret, handleWebhook);

module.exports = router;
