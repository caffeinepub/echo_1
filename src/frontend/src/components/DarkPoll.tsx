import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useDarkPoll } from "../hooks/useDarkPoll";

export default function DarkPoll() {
  const { question, answers, submitAnswer, collectiveEcho } = useDarkPoll();
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState(answers.length > 0);
  const [focused, setFocused] = useState(false);

  const handleSubmit = () => {
    if (!input.trim()) return;
    submitAnswer(input);
    setInput("");
    setSubmitted(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.9 }}
      className="mt-12 max-w-md mx-auto"
      data-ocid="dark_poll.section"
    >
      <div
        className="font-cinzel tracking-[0.3em] text-center mb-4"
        style={{ fontSize: "0.6rem", color: "oklch(0.55 0.030 222 / 0.6)" }}
      >
        ◈ karanlık anket ◈
      </div>

      <div
        className="glass-card rounded-2xl px-6 py-5"
        style={{ borderColor: "oklch(0.22 0.030 222 / 0.5)" }}
      >
        <p
          className="text-center mb-4 italic"
          style={{ fontSize: "0.8rem", color: "oklch(0.72 0.030 220 / 0.7)" }}
        >
          {question}
        </p>

        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="bir söz bırak…"
                className="flex-1 bg-transparent outline-none text-xs placeholder:italic"
                style={{
                  color: "oklch(0.88 0.015 220)",
                  borderBottom: `1px solid ${
                    focused
                      ? "oklch(0.85 0.115 207 / 0.3)"
                      : "oklch(0.28 0.030 222 / 0.4)"
                  }`,
                  transition: "border-color 0.3s",
                  paddingBottom: "4px",
                }}
                maxLength={80}
                data-ocid="dark_poll.input"
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!input.trim()}
                className="font-cinzel tracking-widest transition-all duration-300 disabled:opacity-30"
                style={{
                  fontSize: "0.55rem",
                  color: "oklch(0.85 0.115 207 / 0.7)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
                data-ocid="dark_poll.submit_button"
              >
                → gönder
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="submitted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <p
                style={{
                  fontSize: "0.65rem",
                  color: "oklch(0.55 0.020 222 / 0.6)",
                }}
              >
                {answers.length} ses birikti
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {collectiveEcho && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, delay: 0.4 }}
              className="mt-4 pt-3 text-center"
              style={{ borderTop: "1px solid oklch(0.22 0.030 222 / 0.3)" }}
            >
              <p
                className="italic"
                style={{
                  fontSize: "0.6rem",
                  color: "oklch(0.65 0.030 220 / 0.5)",
                  letterSpacing: "0.06em",
                }}
                data-ocid="dark_poll.collective_echo"
              >
                {collectiveEcho}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
