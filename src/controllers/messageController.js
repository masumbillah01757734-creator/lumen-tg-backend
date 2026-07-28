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
 * GET /api/files/:fileId?filename=...&download=1
 * Streams a Telegram-hosted file straight through to the browser.
 * We never write it to disk / S3 / Cloudinary — it's resolved live on every request.
 */
async function proxyFile(req, res) {
  const { fileId } = req.params;
  const { filename, download } = req.query;

  try {
    const fileUrl = await telegramService.resolveFileUrl(fileId);
    const response = await axios.get(fileUrl, { responseType: "stream" });

    res.setHeader("Content-Type", response.headers["content-type"] || "application/octet-stream");
    if (response.headers["content-length"]) {
      res.setHeader("Content-Length", response.headers["content-length"]);
    }
    res.setHeader("Cache-Control", "private, max-age=3600");

    // Without this header, "download" links for non-renderable files (zip, other archives, etc.)
    // can fail silently in some browsers, especially when served cross-origin from the API domain.
    const safeName = (filename || "file").replace(/[\r\n"]/g, "");
    const disposition = download ? "attachment" : "inline";
    res.setHeader("Content-Disposition", `${disposition}; filename="${safeName}"`);

    response.data.pipe(res);
  } catch (err) {
    // Log the real reason server-side (Railway logs) — the most common one for large .zip files
    // is Telegram's Bot API hard limit: bots can only download files up to 20MB via getFile.
    console.error(`[proxyFile] fileId=${fileId} failed:`, err.message);

    const tooBig = /file is too big/i.test(err.message);
    res.status(tooBig ? 413 : 404).json({
      success: false,
      message: tooBig
        ? "This file is larger than Telegram's 20MB Bot API download limit, so it can't be fetched here."
        : "File could not be loaded from Telegram.",
    });
  }
}

/**
 * POST /api/messages/:chatId/media  (multipart/form-data: file, caption?)
 * Admin sends a photo/video/audio/document (incl. .zip) from the dashboard to the Telegram user.
 * We upload the real bytes to Telegram (no local/S3 storage) and store only the file_id it returns.
 */
async function sendMedia(req, res) {
  const { chatId } = req.params;
  const { caption = "" } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ success: false, message: "No file was uploaded" });
  }

  const mime = file.mimetype || "";
  let message_type = "document";
  let tgResult;

  try {
    if (mime.startsWith("image/") && !mime.includes("gif")) {
      message_type = "photo";
      tgResult = await telegramService.uploadPhoto(chatId, file.buffer, file.originalname, caption);
    } else if (mime.startsWith("video/")) {
      message_type = "video";
      tgResult = await telegramService.uploadVideo(chatId, file.buffer, file.originalname, caption);
    } else if (mime.startsWith("audio/")) {
      message_type = "audio";
      tgResult = await telegramService.uploadAudio(chatId, file.buffer, file.originalname, caption);
    } else {
      message_type = "document"; // includes .zip and any other archive/file type
      tgResult = await telegramService.uploadDocument(chatId, file.buffer, file.originalname, caption);
    }
  } catch (err) {
    console.error("[sendMedia] Telegram upload failed:", err.message);
    return res.status(502).json({ success: false, message: err.message });
  }

  // Pull back whichever media field Telegram populated, to store its file_id for later viewing.
  const sent = tgResult.photo ? tgResult.photo[tgResult.photo.length - 1] : tgResult[message_type];

  const message = await Message.create({
    chat_id: chatId,
    sender: "admin",
    receiver: "user",
    message_type,
    text: caption || "",
    file_id: sent?.file_id || null,
    file_unique_id: sent?.file_unique_id || null,
    file_name: file.originalname || null,
    mime_type: mime || null,
    telegram_message_id: tgResult.message_id,
    date: new Date(tgResult.date * 1000),
    is_read: true,
  });

  socketService.emitNewMessage(message);
  res.json({ success: true, message });
}

/**
 * POST /api/messages/:chatId/forward  body: { toChatId, telegramMessageId }
 * Re-sends a message from the current chat into another chat via Telegram's copyMessage,
 * so the recipient never sees who the message originally came from.
 */
async function forwardMessage(req, res) {
  const { chatId } = req.params; // source chat
  const { toChatId, telegramMessageId } = req.body;

  if (!toChatId || !telegramMessageId) {
    return res.status(400).json({ success: false, message: "toChatId and telegramMessageId are required" });
  }
  if (String(toChatId) === String(chatId)) {
    return res.status(400).json({ success: false, message: "Can't forward a chat to itself" });
  }

  const original = await Message.findOne({ chat_id: chatId, telegram_message_id: telegramMessageId }).lean();
  if (!original) {
    return res.status(404).json({ success: false, message: "Original message not found" });
  }

  let tgResult;
  try {
    tgResult = await telegramService.copyMessage(toChatId, chatId, telegramMessageId);
  } catch (err) {
    console.error("[forwardMessage] Telegram copyMessage failed:", err.message);
    return res.status(502).json({ success: false, message: err.message });
  }

  const message = await Message.create({
    chat_id: toChatId,
    sender: "admin",
    receiver: "user",
    message_type: original.message_type,
    text: original.text || "",
    file_id: original.file_id || null,
    file_unique_id: original.file_unique_id || null,
    file_name: original.file_name || null,
    mime_type: original.mime_type || null,
    telegram_message_id: tgResult.message_id,
    date: new Date(),
    is_read: true,
  });

  socketService.emitNewMessage(message);
  res.json({ success: true, message });
}

module.exports = { getMessages, sendReply, proxyFile, sendMedia, forwardMessage };
