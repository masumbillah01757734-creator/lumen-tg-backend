const mongoose = require("mongoose");

// Same media types the rest of the app already understands (see Message.js),
// minus the Telegram-inbound-only ones (voice/sticker/animation/video_note) that
// an admin would never compose from the dashboard.
const ITEM_TYPES = ["text", "photo", "audio", "video", "document"];

const sequenceItemSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true }, // display + send order, lowest first
    type: { type: String, enum: ITEM_TYPES, required: true },

    // For type "text": the message body. For media types: the caption (optional).
    text: { type: String, default: "" },

    // Media items only — the file the admin uploaded via the dashboard.
    file_name: { type: String, default: null },
    mime_type: { type: String, default: null },
    file_unique_id: { type: String, default: null },
    // Filename on local disk (see services/sequenceStorage.js) holding the raw bytes,
    // kept only until the item is sent for the very first time.
    asset_path: { type: String, default: null },
    // Once this item has been sent to ANY chat, Telegram's returned file_id is cached
    // here — file_ids from our bot are valid for sending to any other chat too, so
    // every future run of this step reuses it instantly with zero re-upload.
    file_id: { type: String, default: null },
  },
  { timestamps: true }
);

const sequenceSchema = new mongoose.Schema(
  {
    // Stable slug used by the frontend's three-dot menu, e.g. "step2", "step3", "step4"...
    step_key: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true }, // Display label, e.g. "Step 2"
    // Gap between each item while a run is in progress. Kept per-step so the admin
    // can tune pacing independently for each sequence.
    delay_ms: { type: Number, default: 700, min: 200, max: 5000 },
    items: [sequenceItemSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Sequence", sequenceSchema);
module.exports.ITEM_TYPES = ITEM_TYPES;
