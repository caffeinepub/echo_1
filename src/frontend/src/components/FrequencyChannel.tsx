import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface ChannelActor {
  create_channel(code: string): Promise<boolean>;
  get_messages(
    code: string,
  ): Promise<Array<{ id: string; text: string; timestamp: bigint }>>;
  send_message(code: string, text: string): Promise<boolean>;
}

interface FrequencyChannelProps {
  onClose: () => void;
  mourningMode: boolean;
  actor: ChannelActor | null;
  channelCode: string;
}

const CHANNEL_DURATION = 10 * 60;
const MSG_TTL = 10000;

interface Message {
  id: string;
  text: string;
  side: "self" | "other";
  expiresAt: number;
}

export default function FrequencyChannel({
  onClose,
  mourningMode,
  actor,
  channelCode,
}: FrequencyChannelProps) {
  const [timeLeft, setTimeLeft] = useState(CHANNEL_DURATION);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [closing, setClosing] = useState(false);
  const [closingMsg, setClosingMsg] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [sentConfirm, setSentConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const selfTexts = useRef<string[]>([]);

  useEffect(() => {
    if (actor && channelCode) {
      actor.create_channel(channelCode).catch(() => {});
    }
  }, [actor, channelCode]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          triggerClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const ts = Date.now();
      setNow(ts);
      setMessages((prev) => prev.filter((m) => m.expiresAt > ts));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!actor || !channelCode) return;
    const interval = setInterval(async () => {
      try {
        const msgs = await actor.get_messages(channelCode);
        const incoming: Message[] = [];
        for (const m of msgs) {
          const id = m.id;
          if (seenIds.current.has(id)) continue;
          seenIds.current.add(id);
          const selfIdx = selfTexts.current.indexOf(m.text);
          let side: "self" | "other";
          if (selfIdx !== -1) {
            selfTexts.current.splice(selfIdx, 1);
            side = "self";
          } else {
            side = "other";
          }
          incoming.push({
            id,
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
    }, 2000);
    return () => clearInterval(interval);
  }, [actor, channelCode]);

  const messageCountRef = useRef(0);
  if (messages.length !== messageCountRef.current) {
    messageCountRef.current = messages.length;
    setTimeout(
      () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
      50,
    );
  }

  function triggerClose() {
    setClosingMsg(true);
    setTimeout(() => {
      onClose();
    }, 2000);
  }

  function handleClose() {
    if (closing) return;
    setClosing(true);
    triggerClose();
  }

  async function handleSend() {
    const text = inputValue.trim();
    if (!text || !actor) return;
    setInputValue("");

    // Optimistic update: show message immediately
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
    setSentConfirm(true);
    setTimeout(() => setSentConfirm(false), 2000);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timerStr = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} \u25c8 kanal aktif`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: "oklch(0.04 0.015 222 / 0.97)",
        backdropFilter: "blur(16px)",
        filter: mourningMode ? "grayscale(1)" : undefined,
      }}
      data-ocid="frequency.modal"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(0.45 0.115 207 / 0.07) 0%, transparent 65%)",
        }}
      />
      <div
        className="relative w-full max-w-xl mx-4 flex flex-col"
        style={{ height: "90vh" }}
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-0 right-0 z-10 font-cinzel text-xs tracking-widest transition-all duration-200"
          style={{ color: "oklch(0.55 0.020 220 / 0.5)" }}
          aria-label="Close frequency channel"
          data-ocid="frequency.close_button"
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "oklch(0.85 0.115 207)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "oklch(0.55 0.020 220 / 0.5)";
          }}
        >
          \u2715
        </button>

        <div className="text-center pt-2 pb-5 flex-shrink-0">
          <motion.h2
            initial={{ opacity: 0, letterSpacing: "0.5em" }}
            animate={{ opacity: 1, letterSpacing: "0.18em" }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="font-cinzel text-sm mb-2"
            style={{
              color: "oklch(0.85 0.115 207)",
              textShadow: "0 0 20px oklch(0.85 0.115 207 / 0.5)",
            }}
          >
            \u0130ki frekans \u00e7ak\u0131\u015ft\u0131. Zaman daral\u0131yor.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="font-mono text-xs tracking-widest"
            style={{ color: "oklch(0.55 0.060 207 / 0.7)" }}
          >
            {timerStr}
          </motion.p>
        </div>

        <div className="glow-divider flex-shrink-0" />

        <div
          className="flex-1 overflow-y-auto py-4 px-2 space-y-3"
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(8px)", scale: 0.96 }}
                  transition={{ duration: 0.4 }}
                  className={`flex ${msg.side === "self" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className="relative rounded-xl px-4 py-2.5 max-w-[75%]"
                    style={{
                      background:
                        msg.side === "self"
                          ? "oklch(0.18 0.040 210 / 0.8)"
                          : "oklch(0.12 0.022 222 / 0.7)",
                      border:
                        msg.side === "self"
                          ? "1px solid oklch(0.85 0.115 207 / 0.25)"
                          : "1px solid oklch(0.28 0.038 222 / 0.5)",
                      color:
                        msg.side === "self"
                          ? "oklch(0.92 0.018 220)"
                          : "oklch(0.72 0.020 220 / 0.85)",
                      fontStyle: msg.side === "other" ? "italic" : "normal",
                      fontSize: "0.85rem",
                      paddingBottom: "1.4rem",
                    }}
                  >
                    {msg.text}
                    <span
                      style={{
                        position: "absolute",
                        bottom: "5px",
                        right: "10px",
                        fontSize: "0.62rem",
                        fontStyle: "italic",
                        color: "oklch(0.55 0.020 220 / 0.5)",
                        fontFamily: "monospace",
                        letterSpacing: "0.03em",
                      }}
                    >
                      {secsLeft}s
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {messages.length === 0 && (
            <p
              className="text-center text-xs tracking-widest opacity-40 mt-8"
              style={{ color: "oklch(0.65 0.020 220)" }}
            >
              kanal a\u00e7\u0131k \u00b7 sessizlik de bir mesajd\u0131r
            </p>
          )}
          <div ref={messagesEndRef} />
        </div>

        <AnimatePresence>
          {closingMsg && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center py-3 flex-shrink-0"
            >
              <p
                className="font-cinzel text-xs tracking-[0.2em]"
                style={{ color: "oklch(0.72 0.030 220 / 0.7)" }}
              >
                Frekans yok oldu. Hi\u00e7bir iz kalmad\u0131.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="glow-divider flex-shrink-0" />

        {!closingMsg && (
          <div className="pt-4 pb-2 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div
                className="glass-card flex-1 rounded-xl px-4 py-2 flex items-center"
                style={{ borderColor: "oklch(0.32 0.040 222 / 0.7)" }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="yaz\u2026"
                  className="w-full bg-transparent outline-none text-sm placeholder:opacity-30"
                  style={{ color: "oklch(0.92 0.018 220)" }}
                  maxLength={240}
                  data-ocid="frequency.input"
                />
              </div>
              <button
                type="button"
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="font-cinzel text-xs tracking-[0.2em] px-4 py-2.5 rounded-xl transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: "oklch(0.20 0.035 220)",
                  border: "1px solid oklch(0.85 0.115 207 / 0.3)",
                  color: "oklch(0.85 0.115 207)",
                }}
                data-ocid="frequency.submit_button"
              >
                \u25c8
              </button>
            </div>
            <AnimatePresence>
              {sentConfirm && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-center font-cinzel text-xs tracking-[0.2em] mt-2"
                  style={{ color: "oklch(0.65 0.060 207 / 0.7)" }}
                  data-ocid="frequency.success_state"
                >
                  \u25c8 g\u00f6nderildi
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
