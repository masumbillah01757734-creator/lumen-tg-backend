const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = (header.startsWith("Bearer ") ? header.slice(7) : null) || req.query.token || null;

  if (!token) {
    return res.status(401).json({ success: false, message: "Missing auth token" });
  }

  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

/** Verifies the `X-Telegram-Bot-Api-Secret-Token` header Telegram sends with every webhook call */
function verifyTelegramSecret(req, res, next) {
  const secret = req.headers["x-telegram-bot-api-secret-token"];
  if (secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ success: false, message: "Invalid webhook secret" });
  }
  next();
}

module.exports = { requireAuth, verifyTelegramSecret };
