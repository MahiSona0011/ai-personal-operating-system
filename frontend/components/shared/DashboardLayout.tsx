"use client";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { CommandPalette } from "@/components/command/CommandPalette";
import { ShortcutSheet } from "@/components/command/ShortcutSheet";
import { VerifyEmailBanner } from "./VerifyEmailBanner";
import { useHotkeys } from "@/lib/hooks/useHotkeys";
import { useSyncThemeFromAccount } from "@/lib/hooks/useThemePreference";
import { useUIStore } from "@/store/uiStore";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  useHotkeys();
  useSyncThemeFromAccount();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-10 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <VerifyEmailBanner />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>

      <CommandPalette />
      <ShortcutSheet />
    </div>
  );
}
