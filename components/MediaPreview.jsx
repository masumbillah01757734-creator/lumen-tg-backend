"use client";

import { useState } from "react";
import { FileText, Download, X } from "lucide-react";
import VoicePlayer from "./VoicePlayer";

function fileUrl(fileId, fileName, { download = false } = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const params = new URLSearchParams({ token: token || "" });
  if (fileName) params.set("filename", fileName);
  if (download) params.set("download", "1");
  return `${process.env.NEXT_PUBLIC_API_URL}/files/${fileId}?${params.toString()}`;
}

// Tappable/clickable image: click once to go fullscreen, click again (or the X) to go back.
function FullscreenableImage({ src, alt, className }) {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`${className} cursor-zoom-in`}
        loading="lazy"
        onClick={() => setFullscreen(true)}
      />

      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setFullscreen(false)}
        >
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            aria-label="Close fullscreen"
            className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X size={18} />
          </button>
          <img src={src} alt={alt} className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </>
  );
}

export default function MediaPreview({ message, isOut = false }) {
  const { message_type, file_id, file_name, text } = message;
  const src = file_id ? fileUrl(file_id, file_name) : null;

  switch (message_type) {
    case "photo":
      return (
        <FullscreenableImage
          src={src}
          alt={text || "Photo"}
          className="rounded-lg w-full max-w-[280px] max-h-[320px] object-cover"
        />
      );

    case "video":
      return (
        <video controls className="rounded-lg w-full max-w-[280px] max-h-[320px]">
          <source src={src} />
        </video>
      );

    case "video_note":
      return (
        <video
          controls
          className="rounded-full w-[45vw] h-[45vw] max-w-[200px] max-h-[200px] object-cover"
        >
          <source src={src} />
        </video>
      );

    case "animation": // GIF
      return <FullscreenableImage src={src} alt="GIF" className="rounded-lg w-full max-w-[240px]" />;

    case "sticker":
      return (
        <div className="flex flex-col items-start">
          <img src={src} alt={text || "Sticker"} className="w-32 h-32 object-contain" loading="lazy" />
          {text && <span className="text-xs text-text-muted mt-1">{text}</span>}
        </div>
      );

    case "audio":
      return <VoicePlayer src={src} seed={file_id} variant="audio" inverted={isOut} fileName={file_name} />;

    case "voice":
      return <VoicePlayer src={src} seed={file_id} variant="voice" inverted={isOut} />;

    case "document": {
      // download=1 forces Content-Disposition: attachment on the backend, so zips and other
      // archives actually save to disk instead of just opening a blank tab.
      const downloadUrl = fileUrl(file_id, file_name, { download: true });
      return (
        <a
          href={downloadUrl}
          download={file_name || undefined}
          className={`flex items-center gap-3 border rounded-lg px-3 py-2.5 max-w-[260px] transition-colors ${
            isOut
              ? "bg-white/10 hover:bg-white/15 border-white/15"
              : "bg-elevated hover:bg-elevated/70 border-border"
          }`}
        >
          <div
            className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
              isOut ? "bg-white/20" : "bg-accent/15"
            }`}
          >
            <FileText size={18} className={isOut ? "text-white" : "text-accent"} />
          </div>
          <span className="text-sm truncate flex-1">{file_name || "Document"}</span>
          <Download size={16} className={`shrink-0 ${isOut ? "text-white/70" : "text-text-muted"}`} />
        </a>
      );
    }

    default:
      return null;
  }
}