export default function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3.5 py-3 bubble-in bg-elevated w-fit">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-text-muted animate-typingDot"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}
