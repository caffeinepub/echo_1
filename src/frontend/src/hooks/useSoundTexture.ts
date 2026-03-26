import { useCallback, useRef, useState } from "react";

const HINTS = [
  {
    threshold: 0.05,
    text: "\u25ce derin sessizlik \u2014 yaln\u0131z bir odasd\u0131n",
  },
  {
    threshold: 0.15,
    text: "\u25ce faint signal \u2014 karanl\u0131k \u00e7evrilmi\u015f",
  },
  {
    threshold: 0.35,
    text: "\u25ce frekans hissediliyor \u2014 birisi yak\u0131n",
  },
  {
    threshold: Number.POSITIVE_INFINITY,
    text: "\u25ce kolektif g\u00fcr\u00fclt\u00fc \u2014 kalabal\u0131kta kayboluyorsun",
  },
];

export function useSoundTexture() {
  const [textureHint, setTextureHint] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const captureTexture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      await new Promise<void>((resolve) => setTimeout(resolve, 500));

      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteTimeDomainData(data);

      // Compute RMS amplitude (0–1)
      const rms = Math.sqrt(
        data.reduce((sum, v) => sum + ((v - 128) / 128) ** 2, 0) / data.length,
      );

      // Clean up
      for (const t of stream.getTracks()) t.stop();
      await ctx.close();

      const hint = HINTS.find((h) => rms < h.threshold);
      if (hint) {
        setTextureHint(hint.text);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setTextureHint(null), 4000);
      }
    } catch {
      // silently skip if mic denied or unavailable
    }
  }, []);

  return { textureHint, captureTexture };
}
