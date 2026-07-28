const axios = require("axios");
const Message = require("../models/Message");
const telegramService = require("../services/telegramService");
const socketService = require("../services/socketService");

/** GET /api/messages/:chatId?before=<ISO date>&limit=30 */
async function getMessages(req, res) {
  const { chatId } = req.params;
  const { before, limit = 30 } = req.query;

  const filter = { chat_id: chatId };
  if (before) filter.date = { $lt: new Date(before) };

  const messages = await Message.find(filter)
    .sort({ date: -1 })
    .limit(Math.min(Number(limit) || 30, 100))
    .lean();

  res.json({ success: true, messages: messages.reverse() });
}

/** POST /api/messages/:chatId  body: { text } — admin sends a text reply */
async function sendReply(req, res) {
  const { chatId } = req.params;
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, message: "Message text is required" });
  }

  const tgResult = await telegramService.sendTextMessage(chatId, text);

  const message = await Message.create({
    chat_id: chatId,
    sender: "admin",
    receiver: "user",
    message_type: "text",
    text,
    telegram_message_id: tgResult.message_id,
    date: new Date(tgResult.date * 1000),
    is_read: true,
  });

  socketService.emitNewMessage(message);
  res.json({ success: true, message });
}

/**
 * GET /api/files/:fileId
 * Streams a Telegram-hosted file straight through to the browser.
 * We never write it to disk / S3 / Cloudinary — it's resolved live on every request.
 */
async function proxyFile(req, res) {
  const { fileId } = req.params;

  try {
    const fileUrl = await telegramService.resolveFileUrl(fileId);
    const response = await axios.get(fileUrl, { responseType: "stream" });

    res.setHeader("Content-Type", response.headers["content-type"] || "application/octet-stream");
    if (response.headers["content-length"]) {
      res.setHeader("Content-Length", response.headers["content-length"]);
    }
    res.setHeader("Cache-Control", "private, max-age=3600");

    response.data.pipe(res);
  } catch (err) {
    res.status(404).json({ success: false, message: "File could not be loaded from Telegram" });
  }
}

module.exports = { getMessages, sendReply, proxyFile };
