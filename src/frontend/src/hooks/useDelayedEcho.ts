import { useEffect, useRef, useState } from "react";
import type { ParsedExperience } from "../App";
import { useActor } from "./useActor";

export function useDelayedEcho(
  pulse: string,
  experience: ParsedExperience | null,
) {
  const { actor, isFetching } = useActor();
  const [echoLine, setEchoLine] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const shownRef = useRef(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep pulse in a ref so the timeout callback always uses the latest value
  // without needing it as an effect dependency
  const pulseRef = useRef(pulse);
  pulseRef.current = pulse;

  useEffect(() => {
    if (!actor || isFetching || !experience || shownRef.current) return;

    shownRef.current = false;
    setEchoLine(null);
    setIsVisible(false);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    const delay = 40000 + Math.random() * 35000; // 40–75 seconds

    const fetchTimer = setTimeout(async () => {
      if (shownRef.current) return;
      try {
        const raw = await actor.generate_experience(
          `echo: ${pulseRef.current} [GIVE ONLY ONE HAUNTING LINE, no structure tags, max 8 words, no explanation]`,
        );
        const line =
          raw
            .replace(/\[.*?\]/g, "")
            .split("\n")
            .map((l: string) => l.trim())
            .filter(Boolean)[0] ?? "";
        if (line && !shownRef.current) {
          shownRef.current = true;
          setEchoLine(line);
          setIsVisible(true);
          hideTimerRef.current = setTimeout(() => setIsVisible(false), 6000);
        }
      } catch {
        /* silent */
      }
    }, delay);

    return () => {
      clearTimeout(fetchTimer);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [actor, isFetching, experience]);

  return { echoLine, isVisible };
}
