import { useEffect, useRef, useState } from "react";

export function useSoulMatch(experienceCount: number) {
  const [isSoulMatch, setIsSoulMatch] = useState(false);
  const lastTriggerRef = useRef(-1);

  useEffect(() => {
    if (experienceCount === 0) return;
    if (lastTriggerRef.current === experienceCount) return;
    lastTriggerRef.current = experienceCount;

    // 20% chance
    if (Math.random() > 0.2) return;

    const delay = 8000 + Math.random() * 4000;
    const t = setTimeout(() => {
      setIsSoulMatch(true);
      setTimeout(() => setIsSoulMatch(false), 6000);
    }, delay);

    return () => clearTimeout(t);
  }, [experienceCount]);

  return { isSoulMatch };
}
