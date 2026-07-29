const fs = require("fs");
const path = require("path");
const User = require("../models/User");
const Message = require("../models/Message");
const telegramService = require("../services/telegramService");
const emailService = require("../services/emailService");
const socketService = require("../services/socketService");

// Local voice file for the /start auto-reply. Drop your .ogg/.mp3 at this path
// (or set START_VOICE_PATH in .env to a different path). On the first /start after
// each server boot, it's uploaded once and its Telegram file_id is cached here —
// every /start after that reuses the cached file_id (fast, no re-upload).
const START_VOICE_PATH = process.env.START_VOICE_PATH || path.join(__dirname, "../../assets/welcome.ogg");
let cachedStartVoiceFileId = process.env.START_VOICE_FILE_ID || null;

/** Figures out message_type + file fields from a Telegram message object */
function extractMessageContent(msg) {
  if (msg.text) return { message_type: "text", text: msg.text };

  if (msg.photo && msg.photo.length) {
    const largest = msg.photo[msg.photo.length - 1];
    return {
      message_type: "photo",
      text: msg.caption || "",
      file_id: largest.file_id,
      file_unique_id: largest.file_unique_id,
    };
  }

  if (msg.video) {
    return {
      message_type: "video",
      text: msg.caption || "",
      file_id: msg.video.file_id,
      file_unique_id: msg.video.file_unique_id,
      file_name: msg.video.file_name || null,
      mime_type: msg.video.mime_type || null,
    };
  }

  if (msg.audio) {
    return {
      message_type: "audio",
      text: msg.caption || "",
      file_id: msg.audio.file_id,
      file_unique_id: msg.audio.file_unique_id,
      file_name: msg.audio.file_name || msg.audio.title || null,
      mime_type: msg.audio.mime_type || null,
    };
  }

  if (msg.video_note) {
    return {
      message_type: "video_note",
      text: "",
      file_id: msg.video_note.file_id,
      file_unique_id: msg.video_note.file_unique_id,
    };
  }

  if (msg.voice) {
    return {
      message_type: "voice",
      text: "",
      file_id: msg.voice.file_id,
      file_unique_id: msg.voice.file_unique_id,
      mime_type: msg.voice.mime_type || null,
    };
  }

  if (msg.sticker) {
    return {
      message_type: "sticker",
      text: msg.sticker.emoji || "",
      file_id: msg.sticker.file_id,
      file_unique_id: msg.sticker.file_unique_id,
    };
  }

  if (msg.animation) {
    return {
      message_type: "animation",
      text: msg.caption || "",
      file_id: msg.animation.file_id,
      file_unique_id: msg.animation.file_unique_id,
      file_name: msg.animation.file_name || null,
      mime_type: msg.animation.mime_type || null,
    };
  }

  if (msg.document) {
    return {
      message_type: "document",
      text: msg.caption || "",
      file_id: msg.document.file_id,
      file_unique_id: msg.document.file_unique_id,
      file_name: msg.document.file_name || null,
      mime_type: msg.document.mime_type || null,
    };
  }

  return { message_type: "text", text: "[Unsupported message type]" };
}

async function handleWebhook(req, res) {
  // Respond to Telegram immediately so it doesn't retry; process asynchronously.
  res.sendStatus(200);

  try {
    const update = req.body;
    const msg = update.message || update.edited_message;
    if (!msg) return;

    const chat_id = String(msg.chat.id);
    const from = msg.from || {};

    // 1. Upsert the user/chat record
    let user = await User.findOne({ chat_id });
    if (!user) {
      user = await User.create({
        chat_id,
        username: from.username || null,
        first_name: from.first_name || "",
        last_name: from.last_name || "",
      });
    }

    // Blocked users' new messages are rejected entirely.
    if (user.is_blocked) return;

    user.last_seen = new Date();
    user.username = from.username || user.username;
    user.first_name = from.first_name || user.first_name;
    user.last_name = from.last_name || user.last_name;

    // Only if the admin dashboard isn't currently viewing this chat do we bump unread count.
    user.unread_count = (user.unread_count || 0) + 1;
    await user.save();

    // 2. Save the message
    const content = extractMessageContent(msg);
    if (content.message_type === "voice") {
      console.log(`[Telegram] Voice file_id from chat ${chat_id}:`, content.file_id);
    }
    const message = await Message.create({
      chat_id,
      sender: "user",
      receiver: "admin",
      telegram_message_id: msg.message_id,
      date: new Date(msg.date * 1000),
      is_read: false,
      ...content,
    });

    // 3. Real-time push to dashboard
    socketService.emitNewMessage(message);
    socketService.emitUserUpdate(user);

    // 3b. Auto-reply: /start gets a fixed welcome voice message
    if (content.message_type === "text" && content.text.trim() === "/start") {
      try {
        let tgResult;
        if (cachedStartVoiceFileId) {
          // Fast path: reuse the file_id from a previous send, no bytes re-uploaded.
          tgResult = await telegramService.sendVoice(chat_id, cachedStartVoiceFileId);
        } else if (fs.existsSync(START_VOICE_PATH)) {
          // First time since boot: upload the real file, then remember its file_id.
          const buffer = fs.readFileSync(START_VOICE_PATH);
          tgResult = await telegramService.uploadVoice(chat_id, buffer, path.basename(START_VOICE_PATH));
          cachedStartVoiceFileId = tgResult.voice?.file_id || null;
        }

        if (tgResult) {
          const autoReply = await Message.create({
            chat_id,
            sender: "admin",
            receiver: "user",
            message_type: "voice",
            text: "",
            file_id: cachedStartVoiceFileId || tgResult.voice?.file_id || null,
            telegram_message_id: tgResult.message_id,
            date: new Date(tgResult.date * 1000),
            is_read: true,
          });
          socketService.emitNewMessage(autoReply);
        }
      } catch (err) {
        console.error("[Telegram] /start auto voice reply failed:", err.message);
      }
    }

    // 4. Email notification — sent for every incoming user message, admin online or not
    {
      const displayName = [user.first_name, user.last_name].filter(Boolean).join(" ") || "Unknown user";
      const preview =
        content.message_type === "text" ? content.text : `[${content.message_type}]${content.text ? " " + content.text : ""}`;

      emailService
        .sendNewMessageNotification({
          userDisplayName: displayName,
          telegramUsername: user.username,
          messagePreview: preview.slice(0, 200),
          messageTime: message.date.toLocaleString(),
        })
        .catch((err) => console.error("[Email] Failed to send notification:", err.message, err.stack));
      console.log("[Email] Notification triggered for chat:", chat_id);
    }
  } catch (err) {
    console.error("[Telegram Webhook] Error:", err.message);
  }
}

module.exports = { handleWebhook };
