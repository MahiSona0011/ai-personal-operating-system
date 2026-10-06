import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button, buttonVariants } from "@/components/ui/button";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick?: () => void; href?: string };
  /** Faded sketch of what the populated component will look like. */
  preview?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, preview, className }: EmptyStateProps) {
  return (
    <div className={cn("relative flex flex-col items-center gap-2 px-4 py-8 text-center", className)}>
      {preview && (
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-0 opacity-[0.15] [mask-image:linear-gradient(to_bottom,black,transparent)]">
          {preview}
        </div>
      )}
      {Icon && (
        <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-elevated text-fg-secondary">
          <Icon size={18} aria-hidden />
        </span>
      )}
      <p className="relative text-sm font-medium text-foreground">{title}</p>
      {description && <p className="relative max-w-sm text-xs text-fg-secondary">{description}</p>}
      {action &&
        (action.href ? (
          <Link href={action.href} className={cn(buttonVariants({ size: "sm" }), "relative mt-2")}>
            {action.label}
          </Link>
        ) : (
          <Button className="relative mt-2" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        ))}
    </div>
  );
}
