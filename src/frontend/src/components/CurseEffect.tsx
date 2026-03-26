import { useEffect, useState } from "react";

interface CurseEffectProps {
  onDone?: () => void;
}

export default function CurseEffect({ onDone }: CurseEffectProps) {
  const [phase, setPhase] = useState<"active" | "done">("active");

  useEffect(() => {
    const t = setTimeout(() => {
      setPhase("done");
      onDone?.();
    }, 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  if (phase === "done") return null;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none overflow-hidden">
      {/* Screen shake is applied via CSS animation on a wrapper */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          animation: "curse-shake 0.15s infinite",
        }}
      >
        {/* Dark red flash */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "oklch(0.20 0.12 20 / 0.25)",
            animation: "curse-flash 2.5s ease-out forwards",
          }}
        />
        {/* Glitch line */}
        <div
          style={{
            position: "absolute",
            top: "45%",
            left: 0,
            width: "100%",
            height: "1.5px",
            background: "oklch(0.65 0.25 20)",
            boxShadow: "0 0 8px oklch(0.65 0.25 20)",
            animation: "curse-line 1.2s ease-in-out forwards",
            transformOrigin: "left",
          }}
        />
      </div>
      <style>{`
        @keyframes curse-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }
        @keyframes curse-flash {
          0% { opacity: 1; }
          60% { opacity: 0.3; }
          100% { opacity: 0; }
        }
        @keyframes curse-line {
          0% { transform: scaleX(0); opacity: 1; }
          60% { transform: scaleX(1); opacity: 1; }
          100% { transform: scaleX(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
