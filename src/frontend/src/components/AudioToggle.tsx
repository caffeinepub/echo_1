import { Volume2, VolumeX } from "lucide-react";

interface AudioToggleProps {
  isPlaying: boolean;
  onToggle: () => void;
}

export default function AudioToggle({ isPlaying, onToggle }: AudioToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isPlaying ? "Mute ambient sound" : "Unmute ambient sound"}
      title={isPlaying ? "Ambient: on" : "Ambient: off"}
      data-ocid="audio.toggle"
      className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200"
      style={{
        color: isPlaying ? "oklch(0.85 0.115 207)" : "oklch(0.72 0.030 220)",
        background: isPlaying ? "oklch(0.85 0.115 207 / 0.08)" : "transparent",
        border: `1px solid ${isPlaying ? "oklch(0.85 0.115 207 / 0.25)" : "oklch(0.32 0.040 222 / 0.5)"}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "oklch(0.85 0.115 207)";
        e.currentTarget.style.background = "oklch(0.85 0.115 207 / 0.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = isPlaying
          ? "oklch(0.85 0.115 207)"
          : "oklch(0.72 0.030 220)";
        e.currentTarget.style.background = isPlaying
          ? "oklch(0.85 0.115 207 / 0.08)"
          : "transparent";
      }}
    >
      {isPlaying ? <Volume2 size={15} /> : <VolumeX size={15} />}
    </button>
  );
}
