const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { getMessages, sendReply } = require("../controllers/messageController");

const router = express.Router();

router.get("/:chatId", requireAuth, getMessages);
router.post("/:chatId", requireAuth, sendReply);

module.exports = router;
