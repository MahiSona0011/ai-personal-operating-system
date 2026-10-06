"use client";
import { useState } from "react";
import { LIFE_AREAS } from "@/types";
import { goalsApi } from "@/lib/api/goals";

interface FirstGoalProps {
  onNext: () => void;
  onBack: () => void;
}

export default function FirstGoal({ onNext, onBack }: FirstGoalProps) {
  const [title, setTitle] = useState("");
  const [areaId, setAreaId] = useState<number>(LIFE_AREAS[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!title.trim()) return;
    setLoading(true);
    setError("");
    try {
      await goalsApi.create({ life_area_id: areaId, title: title.trim() });
      onNext();
    } catch {
      setError("Failed to create goal. You can add goals later from the Goals page.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-sm">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-foreground">Set your first goal</h2>
        <p className="text-sm text-fg-secondary">
          What&apos;s one thing you want to achieve? You can add more goals later.
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
          <label className="text-sm font-medium text-foreground">Goal title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Run a 5K by end of month"
            maxLength={120}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
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
          {loading ? "Saving…" : "Add goal"}
        </button>
      </div>
    </div>
  );
}
