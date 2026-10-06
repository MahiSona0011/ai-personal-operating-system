"use client";
import { useState } from "react";
import { LIFE_AREAS } from "@/types";
import { habitsApi } from "@/lib/api/habits";

const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Weekly" },
];

interface FirstHabitProps {
  onNext: () => void;
  onBack: () => void;
}

export default function FirstHabit({ onNext, onBack }: FirstHabitProps) {
  const [title, setTitle] = useState("");
  const [areaId, setAreaId] = useState<number>(LIFE_AREAS[0].id);
  const [frequency, setFrequency] = useState("daily");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!title.trim()) return;
    setLoading(true);
    setError("");
    try {
      await habitsApi.create({ life_area_id: areaId, title: title.trim(), frequency });
      onNext();
    } catch {
      setError("Failed to create habit. You can add habits later from the Habits page.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-sm">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-foreground">Build your first habit</h2>
        <p className="text-sm text-fg-secondary">
          Start with one small habit. Consistency beats intensity.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Life area</label>
          <div className="grid grid-cols-4 gap-1.5">
            {LIFE_AREAS.map((area) => (
              <button
                key={area.id}
                onClick={() => setAreaId(area.id)}
                className={`py-1.5 px-1 rounded-lg text-xs font-medium border transition-all ${
                  areaId === area.id
                    ? "border-accent bg-accent/10 text-foreground"
                    : "border-border text-fg-muted hover:border-border-strong"
                }`}
              >
                {area.name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Habit</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Read for 20 minutes"
            maxLength={120}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Frequency</label>
          <div className="flex gap-2">
            {FREQUENCIES.map((f) => (
              <button
                key={f.value}
                onClick={() => setFrequency(f.value)}
                className={`flex-1 py-2 rounded-lg text-sm border transition-all ${
                  frequency === f.value
                    ? "border-accent bg-accent/10 text-foreground font-medium"
                    : "border-border text-fg-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-destructive-fg">{error}</p>}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-2.5 rounded-xl border border-border text-fg-secondary font-medium hover:bg-surface transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="py-2.5 px-4 rounded-xl border border-border text-fg-muted text-sm hover:bg-surface transition-colors"
        >
          Skip
        </button>
        <button
          onClick={handleCreate}
          disabled={!title.trim() || loading}
          className="flex-1 py-2.5 rounded-xl bg-accent-solid text-accent-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {loading ? "Saving…" : "Add habit"}
        </button>
      </div>
    </div>
  );
}
