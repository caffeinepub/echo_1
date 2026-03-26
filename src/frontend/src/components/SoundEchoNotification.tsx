import { Mic } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useSoundEchoNotification } from "../hooks/useSoundEcho";

const WAVE_BARS = [
  { h: 3, id: "w1" },
  { h: 7, id: "w2" },
  { h: 5, id: "w3" },
  { h: 9, id: "w4" },
  { h: 4, id: "w5" },
  { h: 8, id: "w6" },
  { h: 3, id: "w7" },
];

function Waveform() {
  return (
    <div className="flex items-center gap-[2px]" aria-hidden="true">
      {WAVE_BARS.map((bar, i) => (
        <motion.div
          key={bar.id}
          animate={{ scaleY: [1, 1.8, 0.6, 1.4, 1] }}
          transition={{
            duration: 1.2,
            repeat: Number.POSITIVE_INFINITY,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
          style={{
            width: 2,
            height: bar.h,
            borderRadius: 1,
            background: "oklch(0.85 0.115 207 / 0.6)",
            transformOrigin: "center",
          }}
        />
      ))}
    </div>
  );
}

export default function SoundEchoNotification() {
  const { visible } = useSoundEchoNotification();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          transition={{ duration: 0.8 }}
          className="fixed bottom-24 right-6 z-20 pointer-events-none flex items-center gap-2"
        >
          <Mic size={10} style={{ color: "oklch(0.85 0.115 207 / 0.5)" }} />
          <span
            className="font-cinzel tracking-widest"
            style={{
              fontSize: "0.6rem",
              color: "oklch(0.72 0.030 220 / 0.55)",
            }}
          >
            bir ses yank\u0131s\u0131 geldi
          </span>
          <Waveform />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
