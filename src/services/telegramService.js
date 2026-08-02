const axios = require("axios");
const FormData = require("form-data");

const BOT_TOKEN = process.env.BOT_TOKEN;

// By default we talk to Telegram's public cloud Bot API, which caps bot uploads at
// 50MB and downloads at 20MB. To send/receive bigger files (up to 2GB), run a
// self-hosted Local Bot API Server (https://github.com/tdlib/telegram-bot-api) and
// point TELEGRAM_API_ROOT at it, e.g. "http://telegram-bot-api:8081".
// See docs/local-bot-api-server.md for setup instructions.
const API_ROOT = process.env.TELEGRAM_API_ROOT || "https://api.telegram.org";
const API_BASE = `${API_ROOT}/bot${BOT_TOKEN}`;
const FILE_BASE = `${API_ROOT}/file/bot${BOT_TOKEN}`;

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
      timeout: Number(process.env.TELEGRAM_UPLOAD_TIMEOUT_MS) || 10 * 60 * 1000, // 10 min default — large files take a while
    });
    return data.result;
  } catch (err) {
    const desc = err.response?.data?.description || err.message;
    throw new Error(`Telegram API [${method}] failed: ${desc}`);
  }
}

/** Same as callWithFile(), but takes a readable stream instead of a full in-memory buffer — used for large files so they're piped straight from disk to Telegram. */
async function callWithFileStream(method, fields, fileField, fileStream, fileName) {
  try {
    const form = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined && value !== null) form.append(key, String(value));
    });
    form.append(fileField, fileStream, { filename: fileName || "file" });

    const { data } = await api.post(`/${method}`, form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: Number(process.env.TELEGRAM_UPLOAD_TIMEOUT_MS) || 10 * 60 * 1000,
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

/** Send a voice message by re-using a Telegram file_id (e.g. the fixed /start welcome voice) */
function sendVoice(chat_id, fileId, caption) {
  return call("sendVoice", { chat_id, voice: fileId, caption });
}

/** Send a video by re-using a previously-uploaded Telegram file_id */
function sendVideo(chat_id, fileId, caption) {
  return call("sendVideo", { chat_id, video: fileId, caption });
}

/** Send an audio track by re-using a previously-uploaded Telegram file_id */
function sendAudio(chat_id, fileId, caption) {
  return call("sendAudio", { chat_id, audio: fileId, caption });
}

/**
 * Generic "send by file_id" dispatcher for the four media types the Step-sequence
 * feature deals with. file_ids issued by our bot are valid for sending to any chat,
 * not just the chat they were first uploaded to — so once an item has been sent once
 * (see uploadPhoto/uploadVideo/etc below), every future run reuses this, no re-upload.
 */
function sendMediaByFileId(type, chat_id, fileId, caption) {
  switch (type) {
    case "photo":
      return sendPhoto(chat_id, fileId, caption);
    case "video":
      return sendVideo(chat_id, fileId, caption);
    case "audio":
      return sendAudio(chat_id, fileId, caption);
    case "document":
      return sendDocument(chat_id, fileId, caption);
    default:
      throw new Error(`sendMediaByFileId: unsupported type "${type}"`);
  }
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
function uploadVoice(chat_id, buffer, fileName, caption) {
  return callWithFile("sendVoice", { chat_id, caption }, "voice", buffer, fileName);
}
/** Used for everything else, including .zip and other archives — Telegram treats these as generic documents */
function uploadDocument(chat_id, buffer, fileName, caption) {
  return callWithFile("sendDocument", { chat_id, caption }, "document", buffer, fileName);
}

/** Generic "upload raw bytes" dispatcher counterpart to sendMediaByFileId, for first-time sends */
function uploadMediaBuffer(type, chat_id, buffer, fileName, caption) {
  switch (type) {
    case "photo":
      return uploadPhoto(chat_id, buffer, fileName, caption);
    case "video":
      return uploadVideo(chat_id, buffer, fileName, caption);
    case "audio":
      return uploadAudio(chat_id, buffer, fileName, caption);
    case "document":
      return uploadDocument(chat_id, buffer, fileName, caption);
    default:
      throw new Error(`uploadMediaBuffer: unsupported type "${type}"`);
  }
}

/** Streaming counterpart to uploadMediaBuffer — same dispatcher, but piped from disk instead of buffered in RAM. Preferred for large (>~20MB) files. */
function uploadMediaStream(type, chat_id, fileStream, fileName, caption) {
  const methodByType = { photo: "sendPhoto", video: "sendVideo", audio: "sendAudio", document: "sendDocument" };
  const fieldByType = { photo: "photo", video: "video", audio: "audio", document: "document" };
  const method = methodByType[type];
  if (!method) throw new Error(`uploadMediaStream: unsupported type "${type}"`);
  return callWithFileStream(method, { chat_id, caption }, fieldByType[type], fileStream, fileName);
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
  let filePath = file.file_path;
  if (filePath.startsWith("/")) {
    const marker = `/${BOT_TOKEN}/`;
    const idx = filePath.indexOf(marker);
    filePath = idx !== -1 ? filePath.slice(idx + marker.length) : filePath;
  }
  return `${FILE_BASE}/${filePath}`;
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

/** True if a Telegram API error means "this user has blocked the bot" (as opposed to any other failure). */
function isBlockedByUserError(err) {
  return /bot was blocked by the user/i.test(err?.message || "");
}

module.exports = {
  sendTextMessage,
  sendPhoto,
  sendDocument,
  sendChatAction,
  sendVoice,
  sendVideo,
  sendAudio,
  sendMediaByFileId,
  uploadPhoto,
  uploadVideo,
  uploadAudio,
  uploadVoice,
  uploadDocument,
  uploadMediaBuffer,
  uploadMediaStream,
  copyMessage,
  resolveFileUrl,
  getUserProfilePhotoFileId,
  setWebhook,
  deleteWebhook,
  isBlockedByUserError,
};
