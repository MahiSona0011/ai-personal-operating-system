import { cn } from "@/lib/utils/cn";

interface SelectableCardProps {
  /** Accessible name for the select action, e.g. "Open entry from Tue, Oct 6". */
  label: string;
  selected?: boolean;
  onSelect: () => void;
  /** Icon buttons (edit, delete). They sit above the select button, so they never nest inside it. */
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/**
 * A list card you can select. The whole card is clickable through a transparent button stretched
 * over it (so there are no interactive elements nested in one another), and `actions` stay
 * independently focusable. Actions appear on hover and whenever focus is inside the card.
 */
export function SelectableCard({ label, selected, onSelect, actions, className, children }: SelectableCardProps) {
  return (
    <div
      className={cn(
        "group relative rounded-xl border transition-colors",
        selected ? "border-accent bg-accent/[0.06]" : "border-border bg-surface hover:border-accent/40",
        className
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-label={label}
        aria-pressed={selected}
        className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />
      <div className="pointer-events-none relative">{children}</div>
      {actions && (
        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          {actions}
        </div>
      )}
    </div>
  );
}
