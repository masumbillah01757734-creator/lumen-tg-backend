import twemoji from "@twemoji/api";

// Windows' built-in emoji font (Segoe UI Emoji) is missing glyphs for a lot of
// emoji that Android/iOS render fine, which is why some show as blank boxes on
// desktop. Twemoji renders every emoji as a small SVG image instead, so the
// same emoji looks identical everywhere regardless of what fonts are installed.
//
// NOTE: the original `twemoji` package (Twitter's) is discontinued and stuck
// on the Emoji 14.0 spec (2021) — any emoji added since then (2022+) isn't in
// its lookup table, so parse() silently leaves it as raw text and it falls
// back to tofu boxes. @twemoji/api is the actively maintained fork by the
// same original authors and stays current with new Unicode emoji releases.
const TWEMOJI_BASE = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/";

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Converts raw (untrusted) text into HTML-escaped text with emoji swapped for
// <img> tags. Safe to use with dangerouslySetInnerHTML since HTML is escaped
// before twemoji ever sees it.
export function emojifyHtml(text) {
  const escaped = escapeHtml(text ?? "");
  return twemoji.parse(escaped, {
    base: TWEMOJI_BASE,
    folder: "svg",
    ext: ".svg",
    className: "inline-emoji",
  });
}
