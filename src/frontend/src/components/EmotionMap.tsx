import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { HistoryEntry } from "../App";

function hashPulse(text: string): { x: number; y: number } {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h) ^ text.charCodeAt(i);
    h = h | 0;
  }
  const x = (Math.abs(h) % 72) + 10;
  const y = (Math.abs(h >> 7) % 68) + 10;
  return { x, y };
}

const GHOST_DOTS = [
  { x: 18, y: 22 },
  { x: 65, y: 15 },
  { x: 42, y: 58 },
  { x: 78, y: 45 },
  { x: 28, y: 72 },
  { x: 55, y: 80 },
  { x: 88, y: 30 },
  { x: 12, y: 50 },
];

function handleMapBtnEnter(e: React.MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.color = "oklch(0.85 0.115 207)";
}
function handleMapBtnLeave(e: React.MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.color = "oklch(0.72 0.030 220)";
}
function handleCloseBtnEnter(e: React.MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.color = "oklch(0.85 0.115 207)";
}
function handleCloseBtnLeave(e: React.MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.color = "oklch(0.72 0.030 220)";
}

interface EmotionMapProps {
  history: HistoryEntry[];
  currentPulse: string;
}

export default function EmotionMap({ history, currentPulse }: EmotionMapProps) {
  const [open, setOpen] = useState(false);
  const [tooltip, setTooltip] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-cinzel text-xs tracking-[0.2em] transition-all duration-200"
        style={{ color: "oklch(0.72 0.030 220)" }}
        onMouseEnter={handleMapBtnEnter}
        onMouseLeave={handleMapBtnLeave}
        data-ocid="map.open_modal_button"
      >
        ◎ MAP
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "oklch(0.07 0.018 222 / 0.97)" }}
            data-ocid="map.modal"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-6 right-6 flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200"
              style={{
                background: "oklch(0.15 0.025 222 / 0.8)",
                border: "1px solid oklch(0.32 0.040 222)",
                color: "oklch(0.72 0.030 220)",
              }}
              onMouseEnter={handleCloseBtnEnter}
              onMouseLeave={handleCloseBtnLeave}
              aria-label="Close map"
              data-ocid="map.close_button"
            >
              <X size={16} />
            </button>

            {/* Title */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2">
              <span
                className="font-cinzel text-xs tracking-[0.35em]"
                style={{ color: "oklch(0.85 0.115 207 / 0.5)" }}
              >
                ◈ RESONANCE MAP ◈
              </span>
            </div>

            {/* Map area */}
            <div className="relative w-full h-full">
              {/* Grid lines */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                aria-hidden="true"
              >
                {[25, 50, 75].map((pct) => (
                  <g key={`grid-${pct}`}>
                    <line
                      x1={`${pct}%`}
                      y1="0"
                      x2={`${pct}%`}
                      y2="100%"
                      stroke="oklch(0.85 0.115 207 / 0.04)"
                      strokeWidth="1"
                    />
                    <line
                      x1="0"
                      y1={`${pct}%`}
                      x2="100%"
                      y2={`${pct}%`}
                      stroke="oklch(0.85 0.115 207 / 0.04)"
                      strokeWidth="1"
                    />
                  </g>
                ))}
              </svg>

              {/* Ghost dots */}
              {GHOST_DOTS.map((dot) => (
                <div
                  key={`ghost-${dot.x}-${dot.y}`}
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    left: `${dot.x}%`,
                    top: `${dot.y}%`,
                    width: 6,
                    height: 6,
                    transform: "translate(-50%, -50%)",
                    background: "oklch(0.85 0.115 207 / 0.15)",
                    boxShadow: "0 0 8px oklch(0.85 0.115 207 / 0.10)",
                  }}
                />
              ))}

              {/* User pulse dots */}
              {history.map((entry, i) => {
                const pos = hashPulse(entry.pulse);
                const isCurrent = entry.pulse === currentPulse;
                return (
                  <motion.div
                    key={`dot-${entry.pulse.slice(0, 12)}`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: i * 0.08 }}
                    className="absolute rounded-full cursor-pointer"
                    style={{
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      width: isCurrent ? 14 : 9,
                      height: isCurrent ? 14 : 9,
                      transform: "translate(-50%, -50%)",
                      background: isCurrent
                        ? "oklch(0.85 0.115 207)"
                        : "oklch(0.85 0.115 207 / 0.55)",
                      boxShadow: isCurrent
                        ? "0 0 20px oklch(0.85 0.115 207 / 0.8), 0 0 40px oklch(0.85 0.115 207 / 0.4)"
                        : "0 0 10px oklch(0.85 0.115 207 / 0.4)",
                      animation: isCurrent
                        ? "dot-pulse 2.5s ease-in-out infinite"
                        : undefined,
                    }}
                    onMouseEnter={() =>
                      setTooltip({
                        text: entry.pulse.slice(0, 20),
                        x: pos.x,
                        y: pos.y,
                      })
                    }
                    onMouseLeave={() => setTooltip(null)}
                    data-ocid={`map.dot.item.${i + 1}`}
                  />
                );
              })}

              {/* Tooltip */}
              {tooltip && (
                <div
                  className="absolute pointer-events-none z-10 glass-card rounded-lg px-3 py-2"
                  style={{
                    left: `${Math.min(tooltip.x + 3, 80)}%`,
                    top: `${Math.max(tooltip.y - 8, 5)}%`,
                    transform: "translateY(-100%)",
                    background: "oklch(0.12 0.022 222 / 0.95)",
                    borderColor: "oklch(0.85 0.115 207 / 0.3)",
                  }}
                >
                  <span
                    className="text-xs font-cinzel tracking-wider"
                    style={{ color: "oklch(0.85 0.115 207 / 0.9)" }}
                  >
                    {tooltip.text}
                    {tooltip.text.length === 20 ? "…" : ""}
                  </span>
                </div>
              )}

              {/* Legend */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: "oklch(0.85 0.115 207 / 0.55)",
                      boxShadow: "0 0 8px oklch(0.85 0.115 207 / 0.3)",
                    }}
                  />
                  <span
                    className="font-cinzel text-xs tracking-wider"
                    style={{ color: "oklch(0.72 0.030 220 / 0.6)" }}
                  >
                    YOUR PULSES
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: "oklch(0.85 0.115 207 / 0.15)" }}
                  />
                  <span
                    className="font-cinzel text-xs tracking-wider"
                    style={{ color: "oklch(0.72 0.030 220 / 0.6)" }}
                  >
                    OTHERS NEARBY
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
