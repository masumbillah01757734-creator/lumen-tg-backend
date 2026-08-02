"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Loader2 } from "lucide-react";
import api from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", data.token);
      router.replace("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base ember-wash px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-9">
          <div className="h-14 w-14 rounded-2xl bg-ember flex items-center justify-center shadow-ember">
            <MessageCircle size={26} className="text-white" fill="currentColor" />
          </div>
          <span className="font-display text-2xl font-bold tracking-tight">Lumen</span>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface border border-border rounded-xl2 p-6 shadow-panel space-y-4"
        >
          <div>
            <h1 className="font-display text-lg font-semibold mb-1">Sign in to your inbox</h1>
            <p className="text-sm text-text-muted">Reply to every Telegram conversation from one place.</p>
          </div>

          {error && (
            <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-accent"
              placeholder="admin@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-accent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ember hover:brightness-110 disabled:opacity-60 text-white font-medium text-sm rounded-lg py-2.5 flex items-center justify-center gap-2 transition-all shadow-ember"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
