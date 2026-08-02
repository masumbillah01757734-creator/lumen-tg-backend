const User = require("../models/User");
const Message = require("../models/Message");
const telegramService = require("../services/telegramService");
const socketService = require("../services/socketService");

/** GET /api/chats?search=&archived=false */
async function listChats(req, res) {
  const { search = "", archived = "false" } = req.query;

  const filter = { is_archived: archived === "true" };
  if (search.trim()) {
    filter.$or = [
      { username: { $regex: search, $options: "i" } },
      { first_name: { $regex: search, $options: "i" } },
      { last_name: { $regex: search, $options: "i" } },
    ];
  }

  const users = await User.find(filter).lean();

  // Attach last message per chat
  const chats = await Promise.all(
    users.map(async (user) => {
      const lastMessage = await Message.findOne({ chat_id: user.chat_id }).sort({ date: -1 }).lean();
      return { ...user, last_message: lastMessage || null };
    })
  );

  chats.sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    const aTime = a.last_message?.date || a.createdAt;
    const bTime = b.last_message?.date || b.createdAt;
    return new Date(bTime) - new Date(aTime);
  });

  res.json({ success: true, chats });
}

async function getChat(req, res) {
  const user = await User.findOne({ chat_id: req.params.chatId });
  if (!user) return res.status(404).json({ success: false, message: "Chat not found" });
  res.json({ success: true, chat: user });
}

async function markAsRead(req, res) {
  const { chatId } = req.params;
  await Message.updateMany({ chat_id: chatId, sender: "user", is_read: false }, { is_read: true });
  const user = await User.findOneAndUpdate({ chat_id: chatId }, { unread_count: 0 }, { new: true });
  socketService.emitUserUpdate(user);
  res.json({ success: true, chat: user });
}

async function togglePin(req, res) {
  const user = await User.findOne({ chat_id: req.params.chatId });
  if (!user) return res.status(404).json({ success: false, message: "Chat not found" });
  user.is_pinned = !user.is_pinned;
  await user.save();
  socketService.emitUserUpdate(user);
  res.json({ success: true, chat: user });
}

async function toggleArchive(req, res) {
  const user = await User.findOne({ chat_id: req.params.chatId });
  if (!user) return res.status(404).json({ success: false, message: "Chat not found" });
  user.is_archived = !user.is_archived;
  await user.save();
  socketService.emitUserUpdate(user);
  res.json({ success: true, chat: user });
}

async function deleteChat(req, res) {
  const { chatId } = req.params;
  await Message.deleteMany({ chat_id: chatId });
  await User.deleteOne({ chat_id: chatId });
  socketService.getIO().emit("chat:deleted", { chat_id: chatId });
  res.json({ success: true });
}

/** POST /api/chats/:chatId/block  body: { reason } */
async function blockUser(req, res) {
  const { chatId } = req.params;
  const { reason = "" } = req.body;

  const user = await User.findOneAndUpdate(
    { chat_id: chatId },
    { is_blocked: true, block_reason: reason || null, blocked_at: new Date() },
    { new: true }
  );
  if (!user) return res.status(404).json({ success: false, message: "Chat not found" });

  socketService.emitBlockStatus(chatId, true);
  res.json({ success: true, chat: user });
}

async function unblockUser(req, res) {
  const { chatId } = req.params;
  const user = await User.findOneAndUpdate(
    { chat_id: chatId },
    { is_blocked: false, block_reason: null, blocked_at: null },
    { new: true }
  );
  if (!user) return res.status(404).json({ success: false, message: "Chat not found" });

  socketService.emitBlockStatus(chatId, false);
  res.json({ success: true, chat: user });
}

async function listBlockedUsers(req, res) {
  const users = await User.find({ is_blocked: true }).sort({ blocked_at: -1 });
  res.json({ success: true, users });
}

module.exports = {
  listChats,
  getChat,
  markAsRead,
  togglePin,
  toggleArchive,
  deleteChat,
  blockUser,
  unblockUser,
  listBlockedUsers,
};
