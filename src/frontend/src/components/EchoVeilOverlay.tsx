import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { VeilPhase } from "../hooks/useEchoVeil";
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

interface ChannelMessage {
  id: string;
  text: string;
  side: "self" | "other";
  expiresAt: number;
  isVoice?: boolean;
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

  // PTT state
  const [pttActive, setPttActive] = useState(false);
  const [pttTranscript, setPttTranscript] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const selfTexts = useRef<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<any>(null);

  // Scanning text cycle

  // Reset awaitingPeer whenever we leave the consent phase
  useEffect(() => {
    if (phase !== "consent") {
      setAwaitingPeer(false);
    }
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

  // Channel: message expiry ticker
  useEffect(() => {
    if (phase !== "connected") return;
    const interval = setInterval(() => {
      const ts = Date.now();
      setNow(ts);
      setMessages((prev) => prev.filter((m) => m.expiresAt > ts));
    }, 500);
    return () => clearInterval(interval);
  }, [phase]);

  // Channel: countdown
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

  // Channel: poll for messages
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
        if (incoming.length > 0) {
          setMessages((prev) => [...prev, ...incoming]);
        }
      } catch {
        // ignore
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [phase, actor, channelCode]);

  // Scroll to bottom
  const msgLen = messages.length;
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgLen]);

  const handleSubmit = useCallback(async () => {
    const code = inputValue.trim();
    if (!code) return;
    setInputValue("");
    await submit(code);
  }, [inputValue, submit]);

  const handleChatSend = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || !actor || !channelCode) return;
    setChatInput("");
    // Optimistic update
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
  }, [chatInput, actor, channelCode]);

  // PTT: hold to talk
  const handlePttStart = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const dest = ctx.createMediaStreamDestination();
      // pitch shift via playback rate hack on buffer source node
      // For live stream, we'll use biquad + gain as a simple mask
      const filter = ctx.createBiquadFilter();
      filter.type = "lowshelf";
      filter.frequency.value = 1000;
      filter.gain.value = -6;
      source.connect(filter);
      filter.connect(dest);
      setPttActive(true);
      setPttTranscript("");

      // Speech recognition
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = false;
        rec.onresult = (e: any) => {
          const transcript = Array.from(e.results)
            .map((r: any) => r[0].transcript)
            .join(" ");
          setPttTranscript(transcript);
        };
        rec.start();
        recognitionRef.current = rec;
      }
    } catch {
      setPttActive(false);
    }
  }, []);

  const handlePttEnd = useCallback(async () => {
    setPttActive(false);
    if (mediaStreamRef.current) {
      for (const t of mediaStreamRef.current.getTracks()) {
        t.stop();
      }
      mediaStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (pttTranscript.trim() && actor && channelCode) {
      const voiceText = `◉ ${pttTranscript.trim()}`;
      const tempId = `self-voice-${Date.now()}`;
      seenIds.current.add(tempId);
      selfTexts.current.push(voiceText);
      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          text: voiceText,
          side: "self",
          expiresAt: Date.now() + MSG_TTL,
          isVoice: true,
        },
      ]);
      try {
        await actor.send_message(channelCode, voiceText);
      } catch {
        const idx = selfTexts.current.indexOf(voiceText);
        if (idx !== -1) selfTexts.current.splice(idx, 1);
      }
    }
    setPttTranscript("");
  }, [pttTranscript, actor, channelCode]);

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
      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, oklch(0.45 0.115 207 / 0.08) 0%, transparent 60%)",
        }}
      />

      {/* Close button */}
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
              {/* Pulse rings */}
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

              {/* Countdown bar */}
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
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
                        transition={{ duration: 0.35 }}
                        className={`flex ${msg.side === "self" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className="relative px-4 py-2.5 max-w-[80%]"
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
                            paddingBottom: "1.4rem",
                            letterSpacing: "0.03em",
                          }}
                        >
                          {msg.text}
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

              {/* Input row */}
              {!channelClosing && (
                <div className="pt-4 pb-2 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    {/* PTT button */}
                    <button
                      type="button"
                      onPointerDown={handlePttStart}
                      onPointerUp={handlePttEnd}
                      onPointerLeave={handlePttEnd}
                      className="flex-shrink-0 w-9 h-9 flex items-center justify-center transition-all duration-200"
                      style={{
                        border: `1px solid ${pttActive ? "oklch(0.85 0.115 207 / 0.6)" : "oklch(0.28 0.030 222 / 0.5)"}`,
                        background: pttActive
                          ? "oklch(0.20 0.040 210 / 0.8)"
                          : "transparent",
                        color: pttActive
                          ? "oklch(0.85 0.115 207)"
                          : "oklch(0.40 0.020 222 / 0.5)",
                        borderRadius: 2,
                        boxShadow: pttActive
                          ? "0 0 12px oklch(0.85 0.115 207 / 0.3)"
                          : "none",
                      }}
                      aria-label="Push to talk"
                      data-ocid="echo_veil.toggle"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-label="Push to talk"
                        role="img"
                      >
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                      </svg>
                    </button>

                    {pttActive ? (
                      <div
                        className="flex-1 font-mono text-xs tracking-widest animate-pulse"
                        style={{
                          color: "oklch(0.65 0.060 207 / 0.7)",
                          letterSpacing: "0.15em",
                        }}
                      >
                        ◉ transmitting...
                      </div>
                    ) : (
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
                    )}

                    {!pttActive && (
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
                    )}
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

      <style>{`
        @keyframes veil-pulse {
          0% { transform: scale(0.6); opacity: 0.6; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes veil-dot {
          0% { opacity: 0.4; transform: scale(0.85); }
          100% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </motion.div>
  );
}
