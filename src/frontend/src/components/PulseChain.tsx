import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { HistoryEntry } from "../App";

interface PulseChainProps {
  history: HistoryEntry[];
  currentPulse: string;
}

export default function PulseChain({ history, currentPulse }: PulseChainProps) {
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);

  if (history.length < 2) return null;

  return (
    <div className="relative z-10 px-6 py-6" data-ocid="pulsechain.section">
      <div
        className="font-cinzel text-xs tracking-[0.3em] text-center mb-5"
        style={{ color: "oklch(0.85 0.115 207 / 0.4)" }}
      >
        ◈ JOURNEY ◈
      </div>
      <div className="flex items-center justify-center gap-0 overflow-x-auto pb-2">
        {history.map((entry, i) => {
          const isCurrent = entry.pulse === currentPulse;
          return (
            <div
              key={`chain-${entry.pulse.slice(0, 12)}`}
              className="flex items-center"
            >
              {i > 0 && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="origin-left"
                  style={{
                    width: 32,
                    height: 1,
                    background: "oklch(0.85 0.115 207 / 0.3)",
                    flexShrink: 0,
                  }}
                />
              )}
              <div className="relative">
                <motion.button
                  type="button"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.4, delay: i * 0.1, type: "spring" }}
                  onClick={() =>
                    setActiveTooltip(activeTooltip === i ? null : i)
                  }
                  className="relative rounded-full transition-all duration-300 focus:outline-none"
                  style={{
                    width: isCurrent ? 18 : 12,
                    height: isCurrent ? 18 : 12,
                    background: isCurrent
                      ? "oklch(0.85 0.115 207)"
                      : "oklch(0.85 0.115 207 / 0.6)",
                    boxShadow: isCurrent
                      ? "0 0 16px oklch(0.85 0.115 207 / 0.7), 0 0 32px oklch(0.85 0.115 207 / 0.3)"
                      : "0 0 8px oklch(0.85 0.115 207 / 0.3)",
                    flexShrink: 0,
                    animation: isCurrent
                      ? "dot-pulse 2.5s ease-in-out infinite"
                      : undefined,
                  }}
                  aria-label={`Pulse ${i + 1}: ${entry.pulse.slice(0, 20)}`}
                  data-ocid={`pulsechain.item.${i + 1}`}
                />
                <AnimatePresence>
                  {activeTooltip === i && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.2 }}
                      className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 glass-card rounded-lg px-3 py-2 whitespace-nowrap z-20 pointer-events-none"
                      style={{
                        background: "oklch(0.12 0.022 222 / 0.95)",
                        borderColor: "oklch(0.85 0.115 207 / 0.3)",
                        boxShadow: "0 4px 20px oklch(0.05 0.015 222 / 0.8)",
                      }}
                      data-ocid={`pulsechain.tooltip.${i + 1}`}
                    >
                      <p
                        className="text-xs italic"
                        style={{ color: "oklch(0.90 0.018 220)" }}
                      >
                        {entry.experience.world.slice(0, 40)}
                        {entry.experience.world.length > 40 ? "…" : ""}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
