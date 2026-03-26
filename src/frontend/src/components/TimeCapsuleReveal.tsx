import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { useTimeCapsuleReveal } from "../hooks/useTimeCapsule";

export default function TimeCapsuleReveal() {
  const { revealed, dismiss } = useTimeCapsuleReveal();

  useEffect(() => {
    if (!revealed) return;
    const t = setTimeout(dismiss, 8000);
    return () => clearTimeout(t);
  }, [revealed, dismiss]);

  return (
    <AnimatePresence>
      {revealed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={dismiss}
          style={{ cursor: "pointer" }}
          data-ocid="time_capsule.modal"
        >
          <div
            className="max-w-sm mx-auto px-8 py-10 glass-card rounded-2xl text-center"
            style={{
              background: "oklch(0.07 0.018 225 / 0.95)",
              borderColor: "oklch(0.28 0.038 222 / 0.4)",
              boxShadow: "0 0 60px oklch(0.85 0.115 207 / 0.08)",
            }}
          >
            <div
              className="font-cinzel tracking-[0.3em] mb-5"
              style={{
                fontSize: "0.6rem",
                color: "oklch(0.55 0.030 222 / 0.6)",
              }}
            >
              ◈ geçmişten bir ses ulaştı ◈
            </div>
            <p
              className="italic leading-relaxed"
              style={{
                fontSize: "0.9rem",
                color: "oklch(0.72 0.030 220 / 0.65)",
                fontStyle: "italic",
              }}
            >
              {revealed.pulse}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
