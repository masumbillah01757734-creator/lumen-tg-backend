const User = require("../models/User");
const socketService = require("../services/socketService");
const telegramService = require("../services/telegramService");

/**
 * Call this from any controller's catch block after a telegramService send/upload call fails.
 * If the failure means the Telegram user has blocked the bot, this persists that on the User
 * record (so the dashboard can show it persistently, not just as a one-off popup) and responds
 * with a specific, friendly error. For any other kind of failure, it just forwards err.message
 * as a generic 500 — same behavior as before this existed.
 */
async function respondToSendFailure(err, chatId, res) {
  if (telegramService.isBlockedByUserError(err)) {
    const user = await User.findOneAndUpdate({ chat_id: chatId }, { has_blocked_bot: true }, { new: true });
    if (user) socketService.emitUserUpdate(user);

    return res.status(409).json({
      success: false,
      code: "BOT_BLOCKED",
      message: "This user has blocked the bot, so this message can't be delivered.",
    });
  }

  console.error("[telegram send failed]", err.message);
  res.status(500).json({ success: false, message: err.message || "Failed to send message" });
}

module.exports = { respondToSendFailure };
