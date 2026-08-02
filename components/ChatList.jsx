"use client";

import { useEffect, useState } from "react";
import { Search, MessageCircle, Archive as ArchiveIcon, Users } from "lucide-react";
import api from "../lib/api";
import ChatListItem from "./ChatListItem";
import { useSocketEvent } from "../hooks/useSocket";
import { playNotificationSound } from "../lib/notificationSound";

export default function ChatList({ activeChatId, onSelectChat, onOpenBlocked }) {
  const [chats, setChats] = useState([]);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadChats() {
    setLoading(true);
    try {
      const { data } = await api.get("/chats", { params: { search, archived: showArchived } });
      setChats(data.chats);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(loadChats, 250); // debounce search
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, showArchived]);

  useSocketEvent("message:new", (message) => {
    // Only ding for incoming messages, not the admin's own replies echoed back.
    if (message.sender === "user") playNotificationSound();

    setChats((prev) => {
      const idx = prev.findIndex((c) => c.chat_id === message.chat_id);
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = { ...updated[idx], last_message: message };
      return updated;
    });
  });

  useSocketEvent("user:update", (user) => {
    setChats((prev) => {
      const idx = prev.findIndex((c) => c.chat_id === user.chat_id);
      if (idx === -1) {
        if (!showArchived && !user.is_archived) return [{ ...user, last_message: null }, ...prev];
        return prev;
      }
      const updated = [...prev];
      updated[idx] = { ...updated[idx], ...user };
      return updated;
    });
  });

  useSocketEvent("chat:deleted", ({ chat_id }) => {
    setChats((prev) => prev.filter((c) => c.chat_id !== chat_id));
  });

  useSocketEvent("user:block-status", ({ chat_id, is_blocked }) => {
    setChats((prev) => prev.map((c) => (c.chat_id === chat_id ? { ...c, is_blocked } : c)));
  });

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between ember-wash shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-ember flex items-center justify-center shadow-ember">
            <MessageCircle size={15} className="text-white" fill="currentColor" />
          </div>
          <h1 className="font-display font-bold text-base tracking-tight">Lumen</h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            title="Blocked users"
            onClick={onOpenBlocked}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-text-muted hover:bg-elevated"
          >
            <Users size={16} />
          </button>
          <button
            title={showArchived ? "Show active chats" : "Show archived chats"}
            onClick={() => setShowArchived((s) => !s)}
            className={`h-8 w-8 rounded-lg flex items-center justify-center hover:bg-elevated ${
              showArchived ? "text-accent" : "text-text-muted"
            }`}
          >
            <ArchiveIcon size={16} />
          </button>
        </div>
      </div>

      <div className="px-4 pb-3 shrink-0">
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

      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-4 space-y-0.5">
        {loading && <p className="text-center text-xs text-text-muted mt-6">Loading chats…</p>}
        {!loading && chats.length === 0 && (
          <p className="text-center text-xs text-text-muted mt-6">
            {showArchived ? "No archived chats." : "No conversations yet — new messages will show up here."}
          </p>
        )}
        {chats.map((chat) => (
          <ChatListItem
            key={chat.chat_id}
            chat={chat}
            active={chat.chat_id === activeChatId}
            onClick={() => onSelectChat(chat.chat_id)}
          />
        ))}
      </div>
    </div>
  );
}
