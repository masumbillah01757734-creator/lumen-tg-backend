const fs = require("fs");
const Sequence = require("../models/Sequence");
const User = require("../models/User");
const Message = require("../models/Message");
const telegramService = require("../services/telegramService");
const socketService = require("../services/socketService");
const mediaCache = require("../services/mediaCache");
const sequenceStorage = require("../services/sequenceStorage");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sortItems(seq) {
  if (seq?.items) seq.items.sort((a, b) => a.order - b.order);
  return seq;
}

/** GET /api/sequences — list every step template (Step 2, Step 3, any future step) */
async function listSequences(req, res) {
  const sequences = await Sequence.find().sort({ step_key: 1 }).lean();
  sequences.forEach(sortItems);
  res.json({ success: true, sequences });
}

/** GET /api/sequences/:stepKey */
async function getSequence(req, res) {
  const seq = await Sequence.findOne({ step_key: req.params.stepKey }).lean();
  if (!seq) return res.status(404).json({ success: false, message: "Step not found" });
  res.json({ success: true, sequence: sortItems(seq) });
}

/**
 * PUT /api/sequences/:stepKey  body: { name?, delay_ms? }
 * Creates the step if it doesn't exist yet (this is how "Step 4", "Step 5", etc.
 * get added from the dashboard), otherwise updates its display name / delay.
 */
async function upsertSequenceMeta(req, res) {
  const { stepKey } = req.params;
  const { name, delay_ms } = req.body;

  if (!/^[a-z0-9_-]+$/i.test(stepKey)) {
    return res.status(400).json({ success: false, message: "Step key can only contain letters, numbers, - and _" });
  }

  let seq = await Sequence.findOne({ step_key: stepKey });
  if (!seq) {
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "name is required to create a new step" });
    }
    seq = await Sequence.create({ step_key: stepKey, name: name.trim(), delay_ms: delay_ms || 700, items: [] });
    return res.json({ success: true, sequence: sortItems(seq.toObject()) });
  }

  if (name !== undefined && name.trim()) seq.name = name.trim();
  if (delay_ms !== undefined) seq.delay_ms = Math.min(5000, Math.max(200, Number(delay_ms) || seq.delay_ms));
  await seq.save();
  res.json({ success: true, sequence: sortItems(seq.toObject()) });
}

/** DELETE /api/sequences/:stepKey — remove a whole step and its stored assets */
async function deleteSequence(req, res) {
  const seq = await Sequence.findOne({ step_key: req.params.stepKey });
  if (!seq) return res.status(404).json({ success: false, message: "Step not found" });

  await Promise.all(seq.items.filter((i) => i.asset_path).map((i) => sequenceStorage.deleteFile(i.asset_path)));
  await seq.deleteOne();
  res.json({ success: true });
}

/**
 * POST /api/sequences/:stepKey/items  (multipart for media types: file, type, text, order)
 * Appends a new item. For type=text, no file is needed — just text.
 */
async function addItem(req, res) {
  const { stepKey } = req.params;
  const { type, text = "", order } = req.body;
  const file = req.file;

  const seq = await Sequence.findOne({ step_key: stepKey });
  if (!seq) return res.status(404).json({ success: false, message: "Step not found" });
  if (!Sequence.ITEM_TYPES.includes(type)) {
    return res.status(400).json({ success: false, message: "Invalid item type" });
  }
  if (type !== "text" && !file) {
    return res.status(400).json({ success: false, message: "A file is required for media items" });
  }

  const item = {
    order: order !== undefined ? Number(order) : (seq.items.at(-1)?.order || 0) + 1,
    type,
    text: text || "",
  };

  if (file) {
    item.asset_path = await sequenceStorage.saveFromPath(file.path, file.originalname);
    item.file_name = file.originalname;
    item.mime_type = file.mimetype;
    item.file_id = null;
  }

  seq.items.push(item);
  await seq.save();
  res.json({ success: true, sequence: sortItems(seq.toObject()) });
}

/**
 * PUT /api/sequences/:stepKey/items/:itemId  (multipart optional: file, text, order)
 * Edits an item's text/caption/order, and optionally replaces its media file
 * (which invalidates the cached file_id so the new bytes get uploaded on next send).
 */
async function updateItem(req, res) {
  const { stepKey, itemId } = req.params;
  const { text, order } = req.body;
  const file = req.file;

  const seq = await Sequence.findOne({ step_key: stepKey });
  if (!seq) return res.status(404).json({ success: false, message: "Step not found" });

  const item = seq.items.id(itemId);
  if (!item) return res.status(404).json({ success: false, message: "Item not found" });

  if (text !== undefined) item.text = text;
  if (order !== undefined) item.order = Number(order);

  if (file) {
    if (item.asset_path) await sequenceStorage.deleteFile(item.asset_path);
    item.asset_path = await sequenceStorage.saveFromPath(file.path, file.originalname);
    item.file_name = file.originalname;
    item.mime_type = file.mimetype;
    item.file_id = null; // force a fresh upload on the next send
  }

  await seq.save();
  res.json({ success: true, sequence: sortItems(seq.toObject()) });
}

/** PUT /api/sequences/:stepKey/items/reorder  body: { order: [itemId, itemId, ...] } */
async function reorderItems(req, res) {
  const { stepKey } = req.params;
  const { order } = req.body;

  const seq = await Sequence.findOne({ step_key: stepKey });
  if (!seq) return res.status(404).json({ success: false, message: "Step not found" });
  if (!Array.isArray(order)) return res.status(400).json({ success: false, message: "order must be an array of item ids" });

  order.forEach((itemId, index) => {
    const item = seq.items.id(itemId);
    if (item) item.order = index + 1;
  });

  await seq.save();
  res.json({ success: true, sequence: sortItems(seq.toObject()) });
}

/** DELETE /api/sequences/:stepKey/items/:itemId */
async function deleteItem(req, res) {
  const { stepKey, itemId } = req.params;

  const seq = await Sequence.findOne({ step_key: stepKey });
  if (!seq) return res.status(404).json({ success: false, message: "Step not found" });

  const item = seq.items.id(itemId);
  if (!item) return res.status(404).json({ success: false, message: "Item not found" });

  if (item.asset_path) await sequenceStorage.deleteFile(item.asset_path);
  item.deleteOne();
  await seq.save();
  res.json({ success: true, sequence: sortItems(seq.toObject()) });
}

/** GET /api/sequences/items/:itemId/asset — stream a template's stored media for preview in the dashboard */
async function getAsset(req, res) {
  const { itemId } = req.params;

  const seq = await Sequence.findOne({ "items._id": itemId }).lean();
  const item = seq?.items.find((i) => String(i._id) === itemId);
  if (!item || !item.asset_path || !sequenceStorage.exists(item.asset_path)) {
    return res.status(404).json({ success: false, message: "Asset not found (it may not have been uploaded yet)" });
  }

  res.setHeader("Content-Type", item.mime_type || "application/octet-stream");
  res.setHeader("Cache-Control", "private, max-age=3600");
  const safeName = (item.file_name || "file").replace(/[\r\n"]/g, "");
  res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);
  fs.createReadStream(sequenceStorage.resolvePath(item.asset_path)).pipe(res);
}

/**
 * POST /api/sequences/:stepKey/send/:chatId
 * Triggered by the three-dot menu's "Step 2" / "Step 3" option. Responds immediately
 * once validated, then streams every configured item into the chat one at a time in
 * the background — each one lands via the normal Message + socket "message:new" path,
 * so it shows up in the open chat window live, exactly like a normal admin reply.
 */
async function runSequence(req, res) {
  const { stepKey, chatId } = req.params;

  const seq = await Sequence.findOne({ step_key: stepKey });
  if (!seq) return res.status(404).json({ success: false, message: "Step not found" });

  const user = await User.findOne({ chat_id: chatId });
  if (!user) return res.status(404).json({ success: false, message: "Chat not found" });
  if (user.is_blocked) {
    return res.status(400).json({ success: false, message: "This user is blocked — unblock them first." });
  }

  const items = [...seq.items].sort((a, b) => a.order - b.order);
  if (items.length === 0) {
    return res.status(400).json({ success: false, message: "This step has no content configured yet." });
  }

  // Ack immediately — the menu can close right away, the run itself continues async.
  res.json({ success: true, queued: true, total: items.length });

  (async () => {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        await sendSequenceItem(seq, item, chatId);
      } catch (err) {
        console.error(`[runSequence] "${stepKey}" item ${item.order} (${item.type}) failed for chat ${chatId}:`, err.message);
        if (telegramService.isBlockedByUserError(err)) {
          await User.findOneAndUpdate({ chat_id: chatId }, { has_blocked_bot: true });
          const updated = await User.findOne({ chat_id: chatId });
          if (updated) socketService.emitUserUpdate(updated);
          break; // every remaining item would fail the same way — stop here
        }
        // Some other, one-off failure (e.g. an unconfigured slot) — keep going with the rest.
      }
      if (i < items.length - 1) await sleep(seq.delay_ms || 700);
    }
  })();
}

/** Sends a single sequence item and mirrors it into Message + the dashboard's live feed */
async function sendSequenceItem(seq, item, chatId) {
  if (item.type === "text") {
    if (!item.text || !item.text.trim()) return; // nothing configured for this slot yet
    const tgResult = await telegramService.sendTextMessage(chatId, item.text);
    const message = await Message.create({
      chat_id: chatId,
      sender: "admin",
      receiver: "user",
      message_type: "text",
      text: item.text,
      telegram_message_id: tgResult.message_id,
      date: new Date(tgResult.date * 1000),
      is_read: true,
    });
    socketService.emitNewMessage(message);
    return;
  }

  // Media item
  if (!item.file_id && !item.asset_path) return; // nothing uploaded for this slot yet

  let tgResult;
  let fileId = item.file_id;

  if (fileId) {
    // Fast path: reuse the file_id from a previous run, no re-upload needed.
    tgResult = await telegramService.sendMediaByFileId(item.type, chatId, fileId, item.text || "");
  } else {
    // First time this item is ever sent: upload the real bytes once, then remember the file_id.
    // Large files (>20MB — beyond what the dashboard preview cache round-trips comfortably as a
    // buffer) stream straight from disk; smaller ones use the simple buffer path.
    const assetPath = sequenceStorage.resolvePath(item.asset_path);
    const { size } = await fs.promises.stat(assetPath);
    const STREAM_THRESHOLD_BYTES = 20 * 1024 * 1024;

    const useStream = size > STREAM_THRESHOLD_BYTES;
    let smallFileBuffer = null;

    if (useStream) {
      tgResult = await telegramService.uploadMediaStream(
        item.type,
        chatId,
        sequenceStorage.createReadStream(item.asset_path),
        item.file_name,
        item.text || ""
      );
    } else {
      smallFileBuffer = await sequenceStorage.readBuffer(item.asset_path);
      tgResult = await telegramService.uploadMediaBuffer(item.type, chatId, smallFileBuffer, item.file_name, item.text || "");
    }

    const sent = tgResult.photo ? tgResult.photo[tgResult.photo.length - 1] : tgResult[item.type];
    fileId = sent?.file_id || null;

    if (fileId) {
      item.file_id = fileId;
      item.file_unique_id = sent?.file_unique_id || null;
      await seq.save(); // persist the cached file_id so every future run of this step is instant
      if (useStream) {
        mediaCache.storeFromPath(fileId, assetPath, item.mime_type, item.file_name);
      } else {
        mediaCache.store(fileId, smallFileBuffer, item.mime_type, item.file_name);
      }
    }
  }

  const sentField = tgResult.photo ? tgResult.photo[tgResult.photo.length - 1] : tgResult[item.type];
  const message = await Message.create({
    chat_id: chatId,
    sender: "admin",
    receiver: "user",
    message_type: item.type,
    text: item.text || "",
    file_id: fileId || sentField?.file_id || null,
    file_unique_id: sentField?.file_unique_id || null,
    file_name: item.file_name || null,
    mime_type: item.mime_type || null,
    telegram_message_id: tgResult.message_id,
    date: new Date(tgResult.date * 1000),
    is_read: true,
  });
  socketService.emitNewMessage(message);
}

module.exports = {
  listSequences,
  getSequence,
  upsertSequenceMeta,
  deleteSequence,
  addItem,
  updateItem,
  reorderItems,
  deleteItem,
  getAsset,
  runSequence,
};
