interface WelcomeProps {
  name: string;
  onNext: () => void;
}

export default function Welcome({ name, onNext }: WelcomeProps) {
  const firstName = name.split(" ")[0];
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div className="w-20 h-20 rounded-full bg-accent/15 flex items-center justify-center text-4xl">
        👋
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          Welcome, {firstName}!
        </h1>
        <p className="text-fg-secondary max-w-sm">
          Let&apos;s spend 2 minutes setting up your Selfstack. You can always change these later.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-4 w-full max-w-sm mt-2">
        {[
          { emoji: "🎯", label: "Track Goals" },
          { emoji: "🔥", label: "Build Habits" },
          { emoji: "🤖", label: "AI Coaching" },
        ].map(({ emoji, label }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-2 p-3 rounded-xl bg-surface border border-border"
          >
            <span className="text-2xl">{emoji}</span>
            <span className="text-xs text-fg-secondary font-medium">{label}</span>
          </div>
        ))}
      </div>
      <button
        onClick={onNext}
        className="mt-4 px-8 py-3 rounded-xl bg-accent-solid text-accent-foreground font-semibold hover:opacity-90 transition-opacity"
      >
        Let&apos;s get started
      </button>
    </div>
  );
}
