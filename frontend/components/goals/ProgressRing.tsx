"use client";
import { tokenColor } from "@/lib/utils/color";

interface ProgressRingProps {
  progress: number;   // 0–100
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  sublabel?: string;
}

export function ProgressRing({
  progress,
  size = 80,
  strokeWidth = 7,
  color = tokenColor("accent"),
  label,
  sublabel,
}: ProgressRingProps) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (Math.min(Math.max(progress, 0), 100) / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tokenColor("border")}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      {(label || sublabel) && (
        <div className="absolute flex flex-col items-center justify-center text-center leading-tight">
          {label && <span className="text-sm font-semibold text-foreground">{label}</span>}
          {sublabel && <span className="text-[10px] text-fg-secondary">{sublabel}</span>}
        </div>
      )}
    </div>
  );
}
