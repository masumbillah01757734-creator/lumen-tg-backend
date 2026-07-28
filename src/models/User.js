const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    chat_id: { type: String, required: true, unique: true, index: true },
    username: { type: String, default: null },
    first_name: { type: String, default: "" },
    last_name: { type: String, default: "" },
    profile_photo_file_id: { type: String, default: null }, // Telegram file_id only, never stored on disk
    last_seen: { type: Date, default: Date.now },

    // Presence
    is_online: { type: Boolean, default: false },
    is_typing: { type: Boolean, default: false },

    // Inbox management
    unread_count: { type: Number, default: 0 },
    is_pinned: { type: Boolean, default: false },
    is_archived: { type: Boolean, default: false },

    // Blocking
    is_blocked: { type: Boolean, default: false },
    block_reason: { type: String, default: null },
    blocked_at: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ username: "text", first_name: "text", last_name: "text" });

module.exports = mongoose.model("User", userSchema);
