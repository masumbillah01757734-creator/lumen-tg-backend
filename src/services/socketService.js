//C:\Users\Admin\Desktop\lumen messesg\backend\src\services\socketService.js
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let io = null;
let adminSocketCount = 0; // how many admin dashboard tabs are currently connected

function initSocket(httpServer, allowedOrigins) {
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins && allowedOrigins.length ? allowedOrigins : process.env.CLIENT_URL,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Only authenticated admins may connect (dashboard clients)
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Unauthorized"));
      jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch (err) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    adminSocketCount += 1;
    socket.emit("presence:self", { online: true });

    socket.on("disconnect", () => {
      adminSocketCount = Math.max(0, adminSocketCount - 1);
    });

    // Admin is typing a reply to a specific chat
    socket.on("admin:typing", ({ chat_id, typing }) => {
      socket.broadcast.emit("admin:typing", { chat_id, typing });
    });

    // Admin marked a chat as read
    socket.on("chat:read", ({ chat_id }) => {
      socket.broadcast.emit("chat:read", { chat_id });
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error("Socket.IO not initialized yet");
  return io;
}

/** Whether any admin dashboard tab is currently connected */
function isAdminOnline() {
  return adminSocketCount > 0;
}

// ---- Emit helpers used across controllers ----

function emitNewMessage(message) {
  getIO().emit("message:new", message);
}

function emitUserUpdate(user) {
  getIO().emit("user:update", user);
}

function emitUserTyping(chat_id, typing) {
  getIO().emit("user:typing", { chat_id, typing });
}

function emitBlockStatus(chat_id, is_blocked) {
  getIO().emit("user:block-status", { chat_id, is_blocked });
}

module.exports = {
  initSocket,
  getIO,
  isAdminOnline,
  emitNewMessage,
  emitUserUpdate,
  emitUserTyping,
  emitBlockStatus,
};