import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import DeadChannel from "./components/DeadChannel";
import EchoVeilOverlay from "./components/EchoVeilOverlay";
import ExperienceView from "./components/ExperienceView";
import FrequencyChannel from "./components/FrequencyChannel";
import JoinChannelView from "./components/JoinChannelView";
import LandingView from "./components/LandingView";
import LoadingView from "./components/LoadingView";
import SoulMatch from "./components/SoulMatch";
import TimeCapsuleReveal from "./components/TimeCapsuleReveal";
import { useActor } from "./hooks/useActor";
import { useAmbientAudio } from "./hooks/useAmbientAudio";
import { useDeadChannel } from "./hooks/useDeadChannel";
import { useFrequencyCode } from "./hooks/useFrequencyCode";
import { useShadowMessage } from "./hooks/useShadowMessage";
import { useSoulMatch } from "./hooks/useSoulMatch";

export type AppView = "landing" | "loading" | "experience";

export interface ParsedExperience {
  world: string;
  dialogue: string[];
  choices: string[];
  raw: string;
}

export interface HistoryEntry {
  pulse: string;
  experience: ParsedExperience;
}

function parseExperience(raw: string): ParsedExperience {
  const worldMatch = raw.match(
    /\[WORLD\]([\s\S]*?)(?=\[DIALOGUE\]|\[CHOICE\]|$)/,
  );
  const dialogueMatch = raw.match(/\[DIALOGUE\]([\s\S]*?)(?=\[CHOICE\]|$)/);
  const choiceMatch = raw.match(/\[CHOICE\]([\s\S]*)/);

  const world = worldMatch ? worldMatch[1].trim() : "";

  const dialogueBlock = dialogueMatch ? dialogueMatch[1].trim() : "";
  const dialogue = dialogueBlock
    .split("\n")
    .map((l) => l.replace(/^[-\u2013\u2014*\u2022]\s*/, "").trim())
    .filter(Boolean);

  const choiceBlock = choiceMatch ? choiceMatch[1].trim() : "";
  const choices = choiceBlock
    .split("\n")
    .map((l) => l.replace(/^[-\u2013\u2014*\u2022\d.]+\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);

  const finalChoices =
    choices.length >= 3
      ? choices
      : ["\u2191 INTENSITY", "\u27f3 TIME", "\u25ce PERSPECTIVE"];

  return { world, dialogue, choices: finalChoices, raw };
}

function getIncomingCodeFromUrl(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("c");
    return c ? decodeURIComponent(c) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const { actor, isFetching } = useActor();
  const [view, setView] = useState<AppView>("landing");
  const [pulse, setPulse] = useState("");
  const [experience, setExperience] = useState<ParsedExperience | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mourningMode, setMourningMode] = useState(false);
  const [blindSpot, setBlindSpot] = useState(false);
  const [showFrequencyChannel, setShowFrequencyChannel] = useState(false);
  const [frequencyChannelCode, setFrequencyChannelCode] = useState<
    string | null
  >(null);
  const [showEchoVeil, setShowEchoVeil] = useState(false);
  const [incomingCode] = useState<string | null>(() =>
    getIncomingCodeFromUrl(),
  );
  const [showJoinView, setShowJoinView] = useState<boolean>(
    () => !!getIncomingCodeFromUrl(),
  );
  const abortRef = useRef(false);
  const { isPlaying, toggle } = useAmbientAudio();
  const { add: addShadow } = useShadowMessage();
  const { code: frequencyCode, rawCode, shareLink } = useFrequencyCode();
  const { isDeadChannel, deadMessage } = useDeadChannel();
  const { isSoulMatch } = useSoulMatch(history.length);

  const handleToggleMourning = useCallback(() => {
    setMourningMode((prev) => !prev);
  }, []);

  const handleToggleBlindSpot = useCallback(() => {
    setBlindSpot((prev) => !prev);
  }, []);

  const sendPulse = useCallback(
    async (inputPulse: string) => {
      if (!actor || !inputPulse.trim()) return;
      abortRef.current = false;
      setError(null);
      setView("loading");

      try {
        const raw = await actor.generate_experience(inputPulse.trim());
        if (abortRef.current) return;
        const parsed = parseExperience(raw);
        setExperience(parsed);
        setHistory((prev) => [
          ...prev,
          { pulse: inputPulse.trim(), experience: parsed },
        ]);
        setView("experience");
      } catch {
        if (abortRef.current) return;
        setError("The signal was lost. Try again.");
        setView("landing");
      }
    },
    [actor],
  );

  const handleChoice = useCallback(
    (choice: string) => {
      const newPulse = `${pulse} \u2014 ${choice}`;
      setPulse(newPulse);
      sendPulse(newPulse);
    },
    [pulse, sendPulse],
  );

  const handleBack = useCallback(() => {
    abortRef.current = true;
    setView("landing");
    setExperience(null);
    setError(null);
  }, []);

  const handleSubmit = useCallback(
    (inputPulse: string, shadow?: string) => {
      if (shadow) {
        addShadow(shadow);
      }
      setPulse(inputPulse);
      sendPulse(inputPulse);
    },
    [sendPulse, addShadow],
  );

  const handleFrequencyConnect = useCallback(() => {
    setFrequencyChannelCode(rawCode);
    setShowFrequencyChannel(true);
  }, [rawCode]);

  const handleJoinConnect = useCallback((code: string) => {
    window.history.replaceState({}, "", "/");
    setShowJoinView(false);
    setFrequencyChannelCode(code);
    setShowFrequencyChannel(true);
  }, []);

  const handleJoinReject = useCallback(() => {
    setShowJoinView(false);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Nebula aurora background */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(160deg, oklch(0.11 0.022 222) 0%, oklch(0.08 0.018 230) 50%, oklch(0.10 0.025 215) 100%)",
          }}
        />
        <div
          className="animate-aurora absolute -top-1/4 -left-1/4 w-[80vw] h-[80vh] rounded-full opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at center, oklch(0.55 0.12 195 / 0.35) 0%, oklch(0.30 0.08 210 / 0.15) 50%, transparent 70%)",
          }}
        />
        <div
          className="animate-aurora-2 absolute top-1/4 -right-1/4 w-[70vw] h-[70vh] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at center, oklch(0.45 0.15 285 / 0.25) 0%, oklch(0.25 0.08 270 / 0.10) 50%, transparent 70%)",
          }}
        />
        <div
          className="animate-aurora absolute bottom-0 left-1/4 w-[60vw] h-[50vh] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at center, oklch(0.35 0.09 200 / 0.20) 0%, transparent 70%)",
          }}
        />
        <ParticleField />
      </div>

      {/* History echo (faint cosmetic) */}
      <AnimatePresence>
        {!blindSpot && view !== "landing" && history.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none overflow-hidden"
            aria-hidden="true"
          >
            {history.slice(-3).map((h, i) => (
              <div
                key={`echo-${h.pulse.slice(0, 10)}`}
                className="absolute font-cinzel tracking-widest"
                style={{
                  top: `${15 + i * 20}%`,
                  left: `${5 + i * 8}%`,
                  opacity: 0.04 + i * 0.02,
                  color: "oklch(0.85 0.115 207)",
                  transform: `rotate(${-2 + i * 1.5}deg)`,
                  fontSize: "0.6rem",
                  maxWidth: "30vw",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {h.pulse}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <AnimatePresence mode="wait">
        {view === "landing" && (
          <LandingView
            key="landing"
            onSubmit={handleSubmit}
            error={error}
            hasHistory={history.length > 0}
            isPlaying={isPlaying}
            onToggleAudio={toggle}
            history={history}
            mourningMode={mourningMode}
            onToggleMourning={handleToggleMourning}
            frequencyCode={frequencyCode}
            blindSpot={blindSpot}
            onToggleBlindSpot={handleToggleBlindSpot}
            isLoading={isFetching}
            onOpenEchoVeil={() => setShowEchoVeil(true)}
          />
        )}
        {view === "loading" && <LoadingView key="loading" />}
        {view === "experience" && experience && (
          <ExperienceView
            key="experience"
            experience={experience}
            onChoice={handleChoice}
            onBack={handleBack}
            isPlaying={isPlaying}
            onToggleAudio={toggle}
            history={history}
            currentPulse={pulse}
            mourningMode={mourningMode}
            onToggleMourning={handleToggleMourning}
            frequencyCode={frequencyCode}
            onFrequencyConnect={handleFrequencyConnect}
            shareLink={shareLink}
            actor={actor as any}
            rawCode={rawCode}
            blindSpot={blindSpot}
            onToggleBlindSpot={handleToggleBlindSpot}
          />
        )}
      </AnimatePresence>

      {/* Join Channel overlay (incoming link) */}
      <AnimatePresence>
        {showJoinView && incomingCode && (
          <JoinChannelView
            key="join"
            actor={actor as any}
            incomingCode={incomingCode}
            onConnect={handleJoinConnect}
            onReject={handleJoinReject}
          />
        )}
      </AnimatePresence>

      {/* Frequency Channel overlay */}
      <AnimatePresence>
        {showFrequencyChannel && (
          <FrequencyChannel
            key="freq-channel"
            onClose={() => setShowFrequencyChannel(false)}
            mourningMode={mourningMode}
            actor={actor as any}
            channelCode={frequencyChannelCode ?? rawCode}
          />
        )}
      </AnimatePresence>

      {/* Echo Veil overlay */}
      <AnimatePresence>
        {showEchoVeil && (
          <EchoVeilOverlay
            key="echo-veil"
            actor={actor as any}
            onClose={() => setShowEchoVeil(false)}
          />
        )}
      </AnimatePresence>

      {/* Soul Match overlay */}
      <AnimatePresence>
        {isSoulMatch && <SoulMatch key="soul-match" />}
      </AnimatePresence>

      {/* Dead Channel overlay */}
      <AnimatePresence>
        {isDeadChannel && (
          <DeadChannel key="dead-channel" message={deadMessage} />
        )}
      </AnimatePresence>

      {/* Time Capsule Reveal overlay */}
      <TimeCapsuleReveal />
    </div>
  );
}

function ParticleField() {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    left: `${(i * 5.5 + 3) % 100}%`,
    delay: `${(i * 0.7) % 8}s`,
    duration: `${10 + ((i * 1.3) % 12)}s`,
    size: 1 + (i % 3),
  }));

  return (
    <>
      {particles.map((p) => (
        <div
          key={`particle-${p.id}`}
          className="absolute bottom-0 rounded-full"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            background: "oklch(0.85 0.115 207 / 0.7)",
            animation: `particle-drift ${p.duration} ${p.delay} ease-in infinite`,
          }}
        />
      ))}
    </>
  );
}
