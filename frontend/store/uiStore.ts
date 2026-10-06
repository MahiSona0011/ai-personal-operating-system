"use client";
import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

const isMobile = () => typeof window !== "undefined" && window.innerWidth < 768;

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: !isMobile(),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
