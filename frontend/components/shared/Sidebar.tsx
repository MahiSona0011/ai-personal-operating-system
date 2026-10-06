"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CheckSquare, Zap, Target, Brain, Heart,
  Users, Briefcase, Wallet, Sprout, ScrollText,
  Activity, CalendarCheck, Settings, LogOut, Menu, Sparkles, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useUIStore } from "@/store/uiStore";
import { useAuth } from "@/lib/hooks/useAuth";
import { AREAS } from "@/lib/areas";

const AREA_ICONS: Record<string, LucideIcon> = {
  heart: Heart, brain: Brain, users: Users, briefcase: Briefcase, wallet: Wallet, sprout: Sprout,
};

export type NavItem = { href: string; label: string; icon: LucideIcon; iconClass?: string };

export const NAV_ITEMS: (NavItem | null)[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/checkin", label: "Daily Check-In", icon: CheckSquare },
  { href: "/habits", label: "Habits", icon: Zap },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/analysis", label: "AI Analysis", icon: Sparkles },
  { href: "/reviews", label: "Reviews", icon: CalendarCheck },
  null,
  ...AREAS.map((a) => ({ href: a.route, label: a.name, icon: AREA_ICONS[a.icon], iconClass: a.text })),
  { href: "/journal", label: "Journal", icon: ScrollText },
  { href: "/metrics", label: "Metrics", icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUIStore();
  const { logout } = useAuth();

  return (
    <aside
      className={cn(
        // Desktop: static, collapses to icon bar
        "hidden md:flex flex-col h-screen bg-surface border-r border-border transition-all duration-200 z-20",
        sidebarOpen ? "w-56" : "w-14",
        // Mobile: fixed overlay, slides in from left
        "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:flex max-md:z-20",
        // When the mobile drawer is closed it is off-screen: take it out of the tab order and a11y tree too.
        sidebarOpen ? "max-md:w-64 max-md:translate-x-0" : "max-md:-translate-x-full max-md:invisible"
      )}
    >
      {/* Header */}
      <div className="flex items-center h-14 px-3 border-b border-border shrink-0">
        <button
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          className="p-1.5 rounded-md hover:bg-elevated text-muted-foreground"
        >
          <Menu size={18} aria-hidden />
        </button>
        {sidebarOpen && (
          <span className="ml-3 font-bold text-sm text-gradient">Selfstack</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {NAV_ITEMS.map((item, i) => {
          if (!item) return <div key={i} className="my-2 border-t border-border" />;
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              // The label is hidden when the sidebar is collapsed to icons, so name the link explicitly.
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              title={sidebarOpen ? undefined : item.label}
              onClick={() => { if (window.innerWidth < 768) setSidebarOpen(false); }}
              className={cn(
                "flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-accent/10 text-accent-fg"
                  : "text-muted-foreground hover:bg-elevated hover:text-foreground"
              )}
            >
              <Icon size={16} className={cn("shrink-0", item.iconClass)} />
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 pb-3 space-y-0.5 border-t border-border pt-2">
        <Link
          href="/settings"
          aria-label="Settings"
          title={sidebarOpen ? undefined : "Settings"}
          onClick={() => { if (window.innerWidth < 768) setSidebarOpen(false); }}
          className="flex items-center gap-3 px-2 py-2 rounded-md text-sm text-muted-foreground hover:bg-elevated hover:text-foreground"
        >
          <Settings size={16} className="shrink-0" />
          {sidebarOpen && <span>Settings</span>}
        </Link>
        <button
          onClick={logout}
          aria-label="Logout"
          title={sidebarOpen ? undefined : "Logout"}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm text-muted-foreground hover:bg-elevated hover:text-foreground"
        >
          <LogOut size={16} className="shrink-0" />
          {sidebarOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
