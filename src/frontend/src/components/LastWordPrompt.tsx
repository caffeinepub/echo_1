import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useLastWord } from "../hooks/useLastWord";

export default function LastWordPrompt() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);
  const [hidden, setHidden] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { saveLastWord } = useLastWord();

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60000);
    return () => clearTimeout(t);
  }, []);

  const handleExpand = () => {
    setExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  const handleSave = () => {
    if (!value.trim()) return;
    saveLastWord(value.trim());
    setSaved(true);
    setTimeout(() => setHidden(true), 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSave();
  };

  const handleBlur = () => {
    if (value.trim()) handleSave();
  };

  if (hidden) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.8 }}
          className="flex items-center justify-center gap-3"
        >
          {!expanded && !saved && (
            <button
              type="button"
              onClick={handleExpand}
              className="font-cinzel tracking-widest transition-opacity duration-300"
              style={{
                fontSize: "0.65rem",
                color: "oklch(0.55 0.020 220 / 0.5)",
                background: "none",
                border: "none",
                cursor: "pointer",
                opacity: 0.4,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.opacity = "0.7";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.opacity = "0.4";
              }}
              data-ocid="lastword.open_modal_button"
            >
              ◇ ayrılmadan önce bir kelime bırakabilirsin
            </button>
          )}

          {expanded && !saved && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                maxLength={30}
                placeholder="son kelimen…"
                className="bg-transparent outline-none"
                style={{
                  fontFamily: "var(--font-cinzel, serif)",
                  fontSize: "0.65rem",
                  color: "oklch(0.72 0.030 220 / 0.7)",
                  borderBottom: "1px solid oklch(0.35 0.030 222 / 0.4)",
                  paddingBottom: "2px",
                  width: "140px",
                  letterSpacing: "0.06em",
                }}
                data-ocid="lastword.input"
              />
            </motion.div>
          )}

          {saved && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="font-cinzel tracking-widest"
              style={{ fontSize: "0.65rem", color: "oklch(0.72 0.030 220)" }}
            >
              bırakıldı.
            </motion.span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
