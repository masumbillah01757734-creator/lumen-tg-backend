const express = require("express");
const { requireAuth } = require("../middleware/auth");
const {
  listChats,
  getChat,
  markAsRead,
  togglePin,
  toggleArchive,
  deleteChat,
  blockUser,
  unblockUser,
  listBlockedUsers,
} = require("../controllers/chatController");

const router = express.Router();

router.use(requireAuth);

router.get("/", listChats);
router.get("/blocked", listBlockedUsers);
router.get("/:chatId", getChat);
router.post("/:chatId/read", markAsRead);
router.post("/:chatId/pin", togglePin);
router.post("/:chatId/archive", toggleArchive);
router.delete("/:chatId", deleteChat);
router.post("/:chatId/block", blockUser);
router.post("/:chatId/unblock", unblockUser);

module.exports = router;
