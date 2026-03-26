import { useCallback, useRef, useState } from "react";

export function useAmbientAudio() {
  const [isPlaying, setIsPlaying] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{
    oscillators: OscillatorNode[];
    lfos: OscillatorNode[];
    gains: GainNode[];
    masterGain: GainNode;
    filter: BiquadFilterNode;
    compressor: DynamicsCompressorNode;
  } | null>(null);

  const stop = useCallback(() => {
    if (nodesRef.current) {
      const { oscillators, lfos, masterGain } = nodesRef.current;
      masterGain.gain.setTargetAtTime(0, masterGain.context.currentTime, 0.5);
      setTimeout(() => {
        for (const o of oscillators) {
          try {
            o.stop();
          } catch {
            /* already stopped */
          }
        }
        for (const l of lfos) {
          try {
            l.stop();
          } catch {
            /* already stopped */
          }
        }
      }, 1500);
      nodesRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const start = useCallback(async () => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    // Clean up any previous nodes
    if (nodesRef.current) {
      for (const o of nodesRef.current.oscillators) {
        try {
          o.stop();
        } catch {
          /* ok */
        }
      }
      for (const l of nodesRef.current.lfos) {
        try {
          l.stop();
        } catch {
          /* ok */
        }
      }
    }

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 30;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;
    compressor.connect(ctx.destination);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 200;
    filter.Q.value = 0.8;
    filter.connect(compressor);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.setTargetAtTime(0.05, ctx.currentTime, 1.5);
    masterGain.connect(filter);

    const baseFreqs = [40, 60, 80];
    const oscillators: OscillatorNode[] = [];
    const lfos: OscillatorNode[] = [];
    const gains: GainNode[] = [];

    for (const freq of baseFreqs) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;

      const oscGain = ctx.createGain();
      oscGain.gain.value = 1 / baseFreqs.length;
      osc.connect(oscGain);
      oscGain.connect(masterGain);

      // Slow LFO for frequency wobble
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.08;

      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 2; // ±2 Hz modulation
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      osc.start();
      lfo.start();

      oscillators.push(osc);
      lfos.push(lfo);
      gains.push(oscGain);
    }

    nodesRef.current = {
      oscillators,
      lfos,
      gains,
      masterGain,
      filter,
      compressor,
    };
    setIsPlaying(true);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      stop();
    } else {
      start();
    }
  }, [isPlaying, start, stop]);

  return { isPlaying, toggle, start, stop };
}
