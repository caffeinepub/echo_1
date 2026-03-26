import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface ShadowRevealProps {
  message: string;
  onDismiss: () => void;
}

const DURATION = 10;

export default function ShadowReveal({
  message,
  onDismiss,
}: ShadowRevealProps) {
  const [phase, setPhase] = useState<"intro" | "reveal">("intro");
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const revealedRef = useRef(false);

  // Phase transition: after 1.5s show the actual message
  useEffect(() => {
    const t = setTimeout(() => {
      setPhase("reveal");
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  // Countdown after reveal
  useEffect(() => {
    if (phase !== "reveal") return;
    if (revealedRef.current) return;
    revealedRef.current = true;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="fixed inset-0 z-[100] flex items-center justify-center cursor-pointer"
      style={{
        background: "oklch(0.04 0.015 222 / 0.97)",
        backdropFilter: "blur(12px)",
      }}
      onClick={onDismiss}
      data-ocid="shadow.modal"
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(0.45 0.10 207 / 0.08) 0%, transparent 60%)",
        }}
      />

      <div className="relative max-w-lg w-full mx-6 text-center">
        {/* Intro line */}
        <motion.p
          initial={{ opacity: 0, letterSpacing: "0.5em" }}
          animate={{ opacity: 1, letterSpacing: "0.3em" }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="font-cinzel text-xs mb-10"
          style={{ color: "oklch(0.72 0.030 220 / 0.7)" }}
        >
          BİRİNİN SANA BIRAKTIĞI BİR ŞEY VAR.
        </motion.p>

        {/* Message reveal */}
        <AnimatePresence>
          {phase === "reveal" && (
            <motion.div
              initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="mb-10"
            >
              <p
                className="text-xl md:text-2xl leading-relaxed italic"
                style={{
                  color: "oklch(0.93 0.018 220)",
                  textShadow:
                    "0 0 30px oklch(0.85 0.115 207 / 0.4), 0 0 60px oklch(0.85 0.115 207 / 0.15)",
                  fontWeight: 300,
                  letterSpacing: "0.03em",
                }}
              >
                &ldquo;{message}&rdquo;
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Countdown bar */}
        <AnimatePresence>
          {phase === "reveal" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-6"
            >
              <div
                className="h-px w-full rounded-full overflow-hidden"
                style={{ background: "oklch(0.25 0.030 222)" }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, oklch(0.85 0.115 207 / 0.8), oklch(0.65 0.085 210 / 0.4))",
                    boxShadow: "0 0 8px oklch(0.85 0.115 207 / 0.5)",
                  }}
                  initial={{ width: "100%" }}
                  animate={{ width: `${(timeLeft / DURATION) * 100}%` }}
                  transition={{ duration: 1, ease: "linear" }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fade label */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "reveal" ? 1 : 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="font-cinzel text-xs tracking-[0.25em]"
          style={{ color: "oklch(0.55 0.020 220 / 0.5)" }}
        >
          BU AN GEÇİP GİDECEK.
        </motion.p>

        {/* Dismiss hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ duration: 1, delay: 2 }}
          className="absolute -bottom-10 left-0 right-0 text-xs"
          style={{ color: "oklch(0.55 0.020 220)" }}
        >
          dokunarak geç
        </motion.p>
      </div>
    </motion.div>
  );
}
