interface GhostTypingProps {
  ghostText: string;
  isVisible: boolean;
}

export default function GhostTyping({
  ghostText,
  isVisible,
}: GhostTypingProps) {
  if (!isVisible || !ghostText) return null;

  return (
    <div
      className="absolute bottom-2 left-4 pointer-events-none select-none"
      aria-hidden="true"
    >
      <span
        style={{
          fontFamily: "monospace",
          fontSize: "0.65rem",
          color: "oklch(0.85 0.115 207 / 0.25)",
          letterSpacing: "0.02em",
        }}
      >
        {ghostText}
        <span
          style={{
            animation: "ghost-blink 1s step-end infinite",
            marginLeft: "1px",
          }}
        >
          |
        </span>
      </span>
      <style>{`
        @keyframes ghost-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
