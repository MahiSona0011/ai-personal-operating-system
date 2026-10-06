"use client";
import { useState } from "react";
import { LIFE_AREAS } from "@/types";

const ICONS: Record<string, string> = {
  heart: "❤️",
  brain: "🧠",
  users: "👥",
  briefcase: "💼",
  wallet: "💰",
  sprout: "🌱",
};

interface LifeAreasProps {
  onNext: (priorities: number[]) => void;
  onBack: () => void;
}

export default function LifeAreas({ onNext, onBack }: LifeAreasProps) {
  const [selected, setSelected] = useState<Set<number>>(
    new Set(LIFE_AREAS.map((a) => a.id))
  );

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-sm">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-foreground">Choose your focus areas</h2>
        <p className="text-sm text-fg-secondary">
          Select the life areas you want to track. You can adjust these anytime.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {LIFE_AREAS.map((area) => {
          const active = selected.has(area.id);
          return (
            <button
              key={area.id}
              onClick={() => toggle(area.id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${
                active
                  ? "border-accent bg-accent/[0.08]"
                  : "border-border bg-surface opacity-60"
              }`}
            >
              <span className="text-lg">{ICONS[area.icon]}</span>
              <span className={`text-sm font-medium ${active ? "text-foreground" : "text-fg-muted"}`}>
                {area.name}
              </span>
              {active && (
                <span className="ml-auto text-accent-fg text-xs">✓</span>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-fg-muted text-center">
        {selected.size} of {LIFE_AREAS.length} areas selected
      </p>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-2.5 rounded-xl border border-border text-fg-secondary font-medium hover:bg-surface transition-colors"
        >
          Back
        </button>
        <button
          onClick={() => onNext(Array.from(selected))}
          disabled={selected.size === 0}
          className="flex-1 py-2.5 rounded-xl bg-accent-solid text-accent-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
