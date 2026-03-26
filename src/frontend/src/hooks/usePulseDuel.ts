import { useEffect, useState } from "react";

export function usePulseDuel() {
  const [phase, setPhase] = useState<"idle" | "clash" | "result">("idle");

  useEffect(() => {
    const delay = 15000 + Math.random() * 5000;
    const t1 = setTimeout(() => {
      setPhase("clash");
      const t2 = setTimeout(() => {
        setPhase("result");
        const t3 = setTimeout(() => {
          setPhase("idle");
        }, 5000);
        return () => clearTimeout(t3);
      }, 2500);
      return () => clearTimeout(t2);
    }, delay);
    return () => clearTimeout(t1);
  }, []);

  return { phase };
}
