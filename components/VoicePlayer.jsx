"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

const BAR_COUNT = 34;

// Deterministic pseudo-waveform so the same voice note always renders the same
// shape (no real decoding needed — just a stable per-message fingerprint).
function waveform(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const bars = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    const t = i / BAR_COUNT;
    // gentle envelope so bars taper at the ends, like a real clip
    const envelope = Math.sin(Math.PI * t) * 0.7 + 0.3;
    bars.push(Math.max(0.16, ((h % 1000) / 1000) * envelope));
  }
  return bars;
}

function formatTime(sec) {
  if (!Number.isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const SPEEDS = [1, 1.5, 2];

export default function VoicePlayer({ src, seed, variant = "voice", inverted = false, fileName = null }) {
  const audioRef = useRef(null);
  const trackRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);

  const bars = useMemo(() => waveform(seed || src || "voice"), [seed, src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration) setProgress(audio.currentTime / audio.duration);
    };
    const onLoaded = () => setDuration(audio.duration || 0);
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnd);
    };
  }, []);

  // Keep the <audio> element's actual playback rate in sync with the chosen speed,
  // whether it's changed mid-playback or before the clip has even started.
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.playbackRate = speed;
      audio.play();
      setPlaying(true);
    }
  }

  function cycleSpeed(e) {
    e.stopPropagation();
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
  }

  function seekTo(clientX) {
    const audio = audioRef.current;
    const track = trackRef.current;
    if (!audio || !track || !audio.duration) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
    setProgress(ratio);
  }

  const label = variant === "audio" ? "Audio" : "Voice message";

  return (
    <div className="w-full max-w-[224px] min-w-0">
      {fileName && (
        <div className={`text-[11px] font-medium truncate mb-1 ${inverted ? "text-white/90" : "text-text"}`}>
          {fileName}
        </div>
      )}
      <div className="flex items-center gap-2.5 w-full min-w-0">
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />

      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? `Pause ${label.toLowerCase()}` : `Play ${label.toLowerCase()}`}
        className={`shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition-transform active:scale-95 ${
          inverted ? "bg-white text-accent-dim shadow-panel" : "bg-ember text-white shadow-ember"
        } ${playing ? "animate-emberPulse" : ""}`}
      >
        {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0">
        <div
          ref={trackRef}
          onClick={(e) => seekTo(e.clientX)}
          className="relative h-6 flex items-center gap-[2px] cursor-pointer select-none"
        >
          {bars.map((h, i) => {
            const barPos = i / BAR_COUNT;
            const filled = barPos <= progress;
            const filledClass = inverted ? "bg-white" : "bg-accent-bright";
            const restClass = inverted ? "bg-white/30" : "bg-current opacity-30";
            return (
              <span
                key={i}
                className={`flex-1 rounded-full transition-colors ${filled ? filledClass : restClass}`}
                style={{ height: `${Math.round(h * 100)}%` }}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-[10px] opacity-70 tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <button
            type="button"
            onClick={cycleSpeed}
            aria-label="Change playback speed"
            className={`shrink-0 text-[10px] font-semibold leading-none px-1.5 py-0.5 rounded-full transition-colors ${
              inverted ? "bg-white/20 hover:bg-white/30 text-white" : "bg-accent/15 hover:bg-accent/25 text-accent"
            }`}
          >
            {speed}x
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}