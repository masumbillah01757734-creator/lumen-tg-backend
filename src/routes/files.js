const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { proxyFile } = require("../controllers/messageController");

const router = express.Router();

// Gated behind auth so only the logged-in admin can view Telegram media
router.get("/:fileId", requireAuth, proxyFile);

module.exports = router;
