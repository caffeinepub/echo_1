import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

interface SilenceMomentProps {
  isSilent: boolean;
}

export default function SilenceMoment({ isSilent }: SilenceMomentProps) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (isSilent) {
      setShown(true);
      const timer = setTimeout(() => setShown(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [isSilent]);

  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2, ease: "easeInOut" }}
          className="fixed inset-0 flex flex-col items-center justify-center z-50 pointer-events-none"
          aria-hidden="true"
        >
          <p
            className="font-cinzel text-lg tracking-[0.2em] italic"
            style={{ color: "oklch(0.85 0.115 207 / 0.6)" }}
          >
            Hâlâ orada mısın?
          </p>
          <p
            className="mt-3 font-cinzel text-xs tracking-[0.3em] italic"
            style={{ color: "oklch(0.72 0.030 220 / 0.4)" }}
          >
            bir ses, boşluktan
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
