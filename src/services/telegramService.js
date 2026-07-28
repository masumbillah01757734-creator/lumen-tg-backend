const axios = require("axios");
const FormData = require("form-data");

const BOT_TOKEN = process.env.BOT_TOKEN;
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;
const FILE_BASE = `https://api.telegram.org/file/bot${BOT_TOKEN}`;

const api = axios.create({ baseURL: API_BASE, timeout: 15000 });

async function call(method, payload) {
  try {
    const { data } = await api.post(`/${method}`, payload);
    return data.result;
  } catch (err) {
    const desc = err.response?.data?.description || err.message;
    throw new Error(`Telegram API [${method}] failed: ${desc}`);
  }
}

/** Same as call(), but posts multipart/form-data (used for uploading real file bytes) */
async function callWithFile(method, fields, fileField, fileBuffer, fileName) {
  try {
    const form = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined && value !== null) form.append(key, String(value));
    });
    form.append(fileField, fileBuffer, { filename: fileName || "file" });

    const { data } = await api.post(`/${method}`, form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 60000,
    });
    return data.result;
  } catch (err) {
    const desc = err.response?.data?.description || err.message;
    throw new Error(`Telegram API [${method}] failed: ${desc}`);
  }
}

/** Send a plain text reply to a user's chat */
function sendTextMessage(chat_id, text) {
  return call("sendMessage", { chat_id, text, parse_mode: "HTML" });
}

/** Send admin-side media reply (rarely used, but supported for completeness) */
function sendPhoto(chat_id, file_id, caption) {
  return call("sendPhoto", { chat_id, photo: file_id, caption });
}
function sendDocument(chat_id, file_id, caption) {
  return call("sendDocument", { chat_id, document: file_id, caption });
}

/** Show "typing..." indicator to the Telegram user when admin is typing a reply */
function sendChatAction(chat_id, action = "typing") {
  return call("sendChatAction", { chat_id, action });
}

/**
 * Upload real file bytes from the dashboard (admin's computer) straight to a user's chat.
 * Telegram picks the returned file's own file_id/file_unique_id — we store that, never the bytes.
 */
function uploadPhoto(chat_id, buffer, fileName, caption) {
  return callWithFile("sendPhoto", { chat_id, caption }, "photo", buffer, fileName);
}
function uploadVideo(chat_id, buffer, fileName, caption) {
  return callWithFile("sendVideo", { chat_id, caption }, "video", buffer, fileName);
}
function uploadAudio(chat_id, buffer, fileName, caption) {
  return callWithFile("sendAudio", { chat_id, caption }, "audio", buffer, fileName);
}
/** Used for everything else, including .zip and other archives — Telegram treats these as generic documents */
function uploadDocument(chat_id, buffer, fileName, caption) {
  return callWithFile("sendDocument", { chat_id, caption }, "document", buffer, fileName);
}

/**
 * Re-sends a message (any type) from one chat straight into another chat, via Telegram's
 * copyMessage — unlike forwardMessage, this does NOT tag it "Forwarded from …", so the
 * original sender's identity never appears to the recipient.
 */
function copyMessage(toChatId, fromChatId, messageId) {
  return call("copyMessage", { chat_id: toChatId, from_chat_id: fromChatId, message_id: messageId });
}

/**
 * Resolve a Telegram file_id into a temporary direct file URL.
 * IMPORTANT: We never persist the file anywhere — this is fetched live,
 * on demand, whenever the dashboard needs to display/download it.
 */
async function resolveFileUrl(file_id) {
  const file = await call("getFile", { file_id });
  return `${FILE_BASE}/${file.file_path}`;
}

/** Fetch the user's current profile photo file_id (biggest available size) */
async function getUserProfilePhotoFileId(chat_id) {
  const result = await call("getUserProfilePhotos", { user_id: chat_id, limit: 1 });
  const photos = result?.photos?.[0];
  if (!photos || photos.length === 0) return null;
  return photos[photos.length - 1].file_id; // largest size
}

async function setWebhook(url, secretToken) {
  return call("setWebhook", {
    url,
    secret_token: secretToken,
    allowed_updates: ["message", "edited_message"],
  });
}

async function deleteWebhook() {
  return call("deleteWebhook", {});
}

module.exports = {
  sendTextMessage,
  sendPhoto,
  sendDocument,
  sendChatAction,
  uploadPhoto,
  uploadVideo,
  uploadAudio,
  uploadDocument,
  copyMessage,
  resolveFileUrl,
  getUserProfilePhotoFileId,
  setWebhook,
  deleteWebhook,
};
