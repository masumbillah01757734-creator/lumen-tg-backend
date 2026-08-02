const mongoose = require("mongoose");

const MESSAGE_TYPES = [
  "text",
  "photo",
  "video",
  "video_note",
  "audio",
  "voice",
  "sticker",
  "animation", // GIF
  "document",
];

const messageSchema = new mongoose.Schema(
  {
    chat_id: { type: String, required: true, index: true },
    sender: { type: String, enum: ["user", "admin"], required: true },
    receiver: { type: String, enum: ["user", "admin"], required: true },

    message_type: { type: String, enum: MESSAGE_TYPES, default: "text" },
    text: { type: String, default: "" }, // also used as caption for media

    // Telegram-only file reference. We NEVER download/store the actual file.
    file_id: { type: String, default: null },
    file_unique_id: { type: String, default: null },
    file_name: { type: String, default: null },
    mime_type: { type: String, default: null },

    telegram_message_id: { type: Number, default: null },
    date: { type: Date, default: Date.now },
    is_read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.index({ chat_id: 1, date: 1 });

module.exports = mongoose.model("Message", messageSchema);
module.exports.MESSAGE_TYPES = MESSAGE_TYPES;
