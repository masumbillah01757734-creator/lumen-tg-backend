require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const connectDB = require("./src/config/db");
const { initSocket } = require("./src/services/socketService");
const { verifyEmailConfig } = require("./src/services/emailService");
const errorHandler = require("./src/middleware/errorHandler");

const authRoutes = require("./src/routes/auth");
const telegramRoutes = require("./src/routes/telegram");
const chatRoutes = require("./src/routes/chats");
const messageRoutes = require("./src/routes/messages");
const fileRoutes = require("./src/routes/files");

const app = express();
const server = http.createServer(app);

// Railway (এবং অন্য যেকোনো reverse proxy) X-Forwarded-For header পাঠায়।
// এটা সেট না করলে express-rate-limit ভুল client IP ধরবে বা error দেবে।
app.set("trust proxy", 1);

// ---- Core middleware ----
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ---- Health check ----
app.get("/health", (req, res) => res.json({ success: true, status: "ok", time: new Date() }));

// ---- Routes ----
app.use("/api/auth", authRoutes);
app.use("/api/telegram", telegramRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/files", fileRoutes);

// ---- 404 + error handling ----
app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));
app.use(errorHandler);

// ---- Boot ----
const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  verifyEmailConfig(); // logs clearly at boot if Gmail rejects SMTP_USER/SMTP_PASS
  initSocket(server);
  server.listen(PORT, () => {
    console.log(`[Server] Listening on port ${PORT}`);
    console.log(`[Server] Webhook endpoint: POST /api/telegram/webhook`);
  });
}

start();

process.on("unhandledRejection", (err) => {
  console.error("[Unhandled Rejection]", err);
});
