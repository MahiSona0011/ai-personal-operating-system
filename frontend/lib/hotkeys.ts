/** Keyboard shortcuts, as data (shown in the "?" sheet) and as a pure key handler (unit-tested). */

export interface Shortcut {
  keys: string[];
  label: string;
}

export const SHORTCUTS: Shortcut[] = [
  { keys: ["⌘/Ctrl", "K"], label: "Open the command palette" },
  { keys: ["c"], label: "Start today's check-in" },
  { keys: ["g", "d"], label: "Go to Dashboard" },
  { keys: ["g", "h"], label: "Go to Habits" },
  { keys: ["g", "g"], label: "Go to Goals" },
  { keys: ["g", "a"], label: "Go to AI Analysis" },
  { keys: ["g", "j"], label: "Go to Journal" },
  { keys: ["g", "m"], label: "Go to Metrics" },
  { keys: ["g", "s"], label: "Go to Settings" },
  { keys: ["?"], label: "Show this list" },
];

/** Where "g <key>" goes. */
export const GO_TO: Record<string, string> = {
  d: "/dashboard",
  h: "/habits",
  g: "/goals",
  a: "/analysis",
  j: "/journal",
  m: "/metrics",
  s: "/settings",
};

export const SEQUENCE_TIMEOUT_MS = 1000;

export interface HotkeyActions {
  navigate: (href: string) => void;
  togglePalette: () => void;
  openHelp: () => void;
}

export interface KeyEventLike {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  target?: EventTarget | null;
  preventDefault?: () => void;
}

/** True when the key press happened somewhere the user is typing. */
export function isTypingTarget(target: EventTarget | null | undefined): boolean {
  const el = target as HTMLElement | null | undefined;
  if (!el || typeof el !== "object" || !("tagName" in el)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable === true;
}

/**
 * Build the key handler. ⌘K / Ctrl+K works everywhere, even in a text field. Every other shortcut is
 * ignored while typing, while a modifier is held, and while another dialog is open.
 */
export function createHotkeyHandler(actions: HotkeyActions, now: () => number = Date.now) {
  let pendingG = 0; // timestamp of the last "g", or 0

  return function onKeyDown(e: KeyEventLike): void {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

    if ((e.metaKey || e.ctrlKey) && key === "k") {
      e.preventDefault?.();
      actions.togglePalette();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (isTypingTarget(e.target)) return;
    if (typeof document !== "undefined" && document.querySelector('[role="dialog"], [role="alertdialog"]')) return;

    if (pendingG) {
      const fresh = now() - pendingG <= SEQUENCE_TIMEOUT_MS;
      pendingG = 0;
      if (fresh && GO_TO[key]) {
        e.preventDefault?.();
        actions.navigate(GO_TO[key]);
        return;
      }
    }

    if (e.key === "?") {
      e.preventDefault?.();
      actions.openHelp();
    } else if (key === "c" && !e.shiftKey) {
      e.preventDefault?.();
      actions.navigate("/checkin");
    } else if (key === "g" && !e.shiftKey) {
      pendingG = now();
    }
  };
}
