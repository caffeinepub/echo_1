import { useEffect, useState } from "react";

const DEAD_MESSAGES = [
  "başka bir boyuttan bir şey geçti.",
  "frekans kırıldı. yeniden başlamaya çalışıyor.",
  "bu saatte kimler dinliyor?",
  "sinyal öteden geliyor.",
  "03:17 — hiçbir şey kaybolmaz. sadece form değiştirir.",
  "uyuyanlar görmez. ama sen uyanıksın.",
  "transmission interrupted. source: unknown.",
  "bir ses. bir kez. tekrarlanmayacak.",
  "burası artık güvenli değil.",
  "something passed through the static just now.",
];

function isDeadHour() {
  const h = new Date().getHours();
  return h === 3;
}

export function useDeadChannel() {
  const [isDeadChannel, setIsDeadChannel] = useState(isDeadHour);
  const [msgIndex, setMsgIndex] = useState(0);

  // Re-check every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setIsDeadChannel(isDeadHour());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Cycle messages every 15-20s — re-trigger on msgIndex change
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — re-schedule after each message change
  useEffect(() => {
    if (!isDeadChannel) return;
    const cycle = () => {
      setMsgIndex((prev) => (prev + 1) % DEAD_MESSAGES.length);
    };
    const delay = 15000 + Math.random() * 5000;
    const t = setTimeout(cycle, delay);
    return () => clearTimeout(t);
  }, [isDeadChannel, msgIndex]);

  return {
    isDeadChannel,
    deadMessage: DEAD_MESSAGES[msgIndex],
  };
}
