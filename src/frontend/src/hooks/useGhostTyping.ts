import { useEffect, useRef, useState } from "react";

const GHOST_PHRASES = [
  "hâlâ buradayım",
  "kaybolmak istemiyorum",
  "sen de hissediyor musun",
  "ses kesildi",
  "belki başka bir zaman",
  "gitmek zorunda değilsin",
  "bu da geçecek",
  "neredeydin",
  "bir an için",
  "yanında olmak istedim",
  "still here",
  "don't go",
];

export function useGhostTyping(isTyping: boolean) {
  const [ghostText, setGhostText] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const activeRef = useRef(false);
  const phraseIndexRef = useRef(
    Math.floor(Math.random() * GHOST_PHRASES.length),
  );

  useEffect(() => {
    if (!isTyping) {
      activeRef.current = false;
      setGhostText("");
      setIsVisible(false);
      return;
    }

    activeRef.current = true;
    setIsVisible(true);
    let cancelled = false;

    async function cycle() {
      while (activeRef.current && !cancelled) {
        const phrase =
          GHOST_PHRASES[phraseIndexRef.current % GHOST_PHRASES.length];
        phraseIndexRef.current++;

        // Type in
        for (let i = 0; i <= phrase.length; i++) {
          if (!activeRef.current || cancelled) return;
          setGhostText(phrase.slice(0, i));
          await sleep(80);
        }
        // Hold
        await sleep(1500);
        // Erase
        for (let i = phrase.length; i >= 0; i--) {
          if (!activeRef.current || cancelled) return;
          setGhostText(phrase.slice(0, i));
          await sleep(50);
        }
        // Wait
        await sleep(2000);
      }
    }

    cycle();

    return () => {
      cancelled = true;
      activeRef.current = false;
    };
  }, [isTyping]);

  return { ghostText, isVisible };
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
