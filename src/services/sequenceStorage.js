const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/**
 * Persistent (long-lived) disk storage for Step-template media assets configured
 * from the Admin Dashboard (Step 2 / Step 3 / any future step).
 *
 * Unlike services/mediaCache.js (a short-lived 24h cache for *outgoing* message
 * previews), files here need to survive indefinitely — a step's photo/video/audio/
 * document may be uploaded once and reused to message many different users over
 * weeks or months.
 *
 * Once an item is actually sent to a chat for the first time, we cache the Telegram
 * file_id that comes back on the Sequence item itself (see Sequence.js) — after that,
 * every future send reuses the file_id and no longer touches this file at all. So the
 * only files that matter here long-term are ones that haven't been sent yet.
 *
 * NOTE: if you deploy on a host with an ephemeral filesystem (e.g. a PaaS free tier
 * without a persistent volume), point SEQUENCE_ASSETS_DIR at a mounted persistent
 * disk. Otherwise, any item that hasn't been sent at least once yet could be lost on
 * redeploy/restart — the admin would just need to re-upload it.
 */

const STORAGE_DIR = process.env.SEQUENCE_ASSETS_DIR || path.join(__dirname, "../../storage/sequence-assets");

if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

/** Save a buffer to disk with a random, collision-safe filename. Returns just the filename. */
async function saveBuffer(buffer, originalName) {
  const ext = path.extname(originalName || "").slice(0, 10); // keep it sane/short
  const filename = `${crypto.randomBytes(16).toString("hex")}${ext}`;
  await fs.promises.writeFile(path.join(STORAGE_DIR, filename), buffer);
  return filename;
}

function resolvePath(filename) {
  return path.join(STORAGE_DIR, filename);
}

async function readBuffer(filename) {
  return fs.promises.readFile(resolvePath(filename));
}

async function deleteFile(filename) {
  if (!filename) return;
  try {
    await fs.promises.unlink(resolvePath(filename));
  } catch (err) {
    if (err.code !== "ENOENT") console.error(`[sequenceStorage] failed to delete ${filename}:`, err.message);
  }
}

function exists(filename) {
  return !!filename && fs.existsSync(resolvePath(filename));
}

module.exports = { saveBuffer, resolvePath, readBuffer, deleteFile, exists, STORAGE_DIR };
