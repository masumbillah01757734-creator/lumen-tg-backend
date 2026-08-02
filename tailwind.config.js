/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        base: "#0A1316",
        surface: "#0F1B1F",
        elevated: "#17262B",
        border: "#223339",
        accent: {
          DEFAULT: "#2BB6C9",
          dim: "#1D8C9C",
          bright: "#8CE9F2",
          soft: "rgba(43, 182, 201, 0.14)",
        },
        online: "#43D97B",
        danger: "#F2564F",
        text: {
          primary: "#EAF3F4",
          muted: "#8FA3A8",
          faint: "#5C7075",
        },
      },
      fontFamily: {
        display: [
          "var(--font-sora)",
          "sans-serif",
          "Apple Color Emoji",
          "Segoe UI Emoji",
          "Segoe UI Symbol",
          "Noto Color Emoji",
        ],
        sans: [
          "var(--font-inter)",
          "sans-serif",
          "Apple Color Emoji",
          "Segoe UI Emoji",
          "Segoe UI Symbol",
          "Noto Color Emoji",
        ],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      backgroundImage: {
        ember: "linear-gradient(135deg, #2BB6C9 0%, #2467D1 100%)",
        "ember-radial": "radial-gradient(circle at 30% 20%, rgba(43,182,201,0.30), rgba(10,19,22,0) 60%)",
      },
      boxShadow: {
        panel: "0 0 0 1px rgba(255,255,255,0.04)",
        glow: "0 0 0 3px rgba(67, 217, 123, 0.15)",
        ember: "0 4px 24px -6px rgba(43, 182, 201, 0.45)",
      },
      keyframes: {
        typingDot: {
          "0%, 60%, 100%": { transform: "translateY(0)", opacity: "0.4" },
          "30%": { transform: "translateY(-3px)", opacity: "1" },
        },
        pulseRing: {
          "0%": { boxShadow: "0 0 0 0 rgba(67, 217, 123, 0.45)" },
          "100%": { boxShadow: "0 0 0 6px rgba(67, 217, 123, 0)" },
        },
        emberPulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
      },
      animation: {
        typingDot: "typingDot 1.2s infinite ease-in-out",
        pulseRing: "pulseRing 1.6s infinite",
        emberPulse: "emberPulse 1.8s infinite ease-in-out",
      },
    },
  },
  plugins: [],
};
