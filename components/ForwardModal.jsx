"use client";

import { useEffect, useState } from "react";
import { Search, Forward } from "lucide-react";
import api from "../lib/api";
import Avatar from "./Avatar";

/**
 * Lets the admin pick another chat to re-send a message into.
 * Uses Telegram's copyMessage under the hood (see backend), so the recipient
 * never sees "Forwarded from …" — no trace of the original sender.
 */
export default function ForwardModal({ open, message, excludeChatId, onClose, onForwarded }) {
  const [chats, setChats] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingTo, setSendingTo] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setError("");
    setLoading(true);
    api
      .get("/chats", { params: { search: "", archived: false } })
      .then(({ data }) => setChats(data.chats.filter((c) => c.chat_id !== excludeChatId)))
      .finally(() => setLoading(false));
  }, [open, excludeChatId]);

  if (!open || !message) return null;

  const filtered = chats.filter((c) => {
    const name = [c.first_name, c.last_name, c.username].filter(Boolean).join(" ").toLowerCase();
    return name.includes(search.toLowerCase());
  });

  async function forwardTo(targetChatId) {
    setSendingTo(targetChatId);
    setError("");
    try {
      await api.post(`/messages/${excludeChatId}/forward`, {
        toChatId: targetChatId,
        telegramMessageId: message.telegram_message_id,
      });
      onForwarded?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to forward message.");
    } finally {
      setSendingTo(null);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-surface border border-border rounded-xl2 w-full max-w-sm shadow-panel max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="font-display font-semibold text-base flex items-center gap-2">
            <Forward size={16} className="text-accent" />
            Forward message
          </h3>
          <p className="text-xs text-text-muted mt-1">
            Sent anonymously — the recipient won't see who it originally came from.
          </p>
        </div>

        <div className="px-4 py-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats"
              className="w-full bg-elevated border border-border rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
        </div>

        {error && <p className="px-4 pb-2 text-xs text-danger">{error}</p>}

        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
          {loading && <p className="text-center text-xs text-text-muted mt-6">Loading chats…</p>}
          {!loading && filtered.length === 0 && (
            <p className="text-center text-xs text-text-muted mt-6">No other chats found.</p>
          )}
          {filtered.map((chat) => {
            const displayName = [chat.first_name, chat.last_name].filter(Boolean).join(" ") || chat.username || chat.chat_id;
            return (
              <button
                key={chat.chat_id}
                disabled={sendingTo !== null}
                onClick={() => forwardTo(chat.chat_id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-elevated transition-colors disabled:opacity-50"
              >
                <Avatar user={chat} size={36} />
                <span className="text-sm font-medium truncate flex-1">{displayName}</span>
                {sendingTo === chat.chat_id && (
                  <div className="h-4 w-4 rounded-full border-2 border-accent border-t-transparent animate-spin shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        <div className="p-3 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-2 text-sm rounded-lg text-text-muted hover:bg-elevated transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
