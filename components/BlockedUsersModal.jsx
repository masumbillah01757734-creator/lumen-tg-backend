"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import api from "../lib/api";
import Avatar from "./Avatar";

export default function BlockedUsersModal({ open, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api
      .get("/chats/blocked")
      .then(({ data }) => setUsers(data.users))
      .finally(() => setLoading(false));
  }, [open]);

  async function unblock(chatId) {
    await api.post(`/chats/${chatId}/unblock`);
    setUsers((prev) => prev.filter((u) => u.chat_id !== chatId));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-surface border border-border rounded-xl2 w-full max-w-md max-h-[70vh] flex flex-col shadow-panel">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-display font-semibold text-base">Blocked users</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {loading && <p className="text-center text-xs text-text-muted mt-4">Loading…</p>}
          {!loading && users.length === 0 && (
            <p className="text-center text-xs text-text-muted mt-4">No blocked users.</p>
          )}
          {users.map((u) => (
            <div key={u.chat_id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-elevated">
              <Avatar user={u} size={40} showOnline={false} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {[u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || u.chat_id}
                </p>
                <p className="text-xs text-text-muted truncate">
                  {u.block_reason || "No reason given"} · {new Date(u.blocked_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => unblock(u.chat_id)}
                className="text-xs font-medium text-accent hover:text-accent-dim shrink-0"
              >
                Unblock
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
