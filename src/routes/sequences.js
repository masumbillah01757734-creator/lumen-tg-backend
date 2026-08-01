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

// Memory storage — same pattern as routes/messages.js. Bytes are written to a
// persistent local file once (services/sequenceStorage.js), then only ever
// re-uploaded to Telegram the very first time the item is actually sent.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 45 * 1024 * 1024 },
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
