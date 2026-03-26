import { motion } from "motion/react";

const RESONANCE_PHRASES = [
  "resonating…",
  "searching frequencies…",
  "scanning the field…",
  "listening for echoes…",
  "something stirs nearby…",
];

export default function LoadingView() {
  const phrase =
    RESONANCE_PHRASES[Math.floor(Math.random() * RESONANCE_PHRASES.length)];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen flex flex-col items-center justify-center"
      data-ocid="loading.loading_state"
    >
      {/* Ripple rings */}
      <div className="relative w-48 h-48 flex items-center justify-center">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="absolute rounded-full border"
            style={{
              width: "100%",
              height: "100%",
              borderColor: "oklch(0.85 0.115 207 / 0.4)",
              animation: `ripple-out 2.4s ease-out ${i * 0.6}s infinite`,
            }}
          />
        ))}
        {/* Center pulse dot */}
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
          className="relative z-10 w-6 h-6 rounded-full"
          style={{
            background: "oklch(0.85 0.115 207)",
            boxShadow:
              "0 0 20px oklch(0.85 0.115 207 / 0.8), 0 0 60px oklch(0.85 0.115 207 / 0.4)",
          }}
        />
      </div>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-10 font-cinzel text-sm tracking-[0.3em] animate-glow-pulse"
        style={{ color: "oklch(0.85 0.115 207)" }}
      >
        {phrase.toUpperCase()}
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="mt-4 text-xs tracking-widest"
        style={{ color: "oklch(0.72 0.030 220 / 0.5)" }}
      >
        ANONYMOUS · UNTRACEABLE · REAL
      </motion.p>
    </motion.div>
  );
}
