const jwt = require("jsonwebtoken");

/**
 * Single-admin login. Credentials come from environment variables, never hardcoded.
 * For production, consider hashing ADMIN_PASSWORD with bcrypt and storing the hash instead.
 */
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  const token = jwt.sign({ email, role: "admin" }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

  res.json({ success: true, token, admin: { email } });
}

function me(req, res) {
  res.json({ success: true, admin: req.admin });
}

module.exports = { login, me };
