import { AnimatePresence, motion } from "motion/react";

interface DeadChannelProps {
  message: string;
}

export default function DeadChannel({ message }: DeadChannelProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "#000" }}
      aria-live="polite"
    >
      {/* Label */}
      <div
        className="absolute top-8 left-0 right-0 text-center font-cinzel tracking-[0.45em] uppercase"
        style={{
          fontSize: "0.55rem",
          color: "oklch(0.85 0.115 207 / 0.2)",
          letterSpacing: "0.45em",
        }}
      >
        ◈ DEAD CHANNEL ◈
      </div>

      {/* Cycling message */}
      <AnimatePresence mode="wait">
        <motion.p
          key={message}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
          className="font-cinzel text-center px-8"
          style={{
            color: "oklch(0.85 0.115 207)",
            fontSize: "clamp(0.85rem, 2.5vw, 1.1rem)",
            letterSpacing: "0.08em",
            maxWidth: "60ch",
          }}
        >
          {message}
        </motion.p>
      </AnimatePresence>

      {/* Static noise lines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, oklch(0.85 0.115 207 / 0.15) 2px, oklch(0.85 0.115 207 / 0.15) 4px)",
        }}
      />
    </motion.div>
  );
}
