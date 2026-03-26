import { useMemo } from "react";

const WAVE_CONFIGS = [
  { amp: 14, freq: 2.5, phase: 0, opacity: 0.18, duration: 5.2 },
  { amp: 9, freq: 3.1, phase: 1.2, opacity: 0.12, duration: 6.8 },
  { amp: 18, freq: 1.8, phase: 2.4, opacity: 0.1, duration: 4.5 },
  { amp: 6, freq: 4.0, phase: 0.7, opacity: 0.08, duration: 7.3 },
];

const W = 2400;
const H = 60;

function wavePath(amp: number, freq: number, phase: number): string {
  let d = `M 0 ${H / 2}`;
  for (let x = 1; x <= W; x += 4) {
    const y = H / 2 + amp * Math.sin((x / W) * Math.PI * 2 * freq * 2 + phase);
    d += ` L ${x} ${y}`;
  }
  return d;
}

export default function CollectiveWave() {
  const paths = useMemo(
    () =>
      WAVE_CONFIGS.map((cfg) => ({
        ...cfg,
        d: wavePath(cfg.amp, cfg.freq, cfg.phase),
      })),
    [],
  );

  return (
    <div
      className="relative w-full overflow-hidden pointer-events-none"
      style={{ height: H, marginBottom: "-1px" }}
      aria-hidden="true"
    >
      {paths.map((wave) => (
        <div
          key={`wave-${wave.phase}`}
          className="absolute inset-0"
          style={{
            animation: `wave-flow ${wave.duration}s linear infinite`,
            animationDelay: `${-wave.phase * 0.5}s`,
          }}
        >
          <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            style={{ width: "200%", height: "100%" }}
            aria-hidden="true"
          >
            <path
              d={wave.d}
              fill="none"
              stroke="oklch(0.85 0.115 207)"
              strokeWidth={1.2}
              opacity={wave.opacity}
            />
          </svg>
        </div>
      ))}
    </div>
  );
}
