"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CheckSquare, Zap, Target, Brain, Heart,
  TrendingUp, Users, BookOpen, Briefcase, ScrollText,
  BarChart2, Activity, CalendarCheck, Settings, LogOut, Menu
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useUIStore } from "@/store/uiStore";
import { useAuth } from "@/lib/hooks/useAuth";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/checkin", label: "Daily Check-In", icon: CheckSquare },
  { href: "/habits", label: "Habits", icon: Zap },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/analysis", label: "AI Analysis", icon: Brain },
  { href: "/reviews", label: "Reviews", icon: CalendarCheck },
  null,
  { href: "/health", label: "Health", icon: Heart },
  { href: "/finances", label: "Finances", icon: TrendingUp },
  { href: "/social", label: "Social", icon: Users },
  { href: "/learning", label: "Learning", icon: BookOpen },
  { href: "/career", label: "Career", icon: Briefcase },
  { href: "/productivity", label: "Productivity", icon: BarChart2 },
  { href: "/journal", label: "Journal", icon: ScrollText },
  { href: "/metrics", label: "Metrics", icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { logout } = useAuth();

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-surface border-r border-border transition-all duration-200 z-20",
        sidebarOpen ? "w-56" : "w-14"
      )}
    >
      {/* Header */}
      <div className="flex items-center h-14 px-3 border-b border-border shrink-0">
        <button onClick={toggleSidebar} className="p-1.5 rounded-md hover:bg-elevated text-muted-foreground">
          <Menu size={18} />
        </button>
        {sidebarOpen && (
          <span className="ml-3 font-bold text-sm text-gradient">AI-POS</span>
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
              className={cn(
                "flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-accent/10 text-accent"
                  : "text-muted-foreground hover:bg-elevated hover:text-foreground"
              )}
            >
              <Icon size={16} className="shrink-0" />
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 pb-3 space-y-0.5 border-t border-border pt-2">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-2 py-2 rounded-md text-sm text-muted-foreground hover:bg-elevated hover:text-foreground"
        >
          <Settings size={16} className="shrink-0" />
          {sidebarOpen && <span>Settings</span>}
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm text-muted-foreground hover:bg-elevated hover:text-foreground"
        >
          <LogOut size={16} className="shrink-0" />
          {sidebarOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
