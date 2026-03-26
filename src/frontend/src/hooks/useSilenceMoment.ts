import { useCallback, useEffect, useRef, useState } from "react";

const EVENTS = ["keydown", "mousemove", "click", "touchstart"] as const;

export function useSilenceMoment() {
  const [isSilent, setIsSilent] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    setIsSilent(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIsSilent(true), 90000);
  }, []);

  useEffect(() => {
    for (const e of EVENTS) window.addEventListener(e, resetTimer);
    timerRef.current = setTimeout(() => setIsSilent(true), 90000);
    return () => {
      for (const e of EVENTS) window.removeEventListener(e, resetTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);

  return { isSilent };
}
