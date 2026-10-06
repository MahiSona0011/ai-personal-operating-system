"use client";
import { create } from "zustand";

/** Open/closed state of the ⌘K command palette and the "?" shortcut sheet, so any component can open them. */
interface CommandState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
}

export const useCommandStore = create<CommandState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
  helpOpen: false,
  setHelpOpen: (helpOpen) => set({ helpOpen }),
}));
