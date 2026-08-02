"use client";

import { useRef, useState } from "react";
import { Send, Smile, Paperclip, X, FileText } from "lucide-react";
import api from "../lib/api";
import { useSocket } from "../hooks/useSocket";
import { emojifyHtml } from "../lib/emoji";
import AlertDialog from "./AlertDialog";

const QUICK_EMOJIS = ["😀", "😂", "❤️", "👍", "🙏", "🎉", "🔥", "😢"];

export default function ReplyBox({ chatId, disabled, onSent }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [pendingFile, setPendingFile] = useState(null); // File chosen but not sent yet
  const [uploadPct, setUploadPct] = useState(0);
  const [blockedAlert, setBlockedAlert] = useState(false);
  const typingTimeout = useRef(null);
  const fileInputRef = useRef(null);
  const socket = useSocket();

  function handleChange(e) {
    setText(e.target.value);
    socket.emit("admin:typing", { chat_id: chatId, typing: true });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("admin:typing", { chat_id: chatId, typing: false });
    }, 1500);
  }

  function handlePickFile(e) {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    e.target.value = ""; // allow picking the same file again later
  }

  async function handleSend(e) {
    e.preventDefault();
    if (sending) return;
    if (!pendingFile && !text.trim()) return;

    setSending(true);
    try {
      if (pendingFile) {
        const form = new FormData();
        form.append("file", pendingFile);
        form.append("caption", text);
        await api.post(`/messages/${chatId}/media`, form, {
          onUploadProgress: (evt) => {
            if (evt.total) setUploadPct(Math.round((evt.loaded / evt.total) * 100));
          },
        });
        setPendingFile(null);
        setUploadPct(0);
      } else {
        await api.post(`/messages/${chatId}`, { text });
      }
      setText("");
      onSent?.();
    } catch (err) {
      console.error("Failed to send message:", err);
      if (err.response?.data?.code === "BOT_BLOCKED") {
        setBlockedAlert(true);
      } else {
        alert(err.response?.data?.message || "Failed to send. Please try again.");
      }
    } finally {
      setSending(false);
    }
  }

  if (disabled) {
    return (
      <div className="border-t border-border bg-surface px-4 py-3 text-center text-sm text-text-muted">
        This user is blocked. Unblock them to reply.
      </div>
    );
  }

  return (
    <form onSubmit={handleSend} className="border-t border-border bg-surface px-4 py-3 flex flex-col gap-2 [width:stretch] relative bottom-0">
      <AlertDialog
        open={blockedAlert}
        title="Can't deliver this message"
        description="This user has blocked the bot, so they won't receive anything you send until they unblock it on their end."
        onClose={() => setBlockedAlert(false)}
      />

      {pendingFile && (
        <div className="flex items-center gap-2 bg-elevated border border-border rounded-lg px-3 py-2 text-xs">
          <FileText size={14} className="text-accent shrink-0" />
          <span className="truncate flex-1">{pendingFile.name}</span>
          {sending ? (
            <span className="text-text-muted shrink-0">{uploadPct}%</span>
          ) : (
            <button
              type="button"
              onClick={() => setPendingFile(null)}
              className="text-text-muted hover:text-danger shrink-0"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      <div className="flex items-end gap-2">
        {showEmoji && (
          <div className="absolute bottom-16 left-4 bg-[#252019] border border-border/80 rounded-xl p-2 flex gap-1 shadow-xl shadow-black/40 z-10">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="h-9 w-9 flex items-center justify-center text-xl rounded-lg hover:bg-elevated hover:scale-110 transition-all"
                onClick={() => {
                  setText((t) => t + emoji);
                  setShowEmoji(false);
                }}
                dangerouslySetInnerHTML={{ __html: emojifyHtml(emoji) }}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowEmoji((s) => !s)}
          className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center transition-colors ${
            showEmoji ? "bg-elevated text-accent" : "text-text-muted hover:bg-elevated hover:text-text-primary"
          }`}
        >
          <Smile size={20} />
        </button>

        {/* Attach: photo, video, audio, zip, or any other document — same as Telegram's own attach menu */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handlePickFile}
          accept="image/*,video/*,audio/*,.zip,.rar,.7z,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Attach photo, video, audio, or file (zip etc.)"
          className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-text-muted hover:bg-elevated transition-colors"
        >
          <Paperclip size={20} />
        </button>

        <textarea
          rows={1}
          value={text}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) handleSend(e);
          }}
          placeholder={pendingFile ? "Add a caption (optional)…" : "Type a reply…"}
          className="flex-1 resize-none bg-elevated border border-border rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-accent max-h-32"
        />

        <button
          type="submit"
          disabled={(!text.trim() && !pendingFile) || sending}
          className="h-9 w-9 shrink-0 rounded-full bg-ember hover:brightness-110 disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed text-white flex items-center justify-center transition-all shadow-ember"
        >
          <Send size={16} />
        </button>
      </div>
    </form>
  );
}
