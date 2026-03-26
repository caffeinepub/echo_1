import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

interface SignalActor {
  create_channel(code: string): Promise<boolean>;
}

interface FrequencySignalProps {
  onConnected: () => void;
  mourningMode: boolean;
  actor: SignalActor | null;
  rawCode: string;
  shareLink: string;
}

export default function FrequencySignal({
  onConnected,
  mourningMode,
  actor,
  rawCode,
  shareLink,
}: FrequencySignalProps) {
  const [copied, setCopied] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareLink);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = shareLink;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function handleConnect() {
    if (connecting || connected || !actor) return;
    setConnecting(true);
    try {
      await actor.create_channel(rawCode);
    } catch {
      // ignore
    }
    setConnecting(false);
    setConnected(true);
    onConnected();
  }

  return (
    <div
      className="flex flex-col items-center gap-3"
      style={{ filter: mourningMode ? "grayscale(1)" : undefined }}
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.span
            key="copied"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="font-cinzel text-xs tracking-[0.2em]"
            style={{ color: "oklch(0.72 0.060 150 / 0.8)" }}
          >
            \u25c8 link kopyaland\u0131 \u2713
          </motion.span>
        ) : (
          <motion.button
            key="copy"
            type="button"
            onClick={handleCopyLink}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="text-xs tracking-[0.18em] transition-all duration-300"
            style={{
              color: "oklch(0.55 0.030 207 / 0.6)",
              fontFamily: "inherit",
              background: "none",
              border: "none",
              cursor: "pointer",
              letterSpacing: "0.18em",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "oklch(0.75 0.060 207 / 0.9)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "oklch(0.55 0.030 207 / 0.6)";
            }}
            data-ocid="frequency.copy_link_button"
            aria-label="Copy share link"
          >
            \u25c8 ba\u011flant\u0131 linki kopyala
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {connecting ? (
          <motion.span
            key="connecting"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{
              duration: 1.2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
            className="text-xs tracking-[0.18em]"
            style={{ color: "oklch(0.65 0.060 207 / 0.7)" }}
          >
            frekans a\u00e7\u0131l\u0131yor\u00b7\u00b7\u00b7
          </motion.span>
        ) : connected ? (
          <motion.span
            key="connected"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="font-cinzel text-xs tracking-widest"
            style={{
              color: "oklch(0.85 0.115 207)",
              textShadow: "0 0 12px oklch(0.85 0.115 207 / 0.5)",
            }}
          >
            \u25c8 kanal a\u00e7\u0131ld\u0131
          </motion.span>
        ) : (
          <motion.button
            key="idle"
            type="button"
            onClick={handleConnect}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="text-xs tracking-[0.22em] transition-all duration-300"
            style={{
              color: "oklch(0.45 0.020 222 / 0.5)",
              fontFamily: "inherit",
              background: "none",
              border: "none",
              cursor: "pointer",
              letterSpacing: "0.22em",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "oklch(0.72 0.030 220 / 0.8)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "oklch(0.45 0.020 222 / 0.5)";
            }}
            data-ocid="frequency.signal_button"
            aria-label="Send frequency signal"
          >
            \u25c8 frekans sinyali
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
