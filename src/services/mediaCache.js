const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

/**
 * Short-lived disk cache for media the ADMIN uploads from the dashboard.
 *
 * Why this exists: when the admin sends a photo/video/etc, we upload the raw bytes
 * straight to Telegram (uploading has no 20MB limit) and only store the file_id.
 * But re-fetching that same file later to preview it in the dashboard goes through
 * Telegram's getFile, which DOES cap out at 20MB. For files under that limit, or for
 * anything a Telegram *user* sent to the bot, the existing live-proxy path still works
 * fine and stays untouched.
 *
 * This cache just keeps a copy of the exact bytes we already had in memory during
 * upload, on disk, for a limited time — so the dashboard can serve the admin's own
 * media back to them without touching Telegram's download limit at all.
 *
 * Not meant to be permanent storage: entries expire and are swept periodically.
 * If the server restarts or the entry expires, proxyFile() just falls back to the
 * normal Telegram fetch (which will still fail for >20MB files sent by admin —
 * a fully robust fix for that requires a self-hosted local Bot API server).
 */

const CACHE_DIR = process.env.MEDIA_CACHE_DIR || path.join(os.tmpdir(), "tg-media-cache");
const TTL_MS = Number(process.env.MEDIA_CACHE_TTL_MS) || 24 * 60 * 60 * 1000; // 24h
const SWEEP_INTERVAL_MS = 30 * 60 * 1000; // 30m

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// fileId -> { filePath, mimeType, fileName, expiresAt }
const index = new Map();

function keyToPath(fileId) {
  // file_id can contain characters that aren't safe as filenames, hash it instead
  const hash = crypto.createHash("sha256").update(fileId).digest("hex");
  return path.join(CACHE_DIR, hash);
}

/** Store admin-uploaded bytes right after we send them to Telegram. Fire-and-forget safe. */
async function store(fileId, buffer, mimeType, fileName) {
  if (!fileId || !buffer) return;
  const filePath = keyToPath(fileId);
  try {
    await fs.promises.writeFile(filePath, buffer);
    index.set(fileId, {
      filePath,
      mimeType: mimeType || "application/octet-stream",
      fileName: fileName || "file",
      expiresAt: Date.now() + TTL_MS,
    });
  } catch (err) {
    console.error(`[mediaCache] failed to cache fileId=${fileId}:`, err.message);
  }
}

/** Same as store(), but copies from an existing on-disk file instead of a RAM buffer — used for large files uploaded via the streaming path. */
async function storeFromPath(fileId, sourcePath, mimeType, fileName) {
  if (!fileId || !sourcePath) return;
  const filePath = keyToPath(fileId);
  try {
    await fs.promises.copyFile(sourcePath, filePath);
    index.set(fileId, {
      filePath,
      mimeType: mimeType || "application/octet-stream",
      fileName: fileName || "file",
      expiresAt: Date.now() + TTL_MS,
    });
  } catch (err) {
    console.error(`[mediaCache] failed to cache (from path) fileId=${fileId}:`, err.message);
  }
}

/** Look up a cached entry. Returns null if missing/expired (and cleans it up). */
function get(fileId) {
  const entry = index.get(fileId);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt || !fs.existsSync(entry.filePath)) {
    index.delete(fileId);
    fs.promises.unlink(entry.filePath).catch(() => {});
    return null;
  }
  return entry;
}

function sweep() {
  const now = Date.now();
  for (const [fileId, entry] of index.entries()) {
    if (now > entry.expiresAt) {
      index.delete(fileId);
      fs.promises.unlink(entry.filePath).catch(() => {});
    }
  }
}

setInterval(sweep, SWEEP_INTERVAL_MS).unref();

module.exports = { store, storeFromPath, get };
