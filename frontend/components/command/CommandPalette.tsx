"use client";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { useTheme } from "next-themes";
import { BookOpen, CheckSquare, CircleDashed, Keyboard, Moon, Plus, ScrollText, Settings as SettingsIcon, Target, type LucideIcon } from "lucide-react";
import { NAV_ITEMS, type NavItem } from "@/components/shared/Sidebar";
import { useHabitsToday } from "@/lib/hooks/useDashboard";
import { useLogHabitToday } from "@/lib/hooks/useHabits";
import { useCommandStore } from "@/store/commandStore";

export interface PaletteItem {
  id: string;
  group: "Go to" | "Actions" | "Log a habit";
  label: string;
  icon: LucideIcon;
  /** Extra words the search also matches. */
  keywords?: string[];
  run: () => void;
}

/** Pages to jump to: everything in the sidebar, plus the pages the sidebar doesn't list. */
export function pageItems(go: (href: string) => void): PaletteItem[] {
  const fromNav = (NAV_ITEMS.filter(Boolean) as NavItem[]).map((n) => ({
    id: `go:${n.href}`,
    group: "Go to" as const,
    label: n.label,
    icon: n.icon,
    run: () => go(n.href),
  }));
  return [
    ...fromNav,
    { id: "go:/learning", group: "Go to", label: "Learning sessions", icon: BookOpen, keywords: ["focus", "deep work", "study"], run: () => go("/learning") },
    { id: "go:/settings", group: "Go to", label: "Settings", icon: SettingsIcon, keywords: ["account", "profile", "password", "export"], run: () => go("/settings") },
  ];
}

/** ⌘K: jump anywhere, start things, log a habit, flip the theme. */
export function CommandPalette() {
  const router = useRouter();
  const open = useCommandStore((s) => s.open);
  const setOpen = useCommandStore((s) => s.setOpen);
  const setHelpOpen = useCommandStore((s) => s.setHelpOpen);
  const { theme, setTheme } = useTheme();
  const { data: habitsToday } = useHabitsToday();
  const logHabit = useLogHabitToday();

  const items = useMemo<PaletteItem[]>(() => {
    const go = (href: string) => router.push(href);
    const actions: PaletteItem[] = [
      { id: "act:checkin", group: "Actions", label: "Start today's check-in", icon: CheckSquare, keywords: ["daily", "rate"], run: () => go("/checkin") },
      { id: "act:goal", group: "Actions", label: "New goal", icon: Target, keywords: ["create", "add"], run: () => go("/goals?new=1") },
      { id: "act:journal", group: "Actions", label: "New journal entry", icon: ScrollText, keywords: ["write", "create", "add"], run: () => go("/journal?new=1") },
      { id: "act:theme", group: "Actions", label: theme === "dark" ? "Switch to light theme" : "Switch to dark theme", icon: Moon, keywords: ["toggle", "dark", "light", "appearance"], run: () => setTheme(theme === "dark" ? "light" : "dark") },
      { id: "act:help", group: "Actions", label: "Keyboard shortcuts", icon: Keyboard, keywords: ["help", "keys", "hotkeys"], run: () => setHelpOpen(true) },
    ];
    const habits: PaletteItem[] = (habitsToday ?? [])
      .filter((h) => !h.completed_today)
      .map((h) => ({
        id: `habit:${h.id}`,
        group: "Log a habit" as const,
        label: `Log “${h.title}”`,
        icon: CircleDashed,
        keywords: ["habit", "done", "complete", h.title],
        run: () => void logHabit.log(h),
      }));
    return [...pageItems(go), ...actions, ...habits];
  }, [router, theme, setTheme, setHelpOpen, habitsToday, logHabit]);

  const groups = ["Go to", "Actions", "Log a habit"] as const;

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      overlayClassName="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
      contentClassName="fixed left-1/2 top-[15vh] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface shadow-lg dark:shadow-none"
    >
      <div className="flex items-center border-b border-border px-3">
        <Plus size={14} aria-hidden className="mr-2 rotate-45 text-fg-muted" />
        <Command.Input
          placeholder="Type a command or search…"
          className="h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-fg-muted"
        />
      </div>
      <Command.List className="max-h-[60vh] overflow-y-auto p-2">
        <Command.Empty className="px-3 py-6 text-center text-sm text-fg-secondary">Nothing matches that.</Command.Empty>
        {groups.map((group) => {
          const inGroup = items.filter((i) => i.group === group);
          if (inGroup.length === 0) return null;
          return (
            <Command.Group
              key={group}
              heading={group}
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-fg-muted"
            >
              {inGroup.map((item) => {
                const Icon = item.icon;
                return (
                  <Command.Item
                    key={item.id}
                    value={item.label}
                    keywords={item.keywords}
                    onSelect={() => {
                      setOpen(false);
                      item.run();
                    }}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-foreground aria-selected:bg-elevated"
                  >
                    <Icon size={15} aria-hidden className="shrink-0 text-fg-secondary" />
                    {item.label}
                  </Command.Item>
                );
              })}
            </Command.Group>
          );
        })}
      </Command.List>
    </Command.Dialog>
  );
}
