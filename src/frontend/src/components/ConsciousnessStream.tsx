import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";

interface ConsciousnessStreamProps {
  keyEvents: { time: number; interval: number }[];
  visible: boolean;
}

const MAX_BARS = 40;
const CANVAS_H = 48;

export default function ConsciousnessStream({
  keyEvents,
  visible,
}: ConsciousnessStreamProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.offsetWidth;
    const h = CANVAS_H;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    const events = keyEvents.slice(-MAX_BARS);
    if (events.length === 0) return;

    // Normalize intervals: short interval = fast = short bar, long interval = pause = tall bar
    const maxInterval = Math.max(...events.map((e) => e.interval), 800);
    const barW = Math.floor(w / MAX_BARS) - 1;
    const startX = w - events.length * (barW + 1);

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      const norm = Math.min(ev.interval / maxInterval, 1);
      const barH = Math.max(4, norm * (h - 8));
      const x = startX + i * (barW + 1);
      const y = h - barH;

      // opacity fades for older bars
      const ageFade = 0.3 + 0.7 * ((i + 1) / events.length);

      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, 2);

      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      grad.addColorStop(
        0,
        `oklch(0.85 0.115 207 / ${(0.55 * ageFade).toFixed(2)})`,
      );
      grad.addColorStop(
        1,
        `oklch(0.60 0.090 207 / ${(0.15 * ageFade).toFixed(2)})`,
      );
      ctx.fillStyle = grad;
      ctx.fill();

      // glow on tall bars (pauses)
      if (norm > 0.5) {
        ctx.shadowColor = "oklch(0.85 0.115 207 / 0.5)";
        ctx.shadowBlur = 6 * norm;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }, [keyEvents]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scaleY: 0.6 }}
          animate={{ opacity: 1, scaleY: 1 }}
          exit={{ opacity: 0, scaleY: 0.6 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ transformOrigin: "bottom" }}
          className="relative w-full px-5 pb-2"
        >
          <canvas
            ref={canvasRef}
            className="w-full block"
            style={{ height: CANVAS_H, opacity: 0.85 }}
          />
          <span
            className="absolute bottom-3 right-5 font-mono"
            style={{
              fontSize: "0.5rem",
              letterSpacing: "0.18em",
              color: "oklch(0.55 0.040 207 / 0.45)",
            }}
          >
            \u25c8 bilin\u00e7 ak\u0131\u015f\u0131
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
