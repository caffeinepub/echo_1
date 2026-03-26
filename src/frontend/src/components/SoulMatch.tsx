import { motion } from "motion/react";

export default function SoulMatch() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2 }}
      className="fixed inset-0 z-40 flex flex-col items-center justify-center pointer-events-none"
      style={{ background: "oklch(0 0 0 / 0.9)" }}
    >
      <motion.p
        animate={{ scale: [1, 1.03, 1] }}
        transition={{
          duration: 3,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        className="font-cinzel italic text-center"
        style={{
          color: "oklch(0.85 0.115 207)",
          fontSize: "clamp(1.5rem, 5vw, 2.2rem)",
          textShadow: "0 0 40px oklch(0.85 0.115 207 / 0.4)",
          letterSpacing: "0.06em",
        }}
      >
        Bir ses sana yakın.
      </motion.p>
      <p
        className="mt-4 font-cinzel tracking-widest"
        style={{
          color: "oklch(0.45 0.020 220 / 0.5)",
          fontSize: "0.65rem",
        }}
      >
        kimse değil. sadece bir frekans.
      </p>
    </motion.div>
  );
}
