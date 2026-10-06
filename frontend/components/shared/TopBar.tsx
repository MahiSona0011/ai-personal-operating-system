"use client";
import { useEffect, useState } from "react";
import { Sun, Moon, Menu, Search } from "lucide-react";
import { useTheme } from "next-themes";
import { format } from "date-fns";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { useCommandStore } from "@/store/commandStore";
import { Delta } from "@/components/ui/delta";
import { useDashboard } from "@/lib/hooks/useDashboard";
import { useSetThemePreference } from "@/lib/hooks/useThemePreference";

/** Date, Life Score with its change vs the previous 30 days, command palette, theme and account. */
export function TopBar() {
  const { data: dashboard } = useDashboard();
  const overallScore = dashboard?.life_score != null ? Number(dashboard.life_score.toFixed(1)) : null;
  const delta = dashboard?.life_score_delta;
  const { resolvedTheme } = useTheme();
  const setThemePreference = useSetThemePreference();
  // The saved theme is only known in the browser; render the toggle icon after mount so the
  // server HTML and the first client render agree (otherwise light-theme users get a hydration error).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = resolvedTheme === "dark";
  const user = useAuthStore((s) => s.user);
  const { toggleSidebar } = useUIStore();
  const openPalette = useCommandStore((s) => s.setOpen);

  return (
    <header className="h-14 flex items-center justify-between px-4 md:px-6 border-b border-border bg-surface/80 backdrop-blur-sm shrink-0">
      <div className="flex items-center gap-3">
        {/* Hamburger on mobile */}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md hover:bg-elevated text-fg-secondary md:hidden"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>

        <span className="text-sm text-fg-secondary hidden sm:block" suppressHydrationWarning>
          {format(new Date(), "EEEE, MMM d")}
        </span>
        <span className="text-xs text-fg-secondary sm:hidden" suppressHydrationWarning>
          {format(new Date(), "MMM d")}
        </span>

        {overallScore != null && (
          <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <span className="hidden sm:inline">Life Score:</span>
            <span className="tabular-nums">{overallScore}</span>
            {delta !== undefined && <Delta delta={delta} />}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={() => openPalette(true)}
          className="hidden sm:flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-fg-secondary transition-colors hover:border-border-strong hover:text-foreground"
        >
          <Search size={13} aria-hidden />
          <span>Search or jump to…</span>
          <kbd className="rounded border border-border bg-elevated px-1.5 py-0.5 font-sans text-[10px] text-fg-muted">⌘K</kbd>
        </button>
        <button
          onClick={() => openPalette(true)}
          className="sm:hidden p-2 rounded-md hover:bg-elevated text-fg-secondary transition-colors"
          aria-label="Open command palette"
        >
          <Search size={16} />
        </button>
        <button
          onClick={() => setThemePreference(isDark ? "light" : "dark")}
          className="p-2 rounded-md hover:bg-elevated text-fg-secondary transition-colors"
          aria-label="Toggle theme"
        >
          {!mounted ? <span className="block h-4 w-4" /> : isDark ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full overflow-hidden bg-accent/10 flex items-center justify-center text-xs font-semibold text-accent-fg shrink-0">
            {user?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              user?.display_name?.[0] ?? user?.full_name?.[0] ?? "?"
            )}
          </div>
          {user && (
            <span className="text-sm text-fg-secondary hidden sm:block">
              {user.display_name ?? user.full_name}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
