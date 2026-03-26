import { AnimatePresence, motion } from "motion/react";

interface DelayedEchoProps {
  echoLine: string | null;
  isVisible: boolean;
}

export default function DelayedEcho({ echoLine, isVisible }: DelayedEchoProps) {
  return (
    <AnimatePresence>
      {isVisible && echoLine && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          data-ocid="echo.toast"
        >
          <div
            className="glass-card rounded-2xl px-7 py-5 text-center max-w-sm"
            style={{
              background: "oklch(0.10 0.022 222 / 0.92)",
              borderColor: "oklch(0.85 0.115 207 / 0.25)",
              boxShadow:
                "0 0 40px oklch(0.85 0.115 207 / 0.12), 0 8px 32px oklch(0.05 0.015 222 / 0.8)",
            }}
          >
            <div
              className="font-cinzel text-xs tracking-[0.3em] mb-3"
              style={{ color: "oklch(0.85 0.115 207 / 0.6)" }}
            >
              ◈ ECHO RECEIVED ◈
            </div>
            <p
              className="text-sm leading-relaxed"
              style={{
                color: "oklch(0.90 0.018 220)",
                fontStyle: "italic",
                textShadow: "0 0 16px oklch(0.85 0.115 207 / 0.2)",
              }}
            >
              {echoLine}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
