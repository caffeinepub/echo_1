import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useEchoVeil } from "../hooks/useEchoVeil";

interface VeilActor {
  submit_veil_hash(
    hash: string,
    windowId: string,
  ): Promise<{ token: string; signal: string }>;
  poll_veil(token: string): Promise<{ phase: string; channelCode: string }>;
  veil_consent(token: string, accept: boolean): Promise<string>;
  send_message(code: string, text: string): Promise<boolean>;
  get_messages(
    code: string,
  ): Promise<Array<{ id: string; text: string; timestamp: bigint }>>;
  create_channel(code: string): Promise<boolean>;
}

interface EchoVeilOverlayProps {
  actor: VeilActor | null;
  onClose: () => void;
}

const SCANNING_TEXTS = [
  "scanning frequencies...",
  "signal unclear",
  "no stable connection detected",
  "searching...",
  "resonance pending",
  "frequency drift detected",
];

const ENTRY_SUBTITLES = [
  "a frequency awaits",
  "signals pass through walls",
  "the code is the key",
];

const MSG_TTL = 10000;
const CHANNEL_DURATION = 10 * 60;

const PITCH_FACTOR = 1.35;

interface ChannelMessage {
  id: string;
  text: string;
  side: "self" | "other";
  expiresAt: number;
  isVoice?: boolean;
  audioUrl?: string;
  transcript?: string;
  // special rendering state
  ghostDownloaded?: boolean;
  blindVisible?: boolean;
  lensVisible?: boolean;
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numSamples = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numSamples * blockAlign;
  const wavSize = 44 + dataSize;
  const ab = new ArrayBuffer(wavSize);
  const view = new DataView(ab);
  const ws = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++)
      view.setUint8(offset + i, s.charCodeAt(i));
  };
  ws(0, "RIFF");
  view.setUint32(4, wavSize - 8, true);
  ws(8, "WAVE");
  ws(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  ws(36, "data");
  view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([ab], { type: "audio/wav" });
}

async function applyPitchShift(blob: Blob, factor: number): Promise<string> {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const ctx = new AudioContext();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    await ctx.close();
    const newLength = Math.ceil(audioBuffer.length / factor);
    const offlineCtx = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      newLength,
      audioBuffer.sampleRate,
    );
    const src = offlineCtx.createBufferSource();
    src.buffer = audioBuffer;
    src.playbackRate.value = factor;
    src.connect(offlineCtx.destination);
    src.start(0);
    const rendered = await offlineCtx.startRendering();
    const wavBlob = audioBufferToWav(rendered);
    return URL.createObjectURL(wavBlob);
  } catch {
    return URL.createObjectURL(blob);
  }
}

// ── Special message renderers ────────────────────────────────────────────────

function LensMessage({
  msg,
  onExpire,
}: {
  msg: ChannelMessage;
  onExpire: (id: string) => void;
}) {
  const [visible, setVisible] = useState(true);
  const dataUrl = msg.text.slice("[LENS:".length, -1);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onExpire(msg.id), 600);
    }, 10000);
    return () => clearTimeout(t);
  }, [msg.id, onExpire]);

  return (
    <motion.div
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.6 }}
    >
      <img
        src={dataUrl}
        alt="dark lens"
        style={{
          width: 200,
          height: 200,
          imageRendering: "pixelated",
          border: "1px solid oklch(0.85 0.115 207 / 0.25)",
          display: "block",
        }}
      />
      <p
        style={{
          fontSize: "0.55rem",
          color: "oklch(0.45 0.025 222 / 0.5)",
          fontFamily: "monospace",
          letterSpacing: "0.08em",
          marginTop: 3,
          fontStyle: "italic",
        }}
      >
        ◉ kimlik silinmiş — 10s
      </p>
    </motion.div>
  );
}

function GhostFileMessage({
  msg,
  onExpire,
}: {
  msg: ChannelMessage;
  onExpire: (id: string) => void;
}) {
  const [downloaded, setDownloaded] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Parse [GHOST_FILE:filename:base64]
  const inner = msg.text.slice("[GHOST_FILE:".length, -1);
  const colonIdx = inner.indexOf(":");
  const filename = inner.slice(0, colonIdx);
  const b64 = inner.slice(colonIdx + 1);

  const handleDownload = useCallback(() => {
    if (downloaded) return;
    setDownloaded(true);
    // trigger download
    const a = document.createElement("a");
    a.href = b64;
    a.download = filename;
    a.click();
    // 30s countdown then remove
    let secs = 30;
    setCountdown(secs);
    const iv = setInterval(() => {
      secs--;
      setCountdown(secs);
      if (secs <= 0) {
        clearInterval(iv);
        onExpire(msg.id);
      }
    }, 1000);
  }, [downloaded, b64, filename, msg.id, onExpire]);

  return (
    <div>
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloaded}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          border: "1px solid oklch(0.85 0.115 207 / 0.25)",
          background: "oklch(0.10 0.018 222 / 0.5)",
          color: downloaded
            ? "oklch(0.40 0.018 222 / 0.5)"
            : "oklch(0.80 0.060 207)",
          fontFamily: "monospace",
          fontSize: "0.75rem",
          letterSpacing: "0.04em",
          cursor: downloaded ? "default" : "pointer",
          transition: "opacity 0.3s",
        }}
      >
        <span>📄</span>
        <span>{filename}</span>
      </button>
      {countdown !== null && (
        <p
          style={{
            fontSize: "0.55rem",
            color: "oklch(0.55 0.080 30 / 0.7)",
            fontFamily: "monospace",
            letterSpacing: "0.06em",
            marginTop: 3,
            fontStyle: "italic",
          }}
        >
          ◌ imha: {countdown}s
        </p>
      )}
    </div>
  );
}

function BlindShotMessage({
  msg,
  onExpire,
}: {
  msg: ChannelMessage;
  onExpire: (id: string) => void;
}) {
  const [countdown, setCountdown] = useState(3);
  const [visible, setVisible] = useState(true);
  const dataUrl = msg.text.slice("[BLIND:".length, -1);

  useEffect(() => {
    const iv = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(iv);
          setVisible(false);
          setTimeout(() => onExpire(msg.id), 600);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [msg.id, onExpire]);

  return (
    <motion.div
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.6 }}
      style={{ position: "relative", display: "inline-block" }}
    >
      <img
        src={dataUrl}
        alt="blind shot"
        style={{
          maxWidth: 200,
          maxHeight: 200,
          display: "block",
          border: "1px solid oklch(0.85 0.115 207 / 0.2)",
        }}
      />
      {countdown > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2.5rem",
            fontFamily: "monospace",
            fontWeight: 700,
            color: "oklch(0.95 0.010 220 / 0.85)",
            textShadow: "0 0 20px oklch(0.10 0.010 220)",
            pointerEvents: "none",
            background: "oklch(0.04 0.010 222 / 0.25)",
          }}
        >
          {countdown}
        </div>
      )}
    </motion.div>
  );
}

export default function EchoVeilOverlay({
  actor,
  onClose,
}: EchoVeilOverlayProps) {
  const {
    phase,
    voidMsg,
    channelCode,
    consentCountdown,
    cooldownLeft,
    submit,
    accept,
    reject,
    abort,
  } = useEchoVeil(actor as any);

  const [inputValue, setInputValue] = useState("");
  const [subtitle] = useState(
    () => ENTRY_SUBTITLES[Math.floor(Math.random() * ENTRY_SUBTITLES.length)],
  );
  const [scanText, setScanText] = useState(SCANNING_TEXTS[0]);
  const [scanIdx, setScanIdx] = useState(0);

  // Channel state
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [channelTimeLeft, setChannelTimeLeft] = useState(CHANNEL_DURATION);
  const [now, setNow] = useState(() => Date.now());
  const [channelClosing, setChannelClosing] = useState(false);
  const [awaitingPeer, setAwaitingPeer] = useState(false);

  // Recording state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  // Dark Lens state
  const [lensCountdown, setLensCountdown] = useState<number | null>(null);
  const [lensError, setLensError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lensStreamRef = useRef<MediaStream | null>(null);

  // Ghost file / Blind shot error state
  const [ghostError, setGhostError] = useState("");
  const [blindError, setBlindError] = useState("");

  // Dark Mirror state
  const [darkMirrorActive, setDarkMirrorActive] = useState(false);
  const [darkMirrorTimeLeft, setDarkMirrorTimeLeft] = useState(180);
  const [darkMirrorConnected, setDarkMirrorConnected] = useState(false);
  const [darkMirrorError, setDarkMirrorError] = useState("");
  const [darkMirrorDestroyMsg, setDarkMirrorDestroyMsg] = useState("");
  const darkMirrorVideoRef = useRef<HTMLVideoElement | null>(null);
  const darkMirrorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const darkMirrorStreamRef = useRef<MediaStream | null>(null);
  const darkMirrorRafRef = useRef<number | null>(null);
  const darkMirrorTimerRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const darkMirrorConnectRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const darkMirrorParticlesRef = useRef<
    Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      hue: number;
    }>
  >([]);

  // Ghost Frequency state
  const [ghostFreqActive, setGhostFreqActive] = useState(false);
  const [ghostFreqTimeLeft, setGhostFreqTimeLeft] = useState(180);
  const [ghostFreqConnected, setGhostFreqConnected] = useState(false);
  const [ghostFreqError, setGhostFreqError] = useState("");
  const [ghostFreqDestroyMsg, setGhostFreqDestroyMsg] = useState("");
  const ghostFreqCutAtRef = useRef<number>(0);
  const ghostFreqVideoRef = useRef<HTMLVideoElement | null>(null);
  const ghostFreqCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const ghostFreqStreamRef = useRef<MediaStream | null>(null);
  const ghostFreqRafRef = useRef<number | null>(null);
  const ghostFreqTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ghostFreqConnectRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const ghostFileInputRef = useRef<HTMLInputElement>(null);
  const blindFileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const selfTexts = useRef<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (phase !== "consent") setAwaitingPeer(false);
  }, [phase]);

  useEffect(() => {
    if (phase !== "searching") return;
    const interval = setInterval(() => {
      setScanIdx((prev) => {
        const next = (prev + 1) % SCANNING_TEXTS.length;
        setScanText(SCANNING_TEXTS[next]);
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== "connected") return;
    const interval = setInterval(() => {
      const ts = Date.now();
      setNow(ts);
      setMessages((prev) => prev.filter((m) => m.expiresAt > ts));
    }, 500);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== "connected") return;
    const interval = setInterval(() => {
      setChannelTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setChannelClosing(true);
          setTimeout(() => onClose(), 3000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, onClose]);

  useEffect(() => {
    if (phase !== "connected" || !actor || !channelCode) return;
    actor.create_channel(channelCode).catch(() => {});
    const interval = setInterval(async () => {
      try {
        const msgs = await actor.get_messages(channelCode);
        const incoming: ChannelMessage[] = [];
        for (const m of msgs) {
          if (seenIds.current.has(m.id)) continue;
          seenIds.current.add(m.id);
          const selfIdx = selfTexts.current.indexOf(m.text);
          let side: "self" | "other";
          if (selfIdx !== -1) {
            selfTexts.current.splice(selfIdx, 1);
            side = "self";
          } else {
            side = "other";
          }
          incoming.push({
            id: m.id,
            text: m.text,
            side,
            expiresAt: Date.now() + MSG_TTL,
          });
        }
        if (incoming.length > 0) setMessages((prev) => [...prev, ...incoming]);
      } catch {
        // ignore
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [phase, actor, channelCode]);

  const msgLen = messages.length;
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgLen]);

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        for (const t of mediaStreamRef.current.getTracks()) t.stop();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      if (lensStreamRef.current) {
        for (const t of lensStreamRef.current.getTracks()) t.stop();
      }
      if (darkMirrorStreamRef.current) {
        for (const t of darkMirrorStreamRef.current.getTracks()) t.stop();
      }
      if (darkMirrorRafRef.current)
        cancelAnimationFrame(darkMirrorRafRef.current);
      if (darkMirrorTimerRef.current) clearInterval(darkMirrorTimerRef.current);
      if (darkMirrorConnectRef.current)
        clearTimeout(darkMirrorConnectRef.current);
    };
  }, []);

  const handleSubmit = useCallback(async () => {
    const code = inputValue.trim();
    if (!code) return;
    setInputValue("");
    await submit(code);
  }, [inputValue, submit]);

  const sendChannelMessage = useCallback(
    async (text: string) => {
      if (!actor || !channelCode) return;
      const tempId = `self-${Date.now()}-${Math.random()}`;
      seenIds.current.add(tempId);
      selfTexts.current.push(text);
      setMessages((prev) => [
        ...prev,
        { id: tempId, text, side: "self", expiresAt: Date.now() + MSG_TTL },
      ]);
      try {
        await actor.send_message(channelCode, text);
      } catch {
        const idx = selfTexts.current.indexOf(text);
        if (idx !== -1) selfTexts.current.splice(idx, 1);
      }
    },
    [actor, channelCode],
  );

  const handleChatSend = useCallback(async () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput("");
    await sendChannelMessage(text);
  }, [chatInput, sendChannelMessage]);

  const handleSpeakToggle = useCallback(async () => {
    if (isSpeaking) {
      mediaRecorderRef.current?.stop();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setIsSpeaking(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        mediaStreamRef.current = stream;

        const SpeechRec =
          (window as any).SpeechRecognition ||
          (window as any).webkitSpeechRecognition;
        if (SpeechRec) {
          const recognition = new SpeechRec() as any;
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = navigator.language || "tr-TR";
          recognition.onresult = (e: any) => {
            let interim = "";
            for (let i = e.resultIndex; i < e.results.length; i++) {
              interim += e.results[i][0].transcript;
            }
            setTranscript(interim);
          };
          recognition.onerror = () => {};
          recognition.start();
          recognitionRef.current = recognition;
        }

        const recorder = new MediaRecorder(stream);
        audioChunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        recorder.onstop = async () => {
          for (const t of stream.getTracks()) t.stop();
          mediaStreamRef.current = null;

          const capturedTranscript = transcript;
          setTranscript("");

          const rawBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });
          audioChunksRef.current = [];

          const maskedUrl = await applyPitchShift(rawBlob, PITCH_FACTOR);

          const voiceLabel = capturedTranscript
            ? `◉ [ses] ${capturedTranscript}`
            : "◉ [ses kaydı]";

          const tempId = `self-voice-${Date.now()}`;
          seenIds.current.add(tempId);
          if (actor && channelCode) {
            selfTexts.current.push(voiceLabel);
            setMessages((prev) => [
              ...prev,
              {
                id: tempId,
                text: voiceLabel,
                side: "self",
                expiresAt: Date.now() + MSG_TTL,
                isVoice: true,
                audioUrl: maskedUrl,
                transcript: capturedTranscript || undefined,
              },
            ]);
            try {
              await actor.send_message(channelCode, voiceLabel);
            } catch {
              // ignore
            }
          }
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsSpeaking(true);
      } catch {
        setIsSpeaking(false);
      }
    }
  }, [isSpeaking, actor, channelCode, transcript]);

  // ── Dark Lens ────────────────────────────────────────────────────────────
  const handleDarkLens = useCallback(async () => {
    if (lensCountdown !== null) return;
    setLensError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      lensStreamRef.current = stream;

      // hidden video element
      const video = document.createElement("video");
      video.srcObject = stream;
      video.playsInline = true;
      videoRef.current = video;
      await video.play();

      // Countdown 3 → 1
      let count = 3;
      setLensCountdown(count);
      const iv = setInterval(() => {
        count--;
        if (count > 0) {
          setLensCountdown(count);
        } else {
          clearInterval(iv);
          setLensCountdown(null);

          // Capture and pixelate
          const SMALL = 32;
          const OUT = 200;
          const offscreen = document.createElement("canvas");
          offscreen.width = SMALL;
          offscreen.height = SMALL;
          const octx = offscreen.getContext("2d");
          if (octx) {
            octx.drawImage(video, 0, 0, SMALL, SMALL);
          }

          const final = document.createElement("canvas");
          final.width = OUT;
          final.height = OUT;
          const fctx = final.getContext("2d");
          if (fctx) {
            fctx.imageSmoothingEnabled = false;
            fctx.drawImage(offscreen, 0, 0, OUT, OUT);
          }

          const dataUrl = final.toDataURL("image/png");

          // Stop stream
          for (const t of stream.getTracks()) t.stop();
          lensStreamRef.current = null;
          videoRef.current = null;

          sendChannelMessage(`[LENS:${dataUrl}]`);
        }
      }, 1000);
    } catch {
      setLensError("kamera erişimi reddedildi");
      setLensCountdown(null);
    }
  }, [lensCountdown, sendChannelMessage]);

  // ── Koordinat Sisi ───────────────────────────────────────────────────────
  const handleKoordinatSisi = useCallback(() => {
    const fogResults = ["yakın", "uzak", "belirsiz"] as const;
    const sendFog = (result: string) => {
      sendChannelMessage(
        `◎ koordinat sisi: frekanslar ${result} kesişti — yer açıklanamaz`,
      );
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          // Success — still don't send real coords
          const result =
            fogResults[Math.floor(Math.random() * fogResults.length)];
          sendFog(result);
        },
        () => {
          sendFog("belirsiz");
        },
        { timeout: 5000 },
      );
    } else {
      sendFog("belirsiz");
    }
  }, [sendChannelMessage]);

  // ── Ghost File ───────────────────────────────────────────────────────────
  const handleGhostFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      setGhostError("");
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";

      if (file.size > 500 * 1024) {
        setGhostError("sinyal taşınamaz — dosya çok ağır");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        sendChannelMessage(`[GHOST_FILE:${file.name}:${dataUrl}]`);
      };
      reader.readAsDataURL(file);
    },
    [sendChannelMessage],
  );

  // ── Blind Shot ───────────────────────────────────────────────────────────
  const handleBlindShotSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      setBlindError("");
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";

      const reader = new FileReader();
      reader.onload = () => {
        const srcUrl = reader.result as string;
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          ctx.drawImage(img, 0, 0);

          // Noise overlay
          const noiseCount = Math.floor((img.width * img.height) / 4);
          for (let i = 0; i < noiseCount; i++) {
            const x = Math.random() * img.width;
            const y = Math.random() * img.height;
            const size = Math.random() * 4 + 1;
            const alpha = Math.random() * 0.35 + 0.05;
            const light = Math.random() > 0.5 ? 220 : 20;
            ctx.fillStyle = `rgba(${light},${light},${light},${alpha})`;
            ctx.fillRect(x, y, size, size);
          }

          const dataUrl = canvas.toDataURL("image/png");
          sendChannelMessage(`[BLIND:${dataUrl}]`);
        };
        img.src = srcUrl;
      };
      reader.readAsDataURL(file);
    },
    [sendChannelMessage],
  );

  // ── Dark Mirror ─────────────────────────────────────────────────────────
  const handleDarkMirrorClose = useCallback(
    (reason?: string) => {
      if (darkMirrorStreamRef.current) {
        for (const t of darkMirrorStreamRef.current.getTracks()) t.stop();
        darkMirrorStreamRef.current = null;
      }
      if (darkMirrorRafRef.current) {
        cancelAnimationFrame(darkMirrorRafRef.current);
        darkMirrorRafRef.current = null;
      }
      if (darkMirrorTimerRef.current) {
        clearInterval(darkMirrorTimerRef.current);
        darkMirrorTimerRef.current = null;
      }
      if (darkMirrorConnectRef.current) {
        clearTimeout(darkMirrorConnectRef.current);
        darkMirrorConnectRef.current = null;
      }
      darkMirrorVideoRef.current = null;
      darkMirrorParticlesRef.current = [];
      setDarkMirrorActive(false);
      setDarkMirrorConnected(false);
      setDarkMirrorTimeLeft(180);
      const msg = reason || "bağlantı atomlarına ayrıldı";
      setDarkMirrorDestroyMsg(msg);
      setTimeout(() => setDarkMirrorDestroyMsg(""), 3500);
      if (channelCode && actor) {
        sendChannelMessage(`◐ karanlık ayna: ${msg}`);
      }
    },
    [channelCode, actor, sendChannelMessage],
  );

  const handleDarkMirrorStart = useCallback(async () => {
    if (darkMirrorActive) return;
    setDarkMirrorError("");
    setDarkMirrorDestroyMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      darkMirrorStreamRef.current = stream;

      const video = document.createElement("video");
      video.srcObject = stream;
      video.playsInline = true;
      darkMirrorVideoRef.current = video;
      await video.play();

      setDarkMirrorActive(true);
      setDarkMirrorConnected(false);
      setDarkMirrorTimeLeft(180);

      // Simulate peer connection after 2.5s
      darkMirrorConnectRef.current = setTimeout(() => {
        setDarkMirrorConnected(true);
      }, 2500);

      // Countdown timer
      let timeLeft = 180;
      darkMirrorTimerRef.current = setInterval(() => {
        timeLeft--;
        setDarkMirrorTimeLeft(timeLeft);
        if (timeLeft <= 0) {
          handleDarkMirrorClose("sinyal süresi doldu — iz kalmadı");
        }
      }, 1000);

      // Canvas render loop — particle cloud + shadow silhouette effect
      darkMirrorParticlesRef.current = [];
      const hues = [207, 230, 270, 190];
      const runLoop = () => {
        const canvas = darkMirrorCanvasRef.current;
        const vid = darkMirrorVideoRef.current;
        if (!canvas || !vid || vid.readyState < 2) {
          darkMirrorRafRef.current = requestAnimationFrame(runLoop);
          return;
        }
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const W = canvas.width;
        const H = canvas.height;

        // Layer 1: Shadow silhouette
        ctx.drawImage(vid, 0, 0, W, H);
        const imageData = ctx.getImageData(0, 0, W, H);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const brightness = r * 0.299 + g * 0.587 + b * 0.114;
          if (brightness > 20) {
            const intensity = Math.min(brightness / 255, 1);
            data[i] = Math.floor(4 + intensity * 8);
            data[i + 1] = Math.floor(6 + intensity * 10);
            data[i + 2] = Math.floor(15 + intensity * 25);
            data[i + 3] = Math.floor(150 + intensity * 105);
          } else {
            data[i] = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
            data[i + 3] = 255;
          }
        }
        ctx.putImageData(imageData, 0, 0);

        // Layer 2: Particle system — sample brightness, spawn & draw particles
        const sampleData = ctx.getImageData(0, 0, W, H);
        const sd = sampleData.data;
        // Spawn new particles from bright regions
        for (let s = 0; s < 12; s++) {
          const px = Math.floor(Math.random() * W);
          const py = Math.floor(Math.random() * H);
          const idx = (py * W + px) * 4;
          const br =
            sd[idx] * 0.299 + sd[idx + 1] * 0.587 + sd[idx + 2] * 0.114;
          if (br > 40) {
            darkMirrorParticlesRef.current.push({
              x: px,
              y: py,
              vx: (Math.random() - 0.5) * 0.8,
              vy: -(Math.random() * 0.7 + 0.1),
              size: Math.random() * 2.5 + 1.5,
              alpha: Math.random() * 0.4 + 0.5,
              hue: hues[Math.floor(Math.random() * hues.length)],
            });
          }
        }
        // Cap particles
        if (darkMirrorParticlesRef.current.length > 280) {
          darkMirrorParticlesRef.current.splice(
            0,
            darkMirrorParticlesRef.current.length - 280,
          );
        }
        // Update & draw
        darkMirrorParticlesRef.current = darkMirrorParticlesRef.current.filter(
          (p) => p.alpha > 0,
        );
        for (const p of darkMirrorParticlesRef.current) {
          p.x += p.vx;
          p.y += p.vy;
          p.alpha -= 0.012;
          p.vx += (Math.random() - 0.5) * 0.1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, 70%, 65%, ${p.alpha})`;
          ctx.fill();
        }

        // Layer 3: Vignette
        const grad = ctx.createRadialGradient(
          W / 2,
          H / 2,
          H * 0.25,
          W / 2,
          H / 2,
          H * 0.75,
        );
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, "rgba(0,0,0,0.85)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        darkMirrorRafRef.current = requestAnimationFrame(runLoop);
      };
      darkMirrorRafRef.current = requestAnimationFrame(runLoop);
    } catch {
      setDarkMirrorError("kamera erişimi reddedildi");
    }
  }, [darkMirrorActive, handleDarkMirrorClose]);

  // Screenshot / focus loss detection for dark mirror
  useEffect(() => {
    if (!darkMirrorActive) return;
    let blurTimer: ReturnType<typeof setTimeout> | null = null;
    const handleBlur = () => {
      blurTimer = setTimeout(() => {
        handleDarkMirrorClose("sinyal imha edildi — iz kalmadı");
      }, 500);
    };
    const handleFocus = () => {
      if (blurTimer) clearTimeout(blurTimer);
    };
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      if (blurTimer) clearTimeout(blurTimer);
    };
  }, [darkMirrorActive, handleDarkMirrorClose]);

  const handleGhostFreqClose = useCallback((reason?: string) => {
    if (ghostFreqStreamRef.current) {
      for (const t of ghostFreqStreamRef.current.getTracks()) t.stop();
      ghostFreqStreamRef.current = null;
    }
    if (ghostFreqRafRef.current) {
      cancelAnimationFrame(ghostFreqRafRef.current);
      ghostFreqRafRef.current = null;
    }
    if (ghostFreqTimerRef.current) {
      clearInterval(ghostFreqTimerRef.current);
      ghostFreqTimerRef.current = null;
    }
    if (ghostFreqConnectRef.current) {
      clearTimeout(ghostFreqConnectRef.current);
      ghostFreqConnectRef.current = null;
    }
    ghostFreqVideoRef.current = null;
    setGhostFreqActive(false);
    setGhostFreqConnected(false);
    setGhostFreqTimeLeft(180);
    ghostFreqCutAtRef.current = 0;
    const msg = reason || "sinyal kesildi — bu an bir daha gelmez";
    setGhostFreqDestroyMsg(msg);
    setTimeout(() => setGhostFreqDestroyMsg(""), 3500);
  }, []);

  const handleGhostFreqStart = useCallback(async () => {
    if (ghostFreqActive) return;
    setGhostFreqError("");
    setGhostFreqDestroyMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      ghostFreqStreamRef.current = stream;

      const video = document.createElement("video");
      video.srcObject = stream;
      video.playsInline = true;
      ghostFreqVideoRef.current = video;
      await video.play();

      const cutAt = Math.floor(Math.random() * 170) + 10;
      ghostFreqCutAtRef.current = cutAt;
      setGhostFreqActive(true);
      setGhostFreqConnected(false);
      setGhostFreqTimeLeft(180);

      // Simulate connection after 3s
      ghostFreqConnectRef.current = setTimeout(() => {
        setGhostFreqConnected(true);
      }, 3000);

      // Countdown + random cut
      let elapsed = 0;
      ghostFreqTimerRef.current = setInterval(() => {
        elapsed++;
        setGhostFreqTimeLeft((prev) => Math.max(0, prev - 1));
        if (elapsed >= ghostFreqCutAtRef.current) {
          handleGhostFreqClose("sinyal kesildi — bu an bir daha gelmez");
        }
      }, 1000);

      // Canvas render loop — dead pixel / corrupted signal aesthetic
      const runLoop = () => {
        const canvas = ghostFreqCanvasRef.current;
        const vid = ghostFreqVideoRef.current;
        if (!canvas || !vid || vid.readyState < 2) {
          ghostFreqRafRef.current = requestAnimationFrame(runLoop);
          return;
        }
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const W = canvas.width;
        const H = canvas.height;

        // Draw at very low res for pixelation
        const offW = 80;
        const offH = 60;
        const offCanvas = document.createElement("canvas");
        offCanvas.width = offW;
        offCanvas.height = offH;
        const offCtx = offCanvas.getContext("2d");
        if (!offCtx) return;
        offCtx.drawImage(vid, 0, 0, offW, offH);
        // Scale back up (pixelated)
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(offCanvas, 0, 0, W, H);

        // Apply green-grey surveillance tint + desaturate
        const imageData = ctx.getImageData(0, 0, W, H);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const lum = r * 0.299 + g * 0.587 + b * 0.114;
          // Greenish-grey tint
          data[i] = Math.floor(lum * 0.55);
          data[i + 1] = Math.floor(lum * 0.78);
          data[i + 2] = Math.floor(lum * 0.6);
          data[i + 3] = 255;
        }
        // Add static noise at ~5% density
        const noiseCount = Math.floor(W * H * 0.05);
        for (let n = 0; n < noiseCount; n++) {
          const px = Math.floor(Math.random() * W);
          const py = Math.floor(Math.random() * H);
          const idx = (py * W + px) * 4;
          if (idx >= 0 && idx < data.length - 3) {
            const v = Math.floor(Math.random() * 120 + 100);
            data[idx] = v;
            data[idx + 1] = v;
            data[idx + 2] = v;
            data[idx + 3] = 255;
          }
        }
        ctx.putImageData(imageData, 0, 0);
        ghostFreqRafRef.current = requestAnimationFrame(runLoop);
      };
      ghostFreqRafRef.current = requestAnimationFrame(runLoop);
    } catch {
      setGhostFreqError("kamera erişimi reddedildi");
    }
  }, [ghostFreqActive, handleGhostFreqClose]);

  const removeMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const minutes = Math.floor(channelTimeLeft / 60);
  const seconds = channelTimeLeft % 60;
  const timerStr = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: "oklch(0.04 0.015 222 / 0.97)",
        backdropFilter: "blur(20px)",
      }}
      data-ocid="echo_veil.modal"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, oklch(0.45 0.115 207 / 0.08) 0%, transparent 60%)",
        }}
      />

      <button
        type="button"
        onClick={onClose}
        className="absolute top-6 right-6 z-10 font-mono text-xs tracking-widest transition-all duration-200"
        style={{ color: "oklch(0.40 0.020 220 / 0.5)" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "oklch(0.85 0.115 207)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "oklch(0.40 0.020 220 / 0.5)";
        }}
        aria-label="Close Echo Veil"
        data-ocid="echo_veil.close_button"
      >
        ✕
      </button>

      <div
        className="relative w-full max-w-md mx-6 flex flex-col"
        style={{ minHeight: "70vh" }}
      >
        <AnimatePresence mode="wait">
          {/* ── IDLE ─────────────────────────────────────────── */}
          {phase === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center gap-8 mt-20"
            >
              <div className="text-center">
                <h2
                  className="font-cinzel font-bold tracking-[0.35em] mb-3"
                  style={{
                    fontSize: "1.2rem",
                    color: "oklch(0.85 0.115 207)",
                    textShadow: "0 0 24px oklch(0.85 0.115 207 / 0.4)",
                  }}
                >
                  ◈ ECHO VEIL
                </h2>
                <p
                  className="font-mono text-xs tracking-[0.2em]"
                  style={{ color: "oklch(0.50 0.040 222 / 0.7)" }}
                >
                  {subtitle}
                </p>
              </div>

              {cooldownLeft > 0 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-mono text-xs tracking-widest text-center"
                  style={{ color: "oklch(0.60 0.12 30 / 0.7)" }}
                >
                  signal overloaded — wait {Math.floor(cooldownLeft / 60)}:
                  {String(cooldownLeft % 60).padStart(2, "0")}
                </motion.p>
              )}

              <div className="w-full">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmit();
                  }}
                  placeholder="enter the signal phrase..."
                  disabled={cooldownLeft > 0}
                  className="w-full bg-transparent outline-none text-sm tracking-wider placeholder:opacity-30 py-3 px-0"
                  style={{
                    color: "oklch(0.90 0.018 220)",
                    borderBottom: "1px solid oklch(0.30 0.040 222 / 0.6)",
                    transition: "border-color 0.3s",
                    fontFamily: "monospace",
                    letterSpacing: "0.08em",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderBottomColor =
                      "oklch(0.85 0.115 207 / 0.5)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderBottomColor =
                      "oklch(0.30 0.040 222 / 0.6)";
                  }}
                  data-ocid="echo_veil.input"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!inputValue.trim() || cooldownLeft > 0}
                className="font-cinzel text-xs tracking-[0.25em] px-8 py-3 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  border: "1px solid oklch(0.85 0.115 207 / 0.3)",
                  color: "oklch(0.85 0.115 207)",
                  background: "oklch(0.10 0.020 222 / 0.5)",
                }}
                onMouseEnter={(e) => {
                  if (inputValue.trim())
                    e.currentTarget.style.borderColor =
                      "oklch(0.85 0.115 207 / 0.7)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor =
                    "oklch(0.85 0.115 207 / 0.3)";
                }}
                data-ocid="echo_veil.submit_button"
              >
                ◈ transmit
              </button>

              <p
                className="font-mono text-center"
                style={{
                  fontSize: "0.6rem",
                  color: "oklch(0.38 0.020 222 / 0.6)",
                  letterSpacing: "0.06em",
                }}
              >
                phrases expire in 30 seconds — timing is everything
              </p>
            </motion.div>
          )}

          {/* ── SEARCHING ───────────────────────────────────── */}
          {phase === "searching" && (
            <motion.div
              key="searching"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center justify-center gap-10 mt-16"
              data-ocid="echo_veil.loading_state"
            >
              <div
                className="relative flex items-center justify-center"
                style={{ width: 120, height: 120 }}
              >
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={`ring-${i}`}
                    className="absolute rounded-full"
                    style={{
                      width: 30 + i * 22,
                      height: 30 + i * 22,
                      border: "1px solid oklch(0.85 0.115 207 / 0.15)",
                      animation: `veil-pulse 2.4s ${i * 0.6}s ease-out infinite`,
                    }}
                  />
                ))}
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    background: "oklch(0.85 0.115 207)",
                    boxShadow: "0 0 12px oklch(0.85 0.115 207 / 0.6)",
                    animation: "veil-dot 1.6s ease-in-out infinite alternate",
                  }}
                />
              </div>

              <AnimatePresence mode="wait">
                <motion.p
                  key={scanIdx}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.4 }}
                  className="font-mono text-xs tracking-[0.2em] text-center"
                  style={{ color: "oklch(0.55 0.050 207 / 0.8)" }}
                >
                  {scanText}
                </motion.p>
              </AnimatePresence>

              <button
                type="button"
                onClick={abort}
                className="font-cinzel text-xs tracking-[0.2em] px-6 py-2.5 transition-all duration-200"
                style={{
                  border: "1px solid oklch(0.30 0.020 222 / 0.5)",
                  color: "oklch(0.45 0.020 222 / 0.6)",
                  background: "transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor =
                    "oklch(0.55 0.030 222 / 0.7)";
                  e.currentTarget.style.color = "oklch(0.65 0.020 222)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor =
                    "oklch(0.30 0.020 222 / 0.5)";
                  e.currentTarget.style.color = "oklch(0.45 0.020 222 / 0.6)";
                }}
                data-ocid="echo_veil.cancel_button"
              >
                ◈ abort signal
              </button>
            </motion.div>
          )}

          {/* ── CONSENT ─────────────────────────────────────── */}
          {phase === "consent" && (
            <motion.div
              key="consent"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center justify-center gap-10 mt-16"
              data-ocid="echo_veil.dialog"
            >
              <div className="text-center">
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  className="font-cinzel tracking-[0.2em]"
                  style={{
                    fontSize: "1.1rem",
                    color: "oklch(0.88 0.090 207)",
                    textShadow: "0 0 30px oklch(0.85 0.115 207 / 0.5)",
                  }}
                >
                  a signal is detected
                </motion.p>
              </div>

              <div
                className="w-full"
                style={{ height: 1, background: "oklch(0.20 0.025 222)" }}
              >
                <motion.div
                  style={{
                    height: "100%",
                    background: "oklch(0.85 0.115 207 / 0.4)",
                    transformOrigin: "left",
                  }}
                  animate={{ scaleX: consentCountdown / 30 }}
                  transition={{ duration: 0.9, ease: "linear" }}
                />
              </div>

              <p
                className="font-mono text-xs tracking-widest"
                style={{ color: "oklch(0.40 0.020 222 / 0.5)" }}
              >
                {consentCountdown}s
              </p>

              {awaitingPeer ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-mono text-xs tracking-[0.2em]"
                  style={{ color: "oklch(0.55 0.050 207 / 0.7)" }}
                >
                  awaiting resonance...
                </motion.p>
              ) : (
                <div className="flex gap-8">
                  <button
                    type="button"
                    onClick={() => {
                      setAwaitingPeer(true);
                      accept();
                    }}
                    className="font-cinzel text-xs tracking-[0.2em] px-7 py-3 transition-all duration-200"
                    style={{
                      border: "1px solid oklch(0.85 0.115 207 / 0.25)",
                      color: "oklch(0.85 0.115 207 / 0.9)",
                      background: "oklch(0.12 0.025 222 / 0.5)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor =
                        "oklch(0.85 0.115 207 / 0.6)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor =
                        "oklch(0.85 0.115 207 / 0.25)";
                    }}
                    data-ocid="echo_veil.confirm_button"
                  >
                    open channel
                  </button>
                  <button
                    type="button"
                    onClick={reject}
                    className="font-cinzel text-xs tracking-[0.2em] px-7 py-3 transition-all duration-200"
                    style={{
                      border: "1px solid oklch(0.30 0.020 222 / 0.4)",
                      color: "oklch(0.45 0.018 222 / 0.6)",
                      background: "transparent",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor =
                        "oklch(0.45 0.020 222 / 0.6)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor =
                        "oklch(0.30 0.020 222 / 0.4)";
                    }}
                    data-ocid="echo_veil.cancel_button"
                  >
                    dissolve
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ── CONNECTED ───────────────────────────────────── */}
          {phase === "connected" && (
            <motion.div
              key="connected"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
              className="flex flex-col"
              style={{ height: "85vh" }}
              data-ocid="echo_veil.panel"
            >
              {/* Header */}
              <div className="text-center py-4 flex-shrink-0">
                <motion.p
                  initial={{ opacity: 0, letterSpacing: "0.5em" }}
                  animate={{ opacity: 1, letterSpacing: "0.18em" }}
                  transition={{ duration: 1 }}
                  className="font-cinzel text-xs tracking-[0.18em] mb-1"
                  style={{
                    color: "oklch(0.85 0.115 207)",
                    textShadow: "0 0 16px oklch(0.85 0.115 207 / 0.4)",
                  }}
                >
                  channel open — time is finite
                </motion.p>
                <p
                  className="font-mono"
                  style={{
                    fontSize: "0.65rem",
                    color: "oklch(0.45 0.040 222 / 0.6)",
                    letterSpacing: "0.15em",
                  }}
                >
                  {timerStr} remaining
                </p>
              </div>

              <div
                style={{ height: 1, background: "oklch(0.18 0.025 222)" }}
                className="flex-shrink-0"
              />

              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto py-4 px-1 space-y-3"
                style={{ scrollbarWidth: "none" }}
              >
                <AnimatePresence initial={false}>
                  {messages.map((msg) => {
                    const secsLeft = Math.max(
                      0,
                      Math.ceil((msg.expiresAt - now) / 1000),
                    );

                    // Special: Lens frame
                    if (
                      msg.text.startsWith("[LENS:") &&
                      msg.text.endsWith("]")
                    ) {
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
                          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                          exit={{
                            opacity: 0,
                            filter: "blur(10px)",
                            scale: 0.95,
                          }}
                          transition={{ duration: 0.35 }}
                          className={`flex ${
                            msg.side === "self"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className="px-3 py-2"
                            style={{
                              border: "1px solid oklch(0.85 0.115 207 / 0.15)",
                              background: "oklch(0.08 0.015 222 / 0.6)",
                            }}
                          >
                            <LensMessage msg={msg} onExpire={removeMessage} />
                          </div>
                        </motion.div>
                      );
                    }

                    // Special: Ghost file
                    if (
                      msg.text.startsWith("[GHOST_FILE:") &&
                      msg.text.endsWith("]")
                    ) {
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
                          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                          exit={{
                            opacity: 0,
                            filter: "blur(10px)",
                            scale: 0.95,
                          }}
                          transition={{ duration: 0.35 }}
                          className={`flex ${
                            msg.side === "self"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className="px-3 py-2"
                            style={{
                              border: "1px solid oklch(0.85 0.115 207 / 0.15)",
                              background: "oklch(0.08 0.015 222 / 0.6)",
                            }}
                          >
                            <GhostFileMessage
                              msg={msg}
                              onExpire={removeMessage}
                            />
                          </div>
                        </motion.div>
                      );
                    }

                    // Special: Blind shot
                    if (
                      msg.text.startsWith("[BLIND:") &&
                      msg.text.endsWith("]")
                    ) {
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
                          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                          exit={{
                            opacity: 0,
                            filter: "blur(10px)",
                            scale: 0.95,
                          }}
                          transition={{ duration: 0.35 }}
                          className={`flex ${
                            msg.side === "self"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className="px-3 py-2"
                            style={{
                              border: "1px solid oklch(0.85 0.115 207 / 0.15)",
                              background: "oklch(0.08 0.015 222 / 0.6)",
                            }}
                          >
                            <BlindShotMessage
                              msg={msg}
                              onExpire={removeMessage}
                            />
                          </div>
                        </motion.div>
                      );
                    }

                    // Default message
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
                        transition={{ duration: 0.35 }}
                        className={`flex ${
                          msg.side === "self" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className="relative px-4 py-2.5 max-w-[85%]"
                          style={{
                            background:
                              msg.side === "self"
                                ? "oklch(0.16 0.035 210 / 0.8)"
                                : "oklch(0.10 0.018 222 / 0.6)",
                            border:
                              msg.side === "self"
                                ? "1px solid oklch(0.85 0.115 207 / 0.2)"
                                : "1px solid oklch(0.22 0.030 222 / 0.5)",
                            color:
                              msg.side === "self"
                                ? "oklch(0.92 0.018 220)"
                                : "oklch(0.65 0.018 220 / 0.85)",
                            fontStyle:
                              msg.side === "other" ? "italic" : "normal",
                            fontSize: "0.83rem",
                            paddingBottom: msg.audioUrl ? "0.6rem" : "1.4rem",
                            letterSpacing: "0.03em",
                          }}
                        >
                          {msg.audioUrl ? (
                            <div>
                              <audio
                                src={msg.audioUrl}
                                controls
                                autoPlay={msg.side === "self"}
                                onEnded={() => {
                                  setMessages((prev) =>
                                    prev.filter((m) => m.id !== msg.id),
                                  );
                                  URL.revokeObjectURL(msg.audioUrl!);
                                }}
                                style={{
                                  width: "100%",
                                  height: 28,
                                  opacity: 0.85,
                                }}
                              >
                                <track kind="captions" />
                              </audio>
                              {msg.transcript && (
                                <p
                                  className="font-mono mt-1"
                                  style={{
                                    fontSize: "0.62rem",
                                    color: "oklch(0.55 0.060 207 / 0.75)",
                                    letterSpacing: "0.04em",
                                    fontStyle: "italic",
                                  }}
                                >
                                  ◈ {msg.transcript}
                                </p>
                              )}
                              <p
                                className="font-mono mt-0.5"
                                style={{
                                  fontSize: "0.55rem",
                                  color: "oklch(0.38 0.020 222 / 0.4)",
                                  letterSpacing: "0.06em",
                                }}
                              >
                                ses maskeli — kimlik sıfır
                              </p>
                            </div>
                          ) : (
                            <span>{msg.text}</span>
                          )}
                          {!msg.audioUrl && (
                            <span
                              style={{
                                position: "absolute",
                                bottom: 5,
                                right: 10,
                                fontSize: "0.58rem",
                                fontStyle: "italic",
                                color: "oklch(0.40 0.015 222 / 0.5)",
                                fontFamily: "monospace",
                              }}
                            >
                              {secsLeft}s
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {messages.length === 0 && !channelClosing && (
                  <p
                    className="text-center font-mono mt-10"
                    style={{
                      fontSize: "0.65rem",
                      color: "oklch(0.38 0.018 222 / 0.5)",
                      letterSpacing: "0.12em",
                    }}
                  >
                    silence is also a signal
                  </p>
                )}

                <AnimatePresence>
                  {channelClosing && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center font-cinzel text-xs tracking-[0.2em] mt-6"
                      style={{ color: "oklch(0.55 0.025 222 / 0.7)" }}
                    >
                      the signal dissolved — no trace remains
                    </motion.p>
                  )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
              </div>

              <div
                style={{ height: 1, background: "oklch(0.18 0.025 222)" }}
                className="flex-shrink-0"
              />

              {/* Input area */}
              {!channelClosing && (
                <div className="pt-4 pb-2 flex-shrink-0 space-y-3">
                  {/* Speak toggle button */}
                  <button
                    type="button"
                    onClick={handleSpeakToggle}
                    className="w-full py-3 font-cinzel text-xs tracking-[0.28em] transition-all duration-300 relative overflow-hidden"
                    style={{
                      border: isSpeaking
                        ? "1px solid oklch(0.75 0.18 25 / 0.6)"
                        : "1px solid oklch(0.85 0.115 207 / 0.25)",
                      color: isSpeaking
                        ? "oklch(0.90 0.18 25)"
                        : "oklch(0.85 0.115 207 / 0.85)",
                      background: isSpeaking
                        ? "oklch(0.12 0.030 20 / 0.7)"
                        : "oklch(0.10 0.020 222 / 0.4)",
                      boxShadow: isSpeaking
                        ? "0 0 20px oklch(0.85 0.18 25 / 0.25), inset 0 0 20px oklch(0.75 0.18 25 / 0.08)"
                        : "none",
                    }}
                    data-ocid="echo_veil.toggle"
                    aria-label={
                      isSpeaking ? "Konuşmayı durdur" : "Konuşmaya başla"
                    }
                  >
                    {isSpeaking ? (
                      <span className="flex items-center justify-center gap-2">
                        <span
                          className="inline-block w-2 h-2 rounded-full animate-pulse"
                          style={{ background: "oklch(0.85 0.18 25)" }}
                        />
                        ◉ DURDUR
                        <span
                          className="inline-block w-2 h-2 rounded-full animate-pulse"
                          style={{
                            background: "oklch(0.85 0.18 25)",
                            animationDelay: "0.3s",
                          }}
                        />
                      </span>
                    ) : (
                      "◈ KONUŞMAYA BAŞLA"
                    )}
                    {isSpeaking && (
                      <div
                        className="absolute bottom-0 left-0 right-0 h-0.5"
                        style={{
                          background:
                            "linear-gradient(90deg, transparent 0%, oklch(0.85 0.18 25 / 0.6) 50%, transparent 100%)",
                          animation: "veil-scan 1.5s linear infinite",
                        }}
                      />
                    )}
                  </button>

                  {/* Live transcript preview */}
                  <AnimatePresence>
                    {isSpeaking && transcript && (
                      <motion.p
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="font-mono text-center"
                        style={{
                          fontSize: "0.65rem",
                          color: "oklch(0.60 0.070 207 / 0.8)",
                          letterSpacing: "0.05em",
                          fontStyle: "italic",
                        }}
                      >
                        ◈ {transcript}
                      </motion.p>
                    )}
                    {isSpeaking && !transcript && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="font-mono text-center"
                        style={{
                          fontSize: "0.6rem",
                          color: "oklch(0.42 0.025 222 / 0.5)",
                          letterSpacing: "0.1em",
                        }}
                      >
                        ses maskesi aktif — kimlik sıfırlandı
                      </motion.p>
                    )}
                  </AnimatePresence>

                  {/* ── 4 Secret Feature Toolbar ─────────────────── */}
                  <div
                    className="flex items-center gap-2"
                    style={{
                      borderTop: "1px solid oklch(0.18 0.025 222 / 0.6)",
                      paddingTop: 8,
                    }}
                  >
                    {/* 1: Karanlık Mercek */}
                    <button
                      type="button"
                      onClick={handleDarkLens}
                      disabled={lensCountdown !== null}
                      title="Karanlık Mercek — pikselleştirilmiş anlık görüntü"
                      className="flex items-center gap-1 px-3 py-1.5 font-mono text-xs tracking-wider transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        border: "1px solid oklch(0.30 0.035 207 / 0.5)",
                        color:
                          lensCountdown !== null
                            ? "oklch(0.75 0.18 25)"
                            : "oklch(0.65 0.060 207 / 0.85)",
                        background: "oklch(0.09 0.015 222 / 0.5)",
                        fontSize: "0.68rem",
                      }}
                      data-ocid="echo_veil.button"
                    >
                      ◉
                      <span>
                        {lensCountdown !== null
                          ? `${lensCountdown}s`
                          : "mercek"}
                      </span>
                    </button>

                    {/* 2: Koordinat Sisi */}
                    <button
                      type="button"
                      onClick={handleKoordinatSisi}
                      title="Koordinat Sisi — konum sinyali"
                      className="flex items-center gap-1 px-3 py-1.5 font-mono text-xs tracking-wider transition-all duration-200"
                      style={{
                        border: "1px solid oklch(0.30 0.035 207 / 0.5)",
                        color: "oklch(0.65 0.060 207 / 0.85)",
                        background: "oklch(0.09 0.015 222 / 0.5)",
                        fontSize: "0.68rem",
                      }}
                      data-ocid="echo_veil.button"
                    >
                      ◎<span>sis</span>
                    </button>

                    {/* 3: Hayalet Dosya */}
                    <button
                      type="button"
                      onClick={() => ghostFileInputRef.current?.click()}
                      title="Hayalet Dosya — kendini imha eden dosya"
                      className="flex items-center gap-1 px-3 py-1.5 font-mono text-xs tracking-wider transition-all duration-200"
                      style={{
                        border: "1px solid oklch(0.30 0.035 207 / 0.5)",
                        color: "oklch(0.65 0.060 207 / 0.85)",
                        background: "oklch(0.09 0.015 222 / 0.5)",
                        fontSize: "0.68rem",
                      }}
                      data-ocid="echo_veil.upload_button"
                    >
                      ◌<span>dosya</span>
                    </button>

                    {/* 4: Körleme Fotoğraf */}
                    <button
                      type="button"
                      onClick={() => blindFileInputRef.current?.click()}
                      title="Körleme Fotoğraf — 3 saniyede kaybolan resim"
                      className="flex items-center gap-1 px-3 py-1.5 font-mono text-xs tracking-wider transition-all duration-200"
                      style={{
                        border: "1px solid oklch(0.30 0.035 207 / 0.5)",
                        color: "oklch(0.65 0.060 207 / 0.85)",
                        background: "oklch(0.09 0.015 222 / 0.5)",
                        fontSize: "0.68rem",
                      }}
                      data-ocid="echo_veil.upload_button"
                    >
                      ◑<span>kör</span>
                    </button>
                    {/* 5: Karanlık Ayna */}
                    <button
                      type="button"
                      onClick={handleDarkMirrorStart}
                      disabled={darkMirrorActive}
                      title="Karanlık Ayna — yüzsüz görüntülü görüşme"
                      className="flex items-center gap-1 px-3 py-1.5 font-mono text-xs tracking-wider transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        border: "1px solid oklch(0.30 0.035 207 / 0.5)",
                        color: "oklch(0.65 0.060 207 / 0.85)",
                        background: "oklch(0.09 0.015 222 / 0.5)",
                        fontSize: "0.68rem",
                      }}
                      data-ocid="echo_veil.button"
                    >
                      ◐<span>ayna</span>
                    </button>
                    {/* 6: Hayalet Frekans */}
                    <button
                      type="button"
                      onClick={handleGhostFreqStart}
                      disabled={ghostFreqActive}
                      title="Hayalet Frekans — 3 dakikalık belirsiz görüşme"
                      className="flex items-center gap-1 px-3 py-1.5 font-mono text-xs tracking-wider transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        border: "1px solid oklch(0.28 0.040 145 / 0.5)",
                        color: "oklch(0.62 0.080 145 / 0.85)",
                        background: "oklch(0.08 0.015 145 / 0.5)",
                        fontSize: "0.68rem",
                      }}
                      data-ocid="echo_veil.button"
                    >
                      ◌<span>frekans</span>
                    </button>
                  </div>

                  {/* Error feedback */}
                  <AnimatePresence>
                    {(lensError || ghostError || blindError) && (
                      <motion.p
                        initial={{ opacity: 0, y: 2 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="font-mono text-center"
                        style={{
                          fontSize: "0.60rem",
                          color: "oklch(0.65 0.14 30 / 0.8)",
                          letterSpacing: "0.05em",
                          fontStyle: "italic",
                        }}
                      >
                        ◌ {lensError || ghostError || blindError}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  {/* Text input row */}
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleChatSend();
                        }
                      }}
                      placeholder="transmit..."
                      className="flex-1 bg-transparent outline-none text-sm placeholder:opacity-25"
                      style={{
                        color: "oklch(0.90 0.018 220)",
                        fontFamily: "monospace",
                        borderBottom: "1px solid oklch(0.25 0.030 222 / 0.4)",
                        paddingBottom: 6,
                        letterSpacing: "0.04em",
                      }}
                      maxLength={240}
                      data-ocid="echo_veil.textarea"
                    />
                    <button
                      type="button"
                      onClick={handleChatSend}
                      disabled={!chatInput.trim()}
                      className="font-cinzel text-xs tracking-[0.15em] px-4 py-2 transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed"
                      style={{
                        border: "1px solid oklch(0.85 0.115 207 / 0.3)",
                        color: "oklch(0.85 0.115 207)",
                        background: "oklch(0.12 0.020 222 / 0.4)",
                      }}
                      data-ocid="echo_veil.submit_button"
                    >
                      ◈
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── VOID ────────────────────────────────────────── */}
          {phase === "void" && (
            <motion.div
              key="void"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center gap-6 mt-28"
              data-ocid="echo_veil.error_state"
            >
              <p
                className="font-cinzel tracking-[0.2em] text-center"
                style={{
                  fontSize: "0.9rem",
                  color: "oklch(0.50 0.025 222 / 0.7)",
                }}
              >
                {voidMsg}
              </p>
              <div
                className="w-8"
                style={{ height: 1, background: "oklch(0.30 0.025 222 / 0.4)" }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={ghostFileInputRef}
        type="file"
        accept="*/*"
        className="hidden"
        onChange={handleGhostFileSelect}
        data-ocid="echo_veil.dropzone"
      />
      <input
        ref={blindFileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleBlindShotSelect}
        data-ocid="echo_veil.dropzone"
      />

      <style>{`
        @keyframes veil-pulse {
          0% { transform: scale(0.6); opacity: 0.6; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes veil-dot {
          0% { opacity: 0.4; transform: scale(0.85); }
          100% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes veil-scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      {/* ── GHOST FREQUENCY OVERLAY ─────────────────────────────────────── */}
      <AnimatePresence>
        {ghostFreqActive && (
          <motion.div
            key="ghost-freq"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.6 }}
            className="fixed inset-0 z-[61] flex flex-col items-center justify-between"
            style={{ background: "oklch(0.02 0.012 145 / 0.97)" }}
          >
            {/* Top bar */}
            <div className="w-full flex items-center justify-between px-6 pt-6 flex-shrink-0">
              <div>
                <p
                  className="font-cinzel font-bold tracking-[0.30em]"
                  style={{
                    fontSize: "0.85rem",
                    color: "oklch(0.70 0.100 145)",
                    textShadow: "0 0 18px oklch(0.70 0.100 145 / 0.5)",
                  }}
                >
                  ◌ HAYALET FREKANS
                </p>
                <p
                  className="font-mono mt-1"
                  style={{
                    fontSize: "0.6rem",
                    color: "oklch(0.38 0.040 145 / 0.7)",
                    letterSpacing: "0.12em",
                  }}
                >
                  {String(Math.floor(ghostFreqTimeLeft / 60)).padStart(2, "0")}:
                  {String(ghostFreqTimeLeft % 60).padStart(2, "0")}
                </p>
              </div>
              <motion.p
                key={ghostFreqConnected ? "gf-connected" : "gf-scanning"}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="font-mono text-right"
                style={{
                  fontSize: "0.58rem",
                  color: ghostFreqConnected
                    ? "oklch(0.65 0.100 145 / 0.8)"
                    : "oklch(0.45 0.040 145 / 0.7)",
                  letterSpacing: "0.07em",
                  fontStyle: "italic",
                  maxWidth: 200,
                }}
              >
                {ghostFreqConnected
                  ? "◌ sinyal yakalandı — süre belirsiz"
                  : "searching..."}
              </motion.p>
            </div>

            {/* Canvas — corrupted signal */}
            <div className="flex-1 flex items-center justify-center w-full px-4">
              <div
                style={{
                  position: "relative",
                  display: "inline-block",
                }}
              >
                <canvas
                  ref={ghostFreqCanvasRef}
                  width={320}
                  height={240}
                  style={{
                    display: "block",
                    imageRendering: "pixelated",
                    border: "1px solid oklch(0.40 0.080 145 / 0.6)",
                    boxShadow:
                      "0 0 24px oklch(0.50 0.100 145 / 0.25), inset 0 0 12px oklch(0.10 0.020 145 / 0.5)",
                    animation: "ghostFlicker 0.18s steps(1) infinite",
                  }}
                />
                {ghostFreqError && (
                  <p
                    className="font-mono text-center mt-3 absolute bottom-[-2rem] left-0 right-0"
                    style={{
                      fontSize: "0.58rem",
                      color: "oklch(0.62 0.14 30 / 0.8)",
                      letterSpacing: "0.08em",
                    }}
                  >
                    ◌ {ghostFreqError}
                  </p>
                )}
              </div>
            </div>

            {/* Bottom */}
            <div className="w-full flex flex-col items-center gap-3 px-6 pb-8 flex-shrink-0">
              <p
                className="font-mono text-center"
                style={{
                  fontSize: "0.55rem",
                  color: "oklch(0.40 0.040 145 / 0.5)",
                  letterSpacing: "0.10em",
                  fontStyle: "italic",
                }}
              >
                bağlantı herhangi bir anda kesilebilir
              </p>
              <button
                type="button"
                onClick={() => handleGhostFreqClose()}
                className="font-mono tracking-widest transition-all duration-200"
                style={{
                  fontSize: "0.65rem",
                  color: "oklch(0.55 0.070 145 / 0.75)",
                  letterSpacing: "0.15em",
                  background: "none",
                  border: "1px solid oklch(0.30 0.040 145 / 0.4)",
                  padding: "0.4rem 1.2rem",
                }}
                data-ocid="echo_veil.close_button"
              >
                ◌ sinyali bırak
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── DARK MIRROR OVERLAY ─────────────────────────────────────────── */}
      <AnimatePresence>
        {darkMirrorActive && (
          <motion.div
            key="dark-mirror"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.6 }}
            className="fixed inset-0 z-[60] flex flex-col items-center justify-between"
            style={{ background: "oklch(0.02 0.010 222)" }}
          >
            {/* Top bar */}
            <div className="w-full flex items-center justify-between px-6 pt-6 flex-shrink-0">
              <div>
                <p
                  className="font-cinzel font-bold tracking-[0.30em]"
                  style={{
                    fontSize: "0.85rem",
                    color: "oklch(0.75 0.090 207)",
                    textShadow: "0 0 18px oklch(0.75 0.090 207 / 0.5)",
                  }}
                >
                  ◐ KARANLIK AYNA
                </p>
                <p
                  className="font-mono mt-1"
                  style={{
                    fontSize: "0.6rem",
                    color: "oklch(0.38 0.030 222 / 0.7)",
                    letterSpacing: "0.12em",
                  }}
                >
                  {String(Math.floor(darkMirrorTimeLeft / 60)).padStart(2, "0")}
                  :{String(darkMirrorTimeLeft % 60).padStart(2, "0")}
                </p>
              </div>
              <motion.p
                key={darkMirrorConnected ? "connected" : "scanning"}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="font-mono text-right"
                style={{
                  fontSize: "0.58rem",
                  color: darkMirrorConnected
                    ? "oklch(0.70 0.100 150 / 0.8)"
                    : "oklch(0.50 0.040 207 / 0.7)",
                  letterSpacing: "0.07em",
                  fontStyle: "italic",
                  maxWidth: 180,
                }}
              >
                {darkMirrorConnected
                  ? "◈ frekans kilitlendi — karşı taraf görüntülüyor"
                  : "scanning..."}
              </motion.p>
            </div>

            {/* Canvas */}
            <div className="flex-1 flex items-center justify-center w-full py-6">
              <motion.div
                animate={{
                  boxShadow: darkMirrorConnected
                    ? [
                        "0 0 20px oklch(0.55 0.100 207 / 0.3)",
                        "0 0 40px oklch(0.55 0.100 207 / 0.55)",
                        "0 0 20px oklch(0.55 0.100 207 / 0.3)",
                      ]
                    : "0 0 12px oklch(0.35 0.040 222 / 0.3)",
                }}
                transition={{
                  duration: 2.2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
                style={{
                  border: darkMirrorConnected
                    ? "1px solid oklch(0.55 0.100 207 / 0.35)"
                    : "1px solid oklch(0.22 0.025 222 / 0.5)",
                  transition: "border-color 0.8s",
                }}
              >
                <canvas
                  ref={darkMirrorCanvasRef}
                  width={320}
                  height={240}
                  style={{ display: "block" }}
                />
              </motion.div>
            </div>

            {/* Bottom */}
            <div className="w-full px-6 pb-8 flex flex-col items-center gap-4 flex-shrink-0">
              <AnimatePresence>
                {darkMirrorError && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-mono text-center"
                    style={{
                      fontSize: "0.6rem",
                      color: "oklch(0.65 0.14 30 / 0.8)",
                      letterSpacing: "0.06em",
                      fontStyle: "italic",
                    }}
                  >
                    ◌ {darkMirrorError}
                  </motion.p>
                )}
              </AnimatePresence>
              <button
                type="button"
                onClick={() => handleDarkMirrorClose()}
                className="font-cinzel text-xs tracking-[0.22em] px-8 py-2.5 transition-all duration-200"
                style={{
                  border: "1px solid oklch(0.35 0.030 222 / 0.6)",
                  color: "oklch(0.50 0.025 222 / 0.8)",
                  background: "transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor =
                    "oklch(0.60 0.100 30 / 0.6)";
                  e.currentTarget.style.color = "oklch(0.75 0.100 30)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor =
                    "oklch(0.35 0.030 222 / 0.6)";
                  e.currentTarget.style.color = "oklch(0.50 0.025 222 / 0.8)";
                }}
                data-ocid="echo_veil.close_button"
              >
                ◐ bağlantıyı kes
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Destroy message toast */}
      <AnimatePresence>
        {/* Ghost Frequency destroy toast */}
        <AnimatePresence>
          {ghostFreqDestroyMsg && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[70] px-6 py-3"
              style={{
                background: "oklch(0.06 0.018 145 / 0.95)",
                border: "1px solid oklch(0.28 0.040 145 / 0.5)",
                backdropFilter: "blur(12px)",
              }}
            >
              <p
                className="font-mono text-center"
                style={{
                  fontSize: "0.65rem",
                  color: "oklch(0.60 0.060 145 / 0.85)",
                  letterSpacing: "0.10em",
                  fontStyle: "italic",
                }}
              >
                ◌ {ghostFreqDestroyMsg}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        {darkMirrorDestroyMsg && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[70] px-6 py-3"
            style={{
              background: "oklch(0.07 0.015 222 / 0.95)",
              border: "1px solid oklch(0.30 0.030 222 / 0.5)",
              backdropFilter: "blur(12px)",
            }}
          >
            <p
              className="font-mono text-center"
              style={{
                fontSize: "0.65rem",
                color: "oklch(0.60 0.030 222 / 0.85)",
                letterSpacing: "0.10em",
                fontStyle: "italic",
              }}
            >
              ◐ {darkMirrorDestroyMsg}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
