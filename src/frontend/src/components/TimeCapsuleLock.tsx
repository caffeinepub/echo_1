import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useTimeCapsuleLock } from "../hooks/useTimeCapsule";

const OPTIONS = [
  { label: "24 saat", ms: 24 * 60 * 60 * 1000 },
  { label: "7 gün", ms: 7 * 24 * 60 * 60 * 1000 },
  { label: "30 gün", ms: 30 * 24 * 60 * 60 * 1000 },
];

interface Props {
  pulse: string;
}

export default function TimeCapsuleLock({ pulse }: Props) {
  const [open, setOpen] = useState(false);
  const { locked, lock } = useTimeCapsuleLock(pulse);

  const handleSelect = (ms: number) => {
    lock(ms);
    setOpen(false);
  };

  return (
    <div className="text-center" data-ocid="time_capsule.section">
      <AnimatePresence mode="wait">
        {locked ? (
          <motion.span
            key="confirmation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="font-cinzel tracking-widest"
            style={{ fontSize: "0.6rem", color: "oklch(0.72 0.030 220)" }}
          >
            zaman kapsülü kapatıldı.
          </motion.span>
        ) : (
          <motion.div
            key="controls"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <button
              type="button"
              onClick={() => setOpen((p) => !p)}
              className="font-cinzel tracking-widest transition-all duration-300"
              style={{
                fontSize: "0.6rem",
                color: open
                  ? "oklch(0.72 0.030 220 / 0.7)"
                  : "oklch(0.45 0.020 222 / 0.4)",
                background: "none",
                border: "none",
                cursor: "pointer",
                letterSpacing: "0.22em",
              }}
              data-ocid="time_capsule.open_modal_button"
            >
              ◌ kapsüle kilitle
            </button>

            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.35 }}
                  className="mt-3 inline-flex gap-3"
                >
                  {OPTIONS.map((opt) => (
                    <button
                      type="button"
                      key={opt.label}
                      onClick={() => handleSelect(opt.ms)}
                      className="font-cinzel tracking-widest glass-card rounded-xl px-3 py-2 transition-all duration-300"
                      style={{
                        fontSize: "0.55rem",
                        color: "oklch(0.85 0.115 207 / 0.7)",
                        borderColor: "oklch(0.28 0.038 222 / 0.5)",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor =
                          "oklch(0.85 0.115 207 / 0.4)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor =
                          "oklch(0.28 0.038 222 / 0.5)";
                      }}
                      data-ocid={`time_capsule.${opt.label.replace(" ", "_")}.button`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
