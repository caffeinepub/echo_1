import { AnimatePresence, motion } from "motion/react";
import { usePulseDuel } from "../hooks/usePulseDuel";

export default function PulseDuel() {
  const { phase } = usePulseDuel();

  return (
    <AnimatePresence>
      {phase !== "idle" && (
        <motion.div
          initial={{ opacity: 0, x: -20, y: 10 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="fixed bottom-24 left-6 z-20 pointer-events-none"
        >
          <div
            className="font-cinzel tracking-widest"
            style={{
              fontSize: "0.6rem",
              color: "oklch(0.72 0.030 220 / 0.6)",
              letterSpacing: "0.18em",
            }}
          >
            {phase === "clash" ? (
              <span>iki ses çarpıştı —</span>
            ) : (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  color: "oklch(0.85 0.115 207 / 0.8)",
                  textShadow: "0 0 12px oklch(0.85 0.115 207 / 0.4)",
                }}
              >
                senin yankın daha derin
              </motion.span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
