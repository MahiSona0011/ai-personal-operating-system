"use client";
import { cn } from "@/lib/utils/cn";

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  color?: string;
  className?: string;
  disabled?: boolean;
}

export function Slider({
  value,
  onChange,
  min = 1,
  max = 10,
  step = 1,
  color = "hsl(var(--accent))",
  className,
  disabled,
}: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn("relative flex items-center w-full", className)} style={{ height: 24 }}>
      {/* Track background */}
      <div className="relative w-full h-1.5 rounded-full bg-elevated">
        {/* Fill */}
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-[width] duration-75"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {/* Visual thumb */}
      <div
        className="absolute w-4 h-4 rounded-full pointer-events-none transition-[left] duration-75"
        style={{
          left: `calc(${pct}% - 8px)`,
          backgroundColor: color,
          boxShadow: `0 0 0 3px hsl(var(--bg-surface)), 0 1px 3px rgba(0,0,0,0.2)`,
        }}
      />
      {/* Native input — invisible, handles all interaction */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
    </div>
  );
}
