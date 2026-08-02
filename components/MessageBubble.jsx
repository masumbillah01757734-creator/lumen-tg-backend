"use client";

import { format } from "date-fns";
import { Forward } from "lucide-react";
import MediaPreview from "./MediaPreview";
import { emojifyHtml } from "../lib/emoji";

export default function MessageBubble({ message, onForward }) {
  const isOut = message.sender === "admin";
  const time = format(new Date(message.date), "h:mm a");

  const isMedia = message.message_type !== "text";
  // Voice notes and audio files keep the classic padded bubble (they're compact players, not edge-to-edge media).
  const bubblePadded = !isMedia || ["voice", "audio"].includes(message.message_type);
  const hasCaption = !!message.text && message.message_type !== "sticker";
  const isVisualMedia = ["photo", "video", "video_note", "animation"].includes(message.message_type);
  // Only float the timestamp over the media when there's no caption underneath it to sit next to instead.
  const overlayTime = isVisualMedia && !hasCaption;

  return (
    <div className={`group flex items-center gap-1 ${isOut ? "justify-end" : "justify-start"} px-4 py-1`}>
      {isOut && message.telegram_message_id && (
        <button
          type="button"
          onClick={() => onForward?.(message)}
          title="Forward"
          className="opacity-70 md:opacity-0 md:group-hover:opacity-100 h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-text-muted bg-elevated/60 md:bg-transparent hover:bg-elevated hover:text-accent active:bg-elevated transition-all"
        >
          <Forward size={14} />
        </button>
      )}

      <div
        className={`max-w-[85%] md:max-w-[70%] shadow-panel overflow-hidden ${bubblePadded ? "!px-3.5 py-2" : ""} ${isOut ? "bubble-out bg-ember text-white" : "bubble-in bg-elevated text-text-primary"
          }`}
      >
        {isMedia && (
          <div className={`relative ${hasCaption ? "mb-1.5" : ""}`}>
            <MediaPreview message={message} isOut={isOut} />
            {overlayTime && (
              <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-black/55 text-white text-[10px] leading-none">
                {time}
              </span>
            )}
          </div>
        )}

        {hasCaption && (
          <p
            className={`text-sm whitespace-pre-wrap break-words leading-relaxed ${!bubblePadded ? "px-3.5" : ""}`}
            dangerouslySetInnerHTML={{ __html: emojifyHtml(message.text) }}
          />
        )}

        {!overlayTime && (
          <span
            className={`block text-[10px] mt-1 text-right ${!bubblePadded ? "px-3.5 pb-2" : ""} ${isOut ? "text-white/70" : "text-text-faint"
              }`}
          >
            {time}
          </span>
        )}
      </div>

      {!isOut && message.telegram_message_id && (
        <button
          type="button"
          onClick={() => onForward?.(message)}
          title="Forward"
          className="opacity-70 md:opacity-0 md:group-hover:opacity-100 h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-text-muted bg-elevated/60 md:bg-transparent hover:bg-elevated hover:text-accent active:bg-elevated transition-all"
        >
          <Forward size={14} />
        </button>
      )}
    </div>
  );
}