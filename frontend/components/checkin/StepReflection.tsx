"use client";
import { useState, KeyboardEvent } from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { tokenColor } from "@/lib/utils/color";

interface TagInputProps {
  label: string;
  description: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
  color: string;
}

function TagInput({ label, description, tags, onChange, placeholder, color }: TagInputProps) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput("");
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="min-h-[80px] p-3 rounded-lg bg-elevated/50 border border-border focus-within:border-accent/50 transition-colors space-y-2">
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(i)}
                  className="hover:opacity-70 transition-opacity"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
          />
          {input.trim() && (
            <button
              type="button"
              onClick={addTag}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus size={14} />
            </button>
          )}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Press <kbd className="px-1 py-0.5 rounded bg-elevated text-[9px]">Enter</kbd> to add
      </p>
    </div>
  );
}

interface StepReflectionProps {
  wins: string[];
  blockers: string[];
  actionPlan: string[];
  onChange: (field: "wins" | "blockers" | "actionPlan", tags: string[]) => void;
}

export function StepReflection({ wins, blockers, actionPlan, onChange }: StepReflectionProps) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Reflect on your day. These inputs feed directly into your AI analysis.
      </p>
      <TagInput
        label="Wins"
        description="What went well today? Celebrate progress, big or small."
        tags={wins}
        onChange={(tags) => onChange("wins", tags)}
        placeholder="Add a win..."
        color={tokenColor("success-fg")}
      />
      <TagInput
        label="Blockers"
        description="What held you back? Obstacles, distractions, or unfinished tasks."
        tags={blockers}
        onChange={(tags) => onChange("blockers", tags)}
        placeholder="Add a blocker..."
        color={tokenColor("destructive-fg")}
      />
      <TagInput
        label="Action Plan"
        description="What will you do tomorrow to move forward?"
        tags={actionPlan}
        onChange={(tags) => onChange("actionPlan", tags)}
        placeholder="Add an action..."
        color={tokenColor("accent-fg")}
      />
    </div>
  );
}
