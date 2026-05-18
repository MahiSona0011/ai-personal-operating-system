import { cn } from "@/lib/utils/cn";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[hsl(var(--accent)/0.15)] text-[hsl(var(--accent))]",
        secondary: "bg-[hsl(var(--bg-elevated))] text-[hsl(var(--fg-secondary))]",
        destructive: "bg-[hsl(var(--destructive)/0.15)] text-[hsl(var(--destructive))]",
        success: "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]",
        outline: "border border-[hsl(var(--border))] text-[hsl(var(--fg-secondary))]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
