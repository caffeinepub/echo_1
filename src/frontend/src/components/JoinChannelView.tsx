import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

interface JoinActor {
  create_channel(code: string): Promise<boolean>;
}

interface JoinChannelViewProps {
  actor: JoinActor | null;
  incomingCode: string;
  onConnect: (code: string) => void;
  onReject: () => void;
}

function maskCode(raw: string): string {
  return raw.replace(/(\S+)\s([\d]+)-([\d]+)-([\d]+)/, (_, cc, a, _b, c) => {
    return `${cc} ${"*".repeat(a.length)}-${"*".repeat(3)}-${c}`;
  });
}

export default function JoinChannelView({
  actor,
  incomingCode,
  onConnect,
  onReject,
}: JoinChannelViewProps) {
  const [connecting, setConnecting] = useState(false);

  async function handleConnect() {
    if (connecting || !actor) return;
    setConnecting(true);
    try {
      await actor.create_channel(incomingCode);
    } catch {
      // ignore
    }
    onConnect(incomingCode);
  }

  function handleReject() {
    window.history.replaceState({}, "", "/");
    onReject();
  }

  const masked = maskCode(incomingCode);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: "oklch(0.04 0.015 222 / 0.98)",
        backdropFilter: "blur(20px)",
      }}
      data-ocid="join_channel.modal"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(0.35 0.100 207 / 0.12) 0%, oklch(0.20 0.060 230 / 0.06) 50%, transparent 70%)",
        }}
      />

      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 320,
          height: 320,
          border: "1px solid oklch(0.85 0.115 207 / 0.08)",
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.1, 0.4] }}
        transition={{
          duration: 4,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 220,
          height: 220,
          border: "1px solid oklch(0.85 0.115 207 / 0.12)",
        }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.6, 0.2, 0.6] }}
        transition={{
          duration: 3,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
          delay: 0.5,
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 px-8 text-center max-w-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          style={{
            fontSize: "2.5rem",
            color: "oklch(0.85 0.115 207)",
            textShadow: "0 0 30px oklch(0.85 0.115 207 / 0.6)",
          }}
        >
          \u25c8
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4 }}
          className="font-cinzel tracking-[0.18em]"
          style={{
            fontSize: "clamp(1rem, 3vw, 1.25rem)",
            color: "oklch(0.90 0.018 220)",
            textShadow: "0 0 20px oklch(0.85 0.115 207 / 0.2)",
          }}
        >
          Bir frekans seni ar\u0131yor.
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.7 }}
          className="font-mono tracking-[0.22em]"
          style={{
            fontSize: "0.8rem",
            color: "oklch(0.65 0.060 207 / 0.5)",
            letterSpacing: "0.22em",
          }}
        >
          \u25c8 {masked}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.9 }}
          className="font-cinzel tracking-widest"
          style={{
            fontSize: "0.65rem",
            color: "oklch(0.50 0.020 220 / 0.7)",
            lineHeight: 1.8,
          }}
        >
          Bu kanal 10 dakika a\u00e7\u0131k kal\u0131r.
          <br />
          Mesajlar 10 saniyede yok olur.
          <br />
          Hi\u00e7bir iz kalmaz.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.1 }}
          className="flex items-center gap-5"
        >
          <button
            type="button"
            onClick={handleConnect}
            disabled={connecting || !actor}
            className="font-cinzel text-xs tracking-[0.2em] px-6 py-3 rounded-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "oklch(0.16 0.040 207 / 0.8)",
              border: "1px solid oklch(0.85 0.115 207 / 0.35)",
              color: "oklch(0.85 0.115 207)",
              boxShadow: "0 0 20px oklch(0.85 0.115 207 / 0.12)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow =
                "0 0 30px oklch(0.85 0.115 207 / 0.25)";
              e.currentTarget.style.borderColor = "oklch(0.85 0.115 207 / 0.6)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow =
                "0 0 20px oklch(0.85 0.115 207 / 0.12)";
              e.currentTarget.style.borderColor =
                "oklch(0.85 0.115 207 / 0.35)";
            }}
            data-ocid="join_channel.confirm_button"
          >
            <AnimatePresence mode="wait">
              {connecting ? (
                <motion.span
                  key="conn"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{
                    duration: 0.8,
                    repeat: Number.POSITIVE_INFINITY,
                  }}
                >
                  ba\u011flan\u0131yor\u00b7\u00b7\u00b7
                </motion.span>
              ) : (
                <motion.span
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  \u25c8 ba\u011flan
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <button
            type="button"
            onClick={handleReject}
            className="font-cinzel text-xs tracking-[0.2em] px-6 py-3 rounded-xl transition-all duration-300"
            style={{
              background: "transparent",
              border: "1px solid oklch(0.28 0.020 222 / 0.5)",
              color: "oklch(0.50 0.015 220 / 0.7)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "oklch(0.50 0.020 222 / 0.7)";
              e.currentTarget.style.color = "oklch(0.70 0.015 220)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "oklch(0.28 0.020 222 / 0.5)";
              e.currentTarget.style.color = "oklch(0.50 0.015 220 / 0.7)";
            }}
            data-ocid="join_channel.cancel_button"
          >
            \u2715 reddet
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
