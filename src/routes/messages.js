const express = require("express");
const multer = require("multer");
const { requireAuth } = require("../middleware/auth");
const { getMessages, sendReply, sendMedia, forwardMessage } = require("../controllers/messageController");

const router = express.Router();

// Memory storage only — we never write uploads to disk, we stream them straight to Telegram.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 45 * 1024 * 1024 }, // Telegram bots can upload up to 50MB; leave headroom
});

router.get("/:chatId", requireAuth, getMessages);
router.post("/:chatId", requireAuth, sendReply);
router.post("/:chatId/media", requireAuth, upload.single("file"), sendMedia);
router.post("/:chatId/forward", requireAuth, forwardMessage);

module.exports = router;
