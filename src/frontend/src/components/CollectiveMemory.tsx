import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import type { HistoryEntry } from "../App";

interface CollectiveMemoryProps {
  history: HistoryEntry[];
}

function buildPoem(history: HistoryEntry[]): string[] {
  const last5 = history.slice(-5);
  const allWords = last5.flatMap((entry) => {
    const text = `${entry.pulse} ${entry.experience.world ?? ""} ${entry.experience.dialogue.join(" ")}`;
    return text
      .split(/\s+/)
      .map((w) =>
        w.replace(/[^\w\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF]/g, ""),
      )
      .filter((w) => w.length > 3);
  });

  if (allWords.length < 6) return [];

  const pick = (offset: number) => allWords[offset % allWords.length] ?? "";
  const w = [pick(1), pick(4), pick(7), pick(10), pick(13), pick(16)];

  return [
    `${w[0]} ve ${w[1]}`,
    `${w[2]} aras\u0131nda bir ses`,
    `${w[3]} \u2014 kayboldu`,
  ];
}

export default function CollectiveMemory({ history }: CollectiveMemoryProps) {
  const poem = useMemo(() => buildPoem(history), [history]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="max-w-4xl w-full mx-auto px-6 mt-12 mb-4"
      data-ocid="collective_memory.section"
    >
      <div className="glass-card rounded-2xl p-7 text-center">
        <div
          className="font-cinzel text-xs tracking-[0.35em] mb-5"
          style={{ color: "oklch(0.85 0.115 207 / 0.5)" }}
        >
          \u25c8 KOLEKT\u0130F BELLEK \u25c8
        </div>
        <AnimatePresence mode="wait">
          {poem.length === 0 ? (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-cinzel text-xs tracking-wider italic"
              style={{ color: "oklch(0.72 0.030 220 / 0.4)" }}
              data-ocid="collective_memory.empty_state"
            >
              Alan sessiz. Hen\u00fcz hi\u00e7bir bellek olu\u015fmad\u0131.
            </motion.p>
          ) : (
            <motion.div
              key={poem.join("-")}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
              className="space-y-2"
            >
              {poem.map((line, i) => (
                <motion.p
                  key={`poem-line-${line.slice(0, 8)}`}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -10 : 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.2, duration: 0.6 }}
                  className="italic text-sm leading-relaxed"
                  style={{ color: "oklch(0.82 0.030 220 / 0.7)" }}
                >
                  {line}
                </motion.p>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
