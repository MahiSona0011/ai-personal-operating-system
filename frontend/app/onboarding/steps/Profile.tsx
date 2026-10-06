"use client";
import { useState } from "react";

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Vancouver",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

interface ProfileProps {
  initialDisplayName: string;
  initialTimezone: string;
  onNext: (data: { display_name: string; timezone: string }) => void;
  onBack: () => void;
}

export default function Profile({ initialDisplayName, initialTimezone, onNext, onBack }: ProfileProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [timezone, setTimezone] = useState(initialTimezone || "UTC");

  return (
    <div className="flex flex-col gap-6 w-full max-w-sm">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-foreground">Set up your profile</h2>
        <p className="text-sm text-fg-secondary">How should we refer to you, and where are you?</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Display name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Mahi"
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <p className="text-xs text-fg-muted">Used in greetings and AI messages</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Timezone</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz.replace("_", " ")}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-3 mt-2">
        <button
          onClick={onBack}
          className="flex-1 py-2.5 rounded-xl border border-border text-fg-secondary font-medium hover:bg-surface transition-colors"
        >
          Back
        </button>
        <button
          onClick={() => onNext({ display_name: displayName, timezone })}
          className="flex-1 py-2.5 rounded-xl bg-accent-solid text-accent-foreground font-semibold hover:opacity-90 transition-opacity"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
