import { Mic, Waves } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import type { HistoryEntry } from "../App";
import { useGhostTyping } from "../hooks/useGhostTyping";
import { useLastWord } from "../hooks/useLastWord";
import { useSilenceMoment } from "../hooks/useSilenceMoment";
import { useSoundEcho } from "../hooks/useSoundEcho";
import AudioToggle from "./AudioToggle";
import CollectiveMemory from "./CollectiveMemory";
import CollectiveWave from "./CollectiveWave";
import DarkPoll from "./DarkPoll";
import GhostTyping from "./GhostTyping";
import LastWordPrompt from "./LastWordPrompt";
import SilenceMoment from "./SilenceMoment";

interface LandingViewProps {
  onSubmit: (pulse: string, shadow?: string) => void;
  error: string | null;
  hasHistory: boolean;
  isPlaying?: boolean;
  onToggleAudio?: () => void;
  history: HistoryEntry[];
  mourningMode: boolean;
  onToggleMourning: () => void;
  frequencyCode: string;
  blindSpot: boolean;
  onToggleBlindSpot: () => void;
  isLoading?: boolean;
  onOpenEchoVeil?: () => void;
}

const PROCESS_STEPS = [
  {
    num: "01",
    title: "EXTRACT",
    desc: "Your emotional signature is isolated from the noise.",
  },
  {
    num: "02",
    title: "MATCH",
    desc: "Anonymous resonances are found across the field.",
  },
  {
    num: "03",
    title: "EXPERIENCE",
    desc: "A world emerges \u2014 fleeting, almost real.",
  },
];

export default function LandingView({
  onSubmit,
  error,
  isPlaying = false,
  onToggleAudio = () => {},
  history,
  mourningMode,
  onToggleMourning,
  frequencyCode,
  blindSpot,
  onToggleBlindSpot,
  isLoading = false,
  onOpenEchoVeil,
}: LandingViewProps) {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const [shadowOpen, setShadowOpen] = useState(false);
  const [shadowInput, setShadowInput] = useState("");
  const [shadowFocused, setShadowFocused] = useState(false);
  const [blindSpotFlash, setBlindSpotFlash] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shadowInputRef = useRef<HTMLInputElement>(null);
  const { isSilent } = useSilenceMoment();
  const { ghostText, isVisible: ghostVisible } = useGhostTyping(focused);
  const { lastWord } = useLastWord();
  const { recording, countdown, recorded, startRecording } = useSoundEcho();

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    if (!isPlaying) onToggleAudio();
    onSubmit(input, shadowInput.trim() || undefined);
    setShadowInput("");
    setShadowOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleShadowToggle = () => {
    setShadowOpen((prev) => {
      if (!prev) {
        setTimeout(() => shadowInputRef.current?.focus(), 200);
      }
      return !prev;
    });
  };

  const handleToggleBlindSpotClick = () => {
    if (!blindSpot) {
      setBlindSpotFlash(true);
      setTimeout(() => setBlindSpotFlash(false), 3000);
    }
    onToggleBlindSpot();
  };

  const handleNavEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.color = "oklch(0.85 0.115 207)";
  };
  const handleNavLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.color = "oklch(0.72 0.030 220)";
  };

  const isSubmitDisabled = !input.trim() || isLoading;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.5 }}
      className={`relative min-h-screen flex flex-col transition-all duration-1000${
        mourningMode ? " grayscale" : ""
      }${mourningMode ? " mourning" : ""}`}
      data-ocid="landing.page"
    >
      {/* Blind Spot flash message */}
      <AnimatePresence>
        {blindSpotFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
          >
            <span
              className="font-cinzel tracking-[0.25em]"
              style={{
                fontSize: "0.75rem",
                color: "oklch(0.72 0.030 220 / 0.5)",
              }}
            >
              kendi s\u00f6zlerini kaybettin
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Last word ghost in background */}
      {lastWord && (
        <div
          aria-hidden="true"
          className="fixed pointer-events-none select-none font-cinzel"
          style={{
            top: "35%",
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: "clamp(4rem, 12vw, 8rem)",
            opacity: 0.018,
            color: "oklch(0.85 0.115 207 / 0.4)",
            whiteSpace: "nowrap",
            zIndex: 0,
            letterSpacing: "0.06em",
          }}
        >
          {lastWord}
        </div>
      )}

      <SilenceMoment isSilent={isSilent} />

      {/* Header */}
      <header className="relative z-10 px-6 py-5 flex items-center justify-between">
        <div className="animate-glow-pulse">
          <span
            className="font-cinzel text-2xl tracking-[0.25em] font-bold"
            style={{
              color: "oklch(0.85 0.115 207)",
              textShadow: "0 0 20px oklch(0.85 0.115 207 / 0.5)",
            }}
          >
            ECHO
          </span>
        </div>
        <nav
          className="hidden md:flex items-center gap-6"
          aria-label="Main navigation"
        >
          {["EXPERIENCE", "MY PULSES", "INSIGHTS"].map((label) => (
            <button
              type="button"
              key={label}
              className="font-cinzel text-xs tracking-[0.2em] transition-colors duration-200"
              style={{ color: "oklch(0.72 0.030 220)" }}
              onMouseEnter={handleNavEnter}
              onMouseLeave={handleNavLeave}
              data-ocid={`nav.${label.toLowerCase().replace(" ", "_")}.link`}
            >
              {label}
            </button>
          ))}
          {/* Frequency Code Badge */}
          <span
            className="font-mono tracking-widest transition-opacity duration-300"
            style={{
              fontSize: "0.6rem",
              color: "oklch(0.65 0.060 207)",
              opacity: 0.4,
              cursor: "default",
            }}
            title="Frekans Kodunuz"
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "0.7";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "0.4";
            }}
          >
            {frequencyCode}
          </span>
          <button
            type="button"
            onClick={handleToggleBlindSpotClick}
            className="font-cinzel text-xs tracking-widest transition-all duration-300"
            style={{
              color: blindSpot
                ? "oklch(0.88 0.012 220)"
                : "oklch(0.55 0.020 220 / 0.5)",
              textShadow: blindSpot
                ? "0 0 8px oklch(0.88 0.012 220 / 0.5)"
                : "none",
            }}
            data-ocid="blind_spot.toggle"
            aria-label="Toggle blind spot mode"
          >
            \u25c9 K\u00d6R NOKTA
          </button>
          <button
            type="button"
            onClick={onToggleMourning}
            className="font-cinzel text-xs tracking-widest transition-all duration-300"
            style={{
              color: mourningMode
                ? "oklch(0.88 0.012 220)"
                : "oklch(0.55 0.020 220 / 0.5)",
              textShadow: mourningMode
                ? "0 0 8px oklch(0.88 0.012 220 / 0.5)"
                : "none",
            }}
            data-ocid="mourning.toggle"
            aria-label="Toggle mourning mode"
          >
            \u25d0 YAS
          </button>
          <AudioToggle isPlaying={isPlaying} onToggle={onToggleAudio} />
        </nav>
        {/* Mobile controls */}
        <div className="md:hidden flex items-center gap-3">
          <span
            className="font-mono tracking-widest"
            style={{
              fontSize: "0.55rem",
              color: "oklch(0.65 0.060 207 / 0.4)",
            }}
          >
            {frequencyCode}
          </span>
          <button
            type="button"
            onClick={handleToggleBlindSpotClick}
            className="font-cinzel text-xs tracking-widest transition-all duration-300"
            style={{
              color: blindSpot
                ? "oklch(0.88 0.012 220)"
                : "oklch(0.55 0.020 220 / 0.5)",
            }}
            data-ocid="blind_spot.toggle"
            aria-label="Toggle blind spot mode"
          >
            \u25c9
          </button>
          <button
            type="button"
            onClick={onToggleMourning}
            className="font-cinzel text-xs tracking-widest transition-all duration-300"
            style={{
              color: mourningMode
                ? "oklch(0.88 0.012 220)"
                : "oklch(0.55 0.020 220 / 0.5)",
            }}
            data-ocid="mourning.toggle"
            aria-label="Toggle mourning mode"
          >
            \u25d0
          </button>
          <AudioToggle isPlaying={isPlaying} onToggle={onToggleAudio} />
        </div>
      </header>

      {/* Glow divider */}
      <div className="glow-divider" />

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center max-w-3xl mx-auto"
        >
          <h1
            className="font-cinzel font-bold tracking-[0.15em] mb-4 animate-glow-pulse"
            style={{
              fontSize: "clamp(2.5rem, 8vw, 4.5rem)",
              color: "oklch(0.97 0.012 220)",
              textShadow: "0 0 40px oklch(0.85 0.115 207 / 0.3)",
              lineHeight: 1.1,
            }}
          >
            SEND A PULSE.
            <br />
            <span style={{ color: "oklch(0.85 0.115 207)" }}>
              FEEL THE ECHO.
            </span>
          </h1>

          <p
            className="text-sm tracking-widest mb-16"
            style={{ color: "oklch(0.72 0.030 220)" }}
          >
            ANONYMOUS \u00b7 EPHEMERAL \u00b7 RESONANT
          </p>

          {/* Input */}
          <div className="relative max-w-2xl mx-auto">
            <div
              className="glass-card rounded-2xl p-1 transition-all duration-500"
              style={{
                boxShadow: focused
                  ? "0 0 0 1px oklch(0.85 0.115 207 / 0.5), 0 0 40px oklch(0.85 0.115 207 / 0.15)"
                  : "0 0 0 1px oklch(0.32 0.040 222)",
              }}
            >
              {/* Textarea with ghost typing below */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onKeyDown={handleKeyDown}
                  placeholder="I am feeling\u2026"
                  rows={3}
                  className="w-full bg-transparent resize-none px-5 py-4 text-base outline-none placeholder:text-muted-foreground/50"
                  style={{
                    color: "oklch(0.97 0.012 220)",
                    fontSize: "1.05rem",
                  }}
                  aria-label="Enter your pulse"
                  data-ocid="pulse.input"
                />
                <GhostTyping ghostText={ghostText} isVisible={ghostVisible} />
              </div>

              {/* Shadow Message Toggle */}
              <div className="px-5 pb-2">
                <div
                  className="border-t"
                  style={{ borderColor: "oklch(0.25 0.030 222 / 0.4)" }}
                />
                <button
                  type="button"
                  onClick={handleShadowToggle}
                  className="mt-2 text-xs tracking-[0.25em] transition-all duration-300"
                  style={{
                    color: shadowOpen
                      ? "oklch(0.72 0.030 220 / 0.8)"
                      : "oklch(0.45 0.020 222 / 0.5)",
                    fontFamily: "inherit",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    letterSpacing: "0.22em",
                  }}
                  aria-label="Leave a shadow message"
                  data-ocid="shadow.toggle"
                >
                  \u2726 bir g\u00f6lge b\u0131rak
                </button>

                <AnimatePresence>
                  {shadowOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.35, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <input
                        ref={shadowInputRef}
                        type="text"
                        value={shadowInput}
                        onChange={(e) => setShadowInput(e.target.value)}
                        onFocus={() => setShadowFocused(true)}
                        onBlur={() => setShadowFocused(false)}
                        placeholder="i\u00e7inde ger\u00e7ek olan bir \u015fey\u2026"
                        className="w-full bg-transparent outline-none text-xs py-2 mt-1 placeholder:italic"
                        style={{
                          color: "oklch(0.80 0.018 220 / 0.85)",
                          borderBottom: `1px solid ${
                            shadowFocused
                              ? "oklch(0.85 0.115 207 / 0.3)"
                              : "oklch(0.28 0.030 222 / 0.4)"
                          }`,
                          transition: "border-color 0.3s",
                          letterSpacing: "0.04em",
                        }}
                        maxLength={120}
                        aria-label="Shadow message input"
                        data-ocid="shadow.input"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-between px-4 pb-3 mt-1">
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs"
                    style={{ color: "oklch(0.72 0.030 220 / 0.5)" }}
                  >
                    SHIFT+ENTER for new line
                  </span>
                  {/* Sound Echo mic button */}
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={recording}
                    className="flex items-center gap-1 transition-all duration-300 disabled:cursor-not-allowed"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: recording ? "not-allowed" : "pointer",
                      color: recording
                        ? "oklch(0.70 0.18 27 / 0.8)"
                        : recorded
                          ? "oklch(0.65 0.060 207 / 0.7)"
                          : "oklch(0.45 0.020 222 / 0.4)",
                    }}
                    title="Ses yank\u0131s\u0131 g\u00f6nder"
                    data-ocid="sound_echo.upload_button"
                    aria-label="Record sound echo"
                  >
                    {recording ? (
                      <span className="flex items-center gap-1">
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
                          style={{ background: "oklch(0.70 0.18 27)" }}
                        />
                        <span
                          style={{
                            fontSize: "0.55rem",
                            fontFamily: "monospace",
                          }}
                        >
                          {countdown}
                        </span>
                      </span>
                    ) : recorded ? (
                      <span
                        style={{ fontSize: "0.55rem", letterSpacing: "0.1em" }}
                      >
                        ses kaydedildi \u2713
                      </span>
                    ) : (
                      <Mic size={12} />
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {/* Loading / connecting indicator */}
                  <AnimatePresence>
                    {isLoading && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        className="font-cinzel text-xs tracking-[0.18em] animate-pulse"
                        style={{ color: "oklch(0.65 0.060 207 / 0.7)" }}
                      >
                        ba\u011flan\u0131yor\u2026
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitDisabled}
                    className="flex items-center gap-2 font-cinzel text-xs tracking-[0.2em] px-5 py-2.5 rounded-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: !isSubmitDisabled
                        ? "linear-gradient(135deg, oklch(0.25 0.040 222), oklch(0.20 0.035 220))"
                        : "oklch(0.20 0.030 222)",
                      border: "1px solid oklch(0.85 0.115 207 / 0.3)",
                      color: "oklch(0.85 0.115 207)",
                      boxShadow: !isSubmitDisabled
                        ? "0 0 16px oklch(0.85 0.115 207 / 0.2)"
                        : "none",
                    }}
                    data-ocid="pulse.submit_button"
                  >
                    <Waves size={14} />
                    SYNC PULSE
                  </button>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 text-xs tracking-wider text-center"
                style={{ color: "oklch(0.70 0.18 27)" }}
                data-ocid="pulse.error_state"
              >
                {error}
              </motion.p>
            )}
          </div>
        </motion.div>

        {/* Process steps */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full mx-auto"
        >
          {PROCESS_STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 + i * 0.15 }}
              className="glass-card rounded-2xl p-7 text-center"
              style={{ borderColor: "oklch(0.32 0.040 222)" }}
              data-ocid={`step.item.${i + 1}`}
            >
              <div
                className="font-cinzel text-3xl font-bold mb-3"
                style={{ color: "oklch(0.85 0.115 207 / 0.3)" }}
              >
                {step.num}
              </div>
              <div
                className="font-cinzel text-sm tracking-[0.25em] mb-3"
                style={{ color: "oklch(0.85 0.115 207)" }}
              >
                {step.title}
              </div>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "oklch(0.72 0.030 220)" }}
              >
                {step.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Echo Veil entry */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="mt-10 flex flex-col items-center gap-3"
        >
          <button
            type="button"
            onClick={onOpenEchoVeil}
            className="font-cinzel text-xs tracking-[0.3em] px-8 py-3 transition-all duration-300 group"
            style={{
              border: "1px solid oklch(0.85 0.115 207 / 0.2)",
              color: "oklch(0.65 0.060 207 / 0.7)",
              background: "oklch(0.08 0.015 222 / 0.4)",
              letterSpacing: "0.3em",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "oklch(0.85 0.115 207 / 0.5)";
              e.currentTarget.style.color = "oklch(0.85 0.115 207)";
              e.currentTarget.style.boxShadow =
                "0 0 20px oklch(0.85 0.115 207 / 0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "oklch(0.85 0.115 207 / 0.2)";
              e.currentTarget.style.color = "oklch(0.65 0.060 207 / 0.7)";
              e.currentTarget.style.boxShadow = "none";
            }}
            data-ocid="echo_veil.open_modal_button"
            aria-label="Open Echo Veil secure channel"
          >
            \u25c8 ECHO VEIL
          </button>
          <p
            className="font-mono text-center"
            style={{
              fontSize: "0.58rem",
              color: "oklch(0.35 0.018 222 / 0.6)",
              letterSpacing: "0.08em",
            }}
          >
            anonymous \u00b7 ephemeral \u00b7 untraceable
          </p>
        </motion.div>

        {/* Dark Poll */}
        <DarkPoll />

        {/* Collective Memory */}
        <CollectiveMemory history={history} />
      </main>

      {/* Collective Wave */}
      <CollectiveWave />

      {/* Footer */}
      <footer className="relative z-10 py-6 px-6 text-center">
        <div className="glow-divider mb-6" />
        {/* Last Word Prompt */}
        <div className="mb-4">
          <LastWordPrompt />
        </div>
        <p
          className="text-xs tracking-wider"
          style={{ color: "oklch(0.72 0.030 220 / 0.5)" }}
        >
          \u00a9 {new Date().getFullYear()}. Built with{" "}
          <span style={{ color: "oklch(0.85 0.115 207 / 0.7)" }}>\u2665</span>{" "}
          using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors duration-200 hover:text-primary"
            style={{ color: "oklch(0.72 0.030 220 / 0.7)" }}
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </motion.div>
  );
}
