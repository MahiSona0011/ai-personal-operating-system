interface StepIndicatorProps {
  total: number;
  current: number;
}

export default function StepIndicator({ total, current }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i < current
              ? "bg-accent w-6"
              : i === current
              ? "bg-accent w-8"
              : "bg-border w-2"
          }`}
        />
      ))}
    </div>
  );
}
