import { useMemo } from "react";

const GLITCH_POOL = [
  "\u0337",
  "\u0336",
  "\u031C",
  "\u0324",
  "\u0308",
  "\u0303",
];

interface BrokenTextProps {
  text: string;
  broken?: boolean;
}

type CharItem = {
  char: string;
  glitch: boolean;
  glitchChar: string;
  key: string;
};

export default function BrokenText({ text, broken = false }: BrokenTextProps) {
  const chars = useMemo<CharItem[] | null>(() => {
    if (!broken) return null;
    return text.split("").map((char, i) => {
      if (!/[a-zA-Z\u00C0-\u024F]/.test(char)) {
        return { char, glitch: false, glitchChar: "", key: `${i}-${char}` };
      }
      const seed = (i * 7 + text.length * 3 + char.charCodeAt(0)) % 100;
      if (seed < 20) {
        return {
          char,
          glitch: true,
          glitchChar: GLITCH_POOL[(i + text.length) % GLITCH_POOL.length],
          key: `${i}-${char}-g`,
        };
      }
      return { char, glitch: false, glitchChar: "", key: `${i}-${char}` };
    });
  }, [text, broken]);

  if (!broken || !chars) return <>{text}</>;

  return (
    <>
      {chars.map((item) =>
        item.glitch ? (
          <span
            key={item.key}
            className="glitch-char"
            style={{ color: "oklch(0.85 0.115 207 / 0.7)" }}
          >
            {item.char + item.glitchChar}
          </span>
        ) : (
          <span key={item.key}>{item.char}</span>
        ),
      )}
    </>
  );
}
