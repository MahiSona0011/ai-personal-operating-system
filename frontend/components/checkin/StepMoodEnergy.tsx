"use client";
import { Slider } from "@/components/ui/slider";
import { tokenColor } from "@/lib/utils/color";

interface StepMoodEnergyProps {
  mood: number;
  energy: number;
  onChange: (field: "mood" | "energy", value: number) => void;
}

const MOOD_LABELS: Record<number, string> = {
  1: "😞", 2: "😟", 3: "😕", 4: "😐", 5: "🙂",
  6: "😊", 7: "😄", 8: "😁", 9: "🤩", 10: "🥳",
};

const ENERGY_LABELS: Record<number, string> = {
  1: "😴", 2: "🥱", 3: "😩", 4: "😪", 5: "😐",
  6: "🙂", 7: "😊", 8: "💪", 9: "⚡", 10: "🔥",
};

function MoodEnergySlider({
  label,
  value,
  onChange,
  color,
  emojis,
  lowLabel,
  highLabel,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
  emojis: Record<number, string>;
  lowLabel: string;
  highLabel: string;
}) {
  return (
    <div className="space-y-3 p-4 rounded-lg bg-elevated/50 border border-border">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{emojis[value]}</span>
          <span className="text-lg font-bold tabular-nums w-6 text-right" style={{ color }}>
            {value}
          </span>
        </div>
      </div>
      <Slider value={value} onChange={onChange} min={1} max={10} color={color} />
      <div className="flex justify-between text-[10px] text-muted-foreground select-none">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

export function StepMoodEnergy({ mood, energy, onChange }: StepMoodEnergyProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        How are you feeling today? Be honest — this informs your AI coaching.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MoodEnergySlider
          label="Mood"
          value={mood}
          onChange={(v) => onChange("mood", v)}
          color={tokenColor("chart-mood")}
          emojis={MOOD_LABELS}
          lowLabel="Really low"
          highLabel="Fantastic"
        />
        <MoodEnergySlider
          label="Energy"
          value={energy}
          onChange={(v) => onChange("energy", v)}
          color={tokenColor("chart-energy")}
          emojis={ENERGY_LABELS}
          lowLabel="Exhausted"
          highLabel="Full power"
        />
      </div>
    </div>
  );
}
