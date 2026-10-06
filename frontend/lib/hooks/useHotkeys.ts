"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createHotkeyHandler } from "@/lib/hotkeys";
import { useCommandStore } from "@/store/commandStore";

/** Install the global keyboard shortcuts (see lib/hotkeys.ts). Mounted once, in the app shell. */
export function useHotkeys() {
  const router = useRouter();
  const togglePalette = useCommandStore((s) => s.toggle);
  const openHelp = useCommandStore((s) => s.setHelpOpen);

  useEffect(() => {
    const handler = createHotkeyHandler({
      navigate: (href) => router.push(href),
      togglePalette,
      openHelp: () => openHelp(true),
    });
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [router, togglePalette, openHelp]);
}
