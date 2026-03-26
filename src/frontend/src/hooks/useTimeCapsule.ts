import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "echo_capsules";

export interface Capsule {
  id: string;
  pulse: string;
  lockedAt: number;
  unlockAt: number;
}

function loadCapsules(): Capsule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Capsule[]) : [];
  } catch {
    return [];
  }
}

function saveCapsules(capsules: Capsule[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(capsules));
}

export function useTimeCapsuleLock(pulse: string) {
  const [locked, setLocked] = useState(false);

  const lock = useCallback(
    (durationMs: number) => {
      const capsules = loadCapsules();
      const now = Date.now();
      const id = crypto.randomUUID ? crypto.randomUUID() : now.toString();
      capsules.push({ id, pulse, lockedAt: now, unlockAt: now + durationMs });
      saveCapsules(capsules);
      setLocked(true);
      setTimeout(() => setLocked(false), 3000);
    },
    [pulse],
  );

  return { locked, lock };
}

export function useTimeCapsuleReveal() {
  const [revealed, setRevealed] = useState<Capsule | null>(null);

  useEffect(() => {
    const capsules = loadCapsules();
    const now = Date.now();
    const expired = capsules.filter((c) => c.unlockAt <= now);
    const remaining = capsules.filter((c) => c.unlockAt > now);

    if (expired.length > 0) {
      saveCapsules(remaining);
      setRevealed(expired[0]);
    }
  }, []);

  const dismiss = useCallback(() => setRevealed(null), []);

  return { revealed, dismiss };
}
