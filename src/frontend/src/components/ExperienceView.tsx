import { ArrowLeft } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { HistoryEntry, ParsedExperience } from "../App";
import { useCurse } from "../hooks/useCurse";
import { useDelayedEcho } from "../hooks/useDelayedEcho";
import { useLastWord } from "../hooks/useLastWord";
import { useShadowMessage } from "../hooks/useShadowMessage";
import AudioToggle from "./AudioToggle";
import BrokenText from "./BrokenText";
import CollectiveWave from "./CollectiveWave";
import CurseEffect from "./CurseEffect";
import DelayedEcho from "./DelayedEcho";
import EmotionMap from "./EmotionMap";
import FrequencySignal from "./FrequencySignal";
import PulseChain from "./PulseChain";
import PulseDuel from "./PulseDuel";
import ShadowReveal from "./ShadowReveal";
import SoundEchoNotification from "./SoundEchoNotification";
import TimeCapsuleLock from "./TimeCapsuleLock";

interface ExperienceActor {
  create_channel(code: string): Promise<boolean>;
}

interface ExperienceViewProps {
  experience: ParsedExperience;
  onChoice: (choice: string) => void;
  onBack: () => void;
  isPlaying?: boolean;
  onToggleAudio?: () => void;
  history: HistoryEntry[];
  currentPulse: string;
  mourningMode: boolean;
  onToggleMourning: () => void;
  frequencyCode: string;
  onFrequencyConnect: () => void;
  shareLink: string;
  actor: ExperienceActor | null;
  rawCode: string;
  blindSpot: boolean;
  onToggleBlindSpot: () => void;
}

const CHOICE_ICONS = ["\u2191", "\u27f3", "\u25ce"];
const CHOICE_LABELS = ["INTENSITY", "TIME", "PERSPECTIVE"];

const nearbyRegex =
  /(someone nearby|nearby|close|approaching|almost here|within reach|just missed|footsteps)/gi;

function highlightNearby(text: string) {
  const parts = text.split(nearbyRegex);
  return parts.map((part, i) => {
    const key = `${part.slice(0, 8)}-${i}`;
    return nearbyRegex.test(part) ? (
      <span
        key={key}
        className="nearby-text"
        style={{ color: "oklch(0.92 0.08 55)" }}
      >
        {part}
      </span>
    ) : (
      <span key={key}>{part}</span>
    );
  });
}

function handleChoiceBtnEnter(e: React.MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.borderColor = "oklch(0.85 0.115 207 / 0.4)";
  e.currentTarget.style.boxShadow = "0 0 24px oklch(0.85 0.115 207 / 0.15)";
}
function handleChoiceBtnLeave(e: React.MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.borderColor = "oklch(0.32 0.040 222)";
  e.currentTarget.style.boxShadow = "none";
}
function handleLinkEnter(e: React.MouseEvent<HTMLAnchorElement>) {
  e.currentTarget.style.color = "oklch(0.85 0.115 207)";
}
function handleLinkLeave(e: React.MouseEvent<HTMLAnchorElement>) {
  e.currentTarget.style.color = "oklch(0.72 0.030 220 / 0.7)";
}
function handleBackEnter(e: React.MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.color = "oklch(0.85 0.115 207)";
}
function handleBackLeave(e: React.MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.color = "oklch(0.72 0.030 220)";
}

function useFadeThreshold() {
  const [elapsed, setElapsed] = useState(0);
  const mountRef = useRef(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - mountRef.current) / 1000));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const contentOpacity = useMemo(() => {
    if (elapsed < 30) return 1.0 - (elapsed / 30) * 0.2;
    if (elapsed < 60) return 0.8 - ((elapsed - 30) / 30) * 0.15;
    return 0.65;
  }, [elapsed]);

  return contentOpacity;
}

export default function ExperienceView({
  experience,
  onChoice,
  onBack,
  isPlaying = false,
  onToggleAudio = () => {},
  history,
  currentPulse,
  mourningMode,
  onToggleMourning,
  frequencyCode,
  onFrequencyConnect,
  shareLink,
  actor,
  rawCode,
  blindSpot,
  onToggleBlindSpot,
}: ExperienceViewProps) {
  const choiceLabels = experience.choices.map((c, i) => ({
    icon: CHOICE_ICONS[i] ?? "\u00b7",
    label: CHOICE_LABELS[i] ?? c.toUpperCase(),
    raw: c,
  }));

  const { echoLine, isVisible } = useDelayedEcho(currentPulse, experience);
  const contentOpacity = useFadeThreshold();
  const { readNext } = useShadowMessage();
  const [shadowMessage, setShadowMessage] = useState<string | null>(null);
  const shadowTriggeredRef = useRef(false);
  const [blindSpotFlash, setBlindSpotFlash] = useState(false);

  const { isCursed, leaveCurse } = useCurse();
  const [curseActive, setCurseActive] = useState(isCursed);
  const [curseLeaveFeedback, setCurseLeaveFeedback] = useState(false);

  const { lastWord, clearLastWord } = useLastWord();
  const lastWordShownRef = useRef(false);
  const [showLastWord, setShowLastWord] = useState(!!lastWord);

  useEffect(() => {
    if (lastWord && !lastWordShownRef.current) {
      lastWordShownRef.current = true;
      setShowLastWord(true);
      return () => {
        clearLastWord();
      };
    }
  }, [lastWord, clearLastWord]);

  const brokenLines = useMemo(
    () => experience.dialogue.map((line) => line.length % 3 === 0),
    [experience.dialogue],
  );

  useEffect(() => {
    if (shadowTriggeredRef.current) return;
    shadowTriggeredRef.current = true;
    const delay = 15000 + Math.random() * 5000;
    const t = setTimeout(() => {
      const msg = readNext();
      if (msg) setShadowMessage(msg);
    }, delay);
    return () => clearTimeout(t);
  }, [readNext]);

  const handleShadowDismiss = () => {
    setShadowMessage(null);
  };

  const handleLeaveCurse = () => {
    leaveCurse();
    setCurseLeaveFeedback(true);
    setTimeout(() => setCurseLeaveFeedback(false), 2000);
  };

  const handleToggleBlindSpotClick = () => {
    if (!blindSpot) {
      setBlindSpotFlash(true);
      setTimeout(() => setBlindSpotFlash(false), 3000);
    }
    onToggleBlindSpot();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className={`relative min-h-screen flex flex-col transition-all duration-1000${mourningMode ? " grayscale mourning" : ""}`}
      data-ocid="experience.page"
    >
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

      {showLastWord && lastWord && (
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

      <AnimatePresence>
        {curseActive && (
          <CurseEffect key="curse" onDone={() => setCurseActive(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {shadowMessage && (
          <ShadowReveal
            message={shadowMessage}
            onDismiss={handleShadowDismiss}
          />
        )}
      </AnimatePresence>

      <DelayedEcho echoLine={echoLine} isVisible={isVisible} />
      <PulseDuel />
      <SoundEchoNotification />

      <header className="relative z-10 px-6 py-5 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 transition-all duration-200"
          style={{ color: "oklch(0.72 0.030 220)" }}
          onMouseEnter={handleBackEnter}
          onMouseLeave={handleBackLeave}
          aria-label="Return to input"
          data-ocid="experience.back_button"
        >
          <ArrowLeft size={16} />
          <span className="font-cinzel text-xs tracking-[0.2em]">RETURN</span>
        </button>

        <div className="flex items-center gap-3">
          <span
            className="font-mono tracking-widest transition-opacity duration-300 hidden sm:inline"
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
          <div className="animate-glow-pulse">
            <span
              className="font-cinzel text-xl tracking-[0.25em] font-bold"
              style={{
                color: "oklch(0.85 0.115 207)",
                textShadow: "0 0 20px oklch(0.85 0.115 207 / 0.5)",
              }}
            >
              ECHO
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <EmotionMap history={history} currentPulse={currentPulse} />
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
        </div>
      </header>

      <div className="glow-divider" />

      <main
        className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12"
        style={{
          opacity: contentOpacity,
          transition: "opacity 3s ease-in-out",
        }}
      >
        <div className="max-w-2xl w-full mx-auto space-y-12">
          {experience.world && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-center"
              data-ocid="experience.world.section"
            >
              <div
                className="font-cinzel text-xs tracking-[0.35em] mb-4"
                style={{ color: "oklch(0.85 0.115 207 / 0.5)" }}
              >
                \u25c8 WORLD \u25c8
              </div>
              <p
                className="text-base italic leading-relaxed"
                style={{ color: "oklch(0.72 0.030 220)" }}
              >
                {highlightNearby(experience.world)}
              </p>
            </motion.div>
          )}

          {experience.dialogue.length > 0 && (
            <div className="space-y-5" data-ocid="experience.dialogue.section">
              <div
                className="text-center font-cinzel text-xs tracking-[0.35em]"
                style={{ color: "oklch(0.85 0.115 207 / 0.5)" }}
              >
                \u25c8 VOICES \u25c8
              </div>
              {experience.dialogue.map((line, i) => (
                <motion.div
                  key={`dialogue-${line.slice(0, 12)}`}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20, y: 8 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{
                    duration: 0.7,
                    delay: 0.3 + i * 0.25,
                    ease: "easeOut",
                  }}
                  className="animate-breathe"
                  style={{ animationDelay: `${i * 0.8}s` }}
                  data-ocid={`experience.dialogue.item.${i + 1}`}
                >
                  <div
                    className="glass-card rounded-2xl px-7 py-5 text-center"
                    style={{
                      background: "oklch(0.10 0.020 222 / 0.75)",
                      borderColor: "oklch(0.28 0.038 222 / 0.6)",
                      marginLeft: i % 2 === 0 ? "0" : "auto",
                      marginRight: i % 2 === 0 ? "auto" : "0",
                      maxWidth: "85%",
                    }}
                  >
                    <p
                      className="text-base leading-relaxed"
                      style={{
                        color: "oklch(0.93 0.015 220)",
                        fontStyle: "italic",
                        textShadow: "0 0 20px oklch(0.85 0.115 207 / 0.08)",
                      }}
                    >
                      {brokenLines[i] ? (
                        <BrokenText text={line} broken />
                      ) : (
                        highlightNearby(line)
                      )}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            data-ocid="experience.choice.section"
          >
            <div
              className="text-center font-cinzel text-xs tracking-[0.35em] mb-6"
              style={{ color: "oklch(0.85 0.115 207 / 0.5)" }}
            >
              \u25c8 CHOOSE \u25c8
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {choiceLabels.map((choice, i) => (
                <motion.button
                  type="button"
                  key={choice.label}
                  onClick={() => onChoice(choice.raw)}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="glass-card rounded-2xl px-5 py-6 flex flex-col items-center gap-3 transition-all duration-300"
                  style={{ borderColor: "oklch(0.32 0.040 222)" }}
                  onMouseEnter={handleChoiceBtnEnter}
                  onMouseLeave={handleChoiceBtnLeave}
                  aria-label={`Choice: ${choice.label}`}
                  data-ocid={`experience.choice.button.${i + 1}`}
                >
                  <span
                    className="text-2xl"
                    style={{
                      color: "oklch(0.85 0.115 207)",
                      textShadow: "0 0 16px oklch(0.85 0.115 207 / 0.6)",
                    }}
                  >
                    {choice.icon}
                  </span>
                  <span
                    className="font-cinzel text-xs tracking-[0.25em]"
                    style={{ color: "oklch(0.85 0.115 207)" }}
                  >
                    {choice.label}
                  </span>
                  <span
                    className="text-xs text-center leading-relaxed hidden sm:block"
                    style={{
                      color: "oklch(0.72 0.030 220 / 0.7)",
                      fontSize: "0.65rem",
                    }}
                  >
                    {choice.raw.length > 50
                      ? `${choice.raw.slice(0, 47)}\u2026`
                      : choice.raw}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.2 }}
          >
            <FrequencySignal
              onConnected={onFrequencyConnect}
              mourningMode={mourningMode}
              actor={actor}
              rawCode={rawCode}
              shareLink={shareLink}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.35 }}
          >
            <TimeCapsuleLock pulse={currentPulse} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.5 }}
            className="text-center"
          >
            <AnimatePresence mode="wait">
              {curseLeaveFeedback ? (
                <motion.span
                  key="feedback"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="font-cinzel tracking-widest"
                  style={{ fontSize: "0.6rem", color: "oklch(0.65 0.15 20)" }}
                >
                  lanet b\u0131rak\u0131ld\u0131.
                </motion.span>
              ) : (
                <motion.button
                  key="curse-btn"
                  type="button"
                  onClick={handleLeaveCurse}
                  className="font-cinzel tracking-widest transition-all duration-300"
                  style={{
                    fontSize: "0.6rem",
                    color: "oklch(0.55 0.15 20 / 0.4)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    opacity: 0.3,
                    letterSpacing: "0.22em",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.opacity = "0.6";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.opacity = "0.3";
                  }}
                  data-ocid="experience.curse.button"
                >
                  \u25c6 lanet b\u0131rak
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>

      <PulseChain history={history} currentPulse={currentPulse} />
      <CollectiveWave />

      <footer className="relative z-10 py-6 px-6 text-center">
        <div className="glow-divider mb-6" />
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
            className="transition-colors duration-200"
            style={{ color: "oklch(0.72 0.030 220 / 0.7)" }}
            onMouseEnter={handleLinkEnter}
            onMouseLeave={handleLinkLeave}
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </motion.div>
  );
}
