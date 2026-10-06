"use client";
import { create } from "zustand";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button, for deletes. */
  destructive?: boolean;
  /** The user must type this exact text before the confirm button enables. */
  typeToConfirm?: string;
}

interface ConfirmState {
  options: ConfirmOptions | null;
  resolve: ((ok: boolean) => void) | null;
  ask: (options: ConfirmOptions) => Promise<boolean>;
  settle: (ok: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  options: null,
  resolve: null,
  ask: (options) =>
    new Promise<boolean>((resolve) => {
      // A second request while one is open cancels the first.
      get().resolve?.(false);
      set({ options, resolve });
    }),
  settle: (ok) => {
    get().resolve?.(ok);
    set({ options: null, resolve: null });
  },
}));

/**
 * Ask the user to confirm an action: `if (await confirm({ title: "Delete habit?", destructive: true })) ...`.
 * Resolves true on confirm, false on cancel/escape. Rendered by <ConfirmHost /> in the root providers.
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return useConfirmStore.getState().ask(options);
}

/** The standard "Delete X?" confirmation. `what` reads naturally after "Delete", e.g. "“Read 20 minutes”". */
export function confirmDelete(what: string, description = "This can't be undone."): Promise<boolean> {
  return confirm({ title: `Delete ${what}?`, description, confirmLabel: "Delete", destructive: true });
}
