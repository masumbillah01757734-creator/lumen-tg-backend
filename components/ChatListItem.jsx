"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { Pin, Ban } from "lucide-react";
import Avatar from "./Avatar";
import { emojifyHtml } from "../lib/emoji";

function preview(message) {
  if (!message) return "No messages yet";
  if (message.message_type === "text") return message.text;
  const label = { photo: "Photo", video: "Video", video_note: "Video message", audio: "Audio", voice: "Voice message", sticker: "Sticker", animation: "GIF", document: "Document" }[message.message_type];
  return `${message.sender === "admin" ? "You: " : ""}${label}`;
}

export default function ChatListItem({ chat, active, onClick }) {
  const displayName = [chat.first_name, chat.last_name].filter(Boolean).join(" ") || chat.username || chat.chat_id;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
        active ? "bg-accent/15" : "hover:bg-elevated"
      }`}
    >
      <Avatar user={chat} size={48} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate flex items-center gap-1">
            {chat.is_pinned && <Pin size={12} className="text-text-muted shrink-0" />}
            {chat.is_blocked && <Ban size={12} className="text-danger shrink-0" />}
            {displayName}
          </span>
          {chat.last_message && (
            <span className="text-[11px] text-text-faint shrink-0">
              {formatDistanceToNowStrict(new Date(chat.last_message.date), { addSuffix: false })}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span
            className="text-xs text-text-muted truncate"
            dangerouslySetInnerHTML={{ __html: emojifyHtml(preview(chat.last_message)) }}
          />
          {chat.unread_count > 0 && (
            <span className="shrink-0 bg-accent text-white text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {chat.unread_count > 99 ? "99+" : chat.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
