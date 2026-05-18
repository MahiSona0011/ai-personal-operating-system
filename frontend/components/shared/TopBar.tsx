"use client";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { format } from "date-fns";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils/cn";

interface TopBarProps {
  overallScore?: number | null;
  trend?: "up" | "down" | "stable";
}

export function TopBar({ overallScore, trend }: TopBarProps) {
  const { theme, setTheme } = useTheme();
  const user = useAuthStore((s) => s.user);

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-border bg-surface/80 backdrop-blur-sm shrink-0">
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMM d")}</span>
        {overallScore != null && (
          <div className={cn(
            "flex items-center gap-1 text-sm font-semibold",
            trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-foreground"
          )}>
            <span>Life Score: {overallScore}</span>
            {trend === "up" && <span>▲</span>}
            {trend === "down" && <span>▼</span>}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-md hover:bg-elevated text-muted-foreground transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full overflow-hidden bg-accent/20 flex items-center justify-center text-xs font-semibold text-accent shrink-0">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              user?.display_name?.[0] ?? user?.full_name?.[0] ?? "?"
            )}
          </div>
          {user && (
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user.display_name ?? user.full_name}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
