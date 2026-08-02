const os = require("os");
const express = require("express");
const multer = require("multer");
const { requireAuth } = require("../middleware/auth");
const {
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
} = require("../controllers/sequenceController");

const router = express.Router();

// Disk storage (temp dir) — large files stream straight to disk instead of filling
// RAM. sequenceController then moves the temp file into permanent storage
// (services/sequenceStorage.js) via saveFromPath. The item is only ever re-uploaded
// to Telegram the first time it's actually sent (see runSequence).
//
// Default limit is 2GB — the ceiling a self-hosted Local Bot API Server supports
// (the public cloud Bot API only allows 50MB). If you haven't set up the local
// server yet (see docs/local-bot-api-server.md), set MAX_UPLOAD_MB lower so users
// get a clear error instead of an upload that will fail later when sending.
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB) || 2000;
const upload = multer({
  storage: multer.diskStorage({ destination: os.tmpdir() }),
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
});

router.use(requireAuth);

router.get("/", listSequences);
router.get("/items/:itemId/asset", getAsset);

router.get("/:stepKey", getSequence);
router.put("/:stepKey", upsertSequenceMeta);
router.delete("/:stepKey", deleteSequence);

router.post("/:stepKey/items", upload.single("file"), addItem);
router.put("/:stepKey/items/reorder", reorderItems);
router.put("/:stepKey/items/:itemId", upload.single("file"), updateItem);
router.delete("/:stepKey/items/:itemId", deleteItem);

router.post("/:stepKey/send/:chatId", runSequence);

module.exports = router;
