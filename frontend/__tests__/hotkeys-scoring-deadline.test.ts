import { afterEach, describe, expect, it, vi } from "vitest";
import { createHotkeyHandler, GO_TO, isTypingTarget, SEQUENCE_TIMEOUT_MS, SHORTCUTS } from "@/lib/hotkeys";
import { goalDeadline } from "@/lib/goal-deadline";
import { lifeScore, selectedAreaKeys } from "@/lib/scoring";

function setup() {
  const actions = { navigate: vi.fn(), togglePalette: vi.fn(), openHelp: vi.fn() };
  let t = 1000;
  const handler = createHotkeyHandler(actions, () => t);
  return { actions, handler, advance: (ms: number) => (t += ms) };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("hotkeys", () => {
  it("⌘K and Ctrl+K toggle the palette, even while typing", () => {
    const { actions, handler } = setup();
    const input = document.createElement("input");
    document.body.append(input);
    handler({ key: "k", metaKey: true, target: input });
    handler({ key: "K", ctrlKey: true, target: input });
    expect(actions.togglePalette).toHaveBeenCalledTimes(2);
  });

  it("c starts a check-in; ? opens the sheet", () => {
    const { actions, handler } = setup();
    handler({ key: "c" });
    expect(actions.navigate).toHaveBeenCalledWith("/checkin");
    handler({ key: "?", shiftKey: true });
    expect(actions.openHelp).toHaveBeenCalledTimes(1);
  });

  it("g then a letter navigates; every mapped letter works", () => {
    for (const [letter, href] of Object.entries(GO_TO)) {
      const { actions, handler } = setup();
      handler({ key: "g" });
      handler({ key: letter });
      expect(actions.navigate, letter).toHaveBeenCalledWith(href);
    }
  });

  it("g sequences expire, and an unknown second key cancels them", () => {
    const { actions, handler, advance } = setup();
    handler({ key: "g" });
    advance(SEQUENCE_TIMEOUT_MS + 1);
    handler({ key: "d" });
    expect(actions.navigate).not.toHaveBeenCalled();

    handler({ key: "g" });
    handler({ key: "z" });
    handler({ key: "d" });
    expect(actions.navigate).not.toHaveBeenCalled();
  });

  it("ignores shortcuts while typing, and with modifiers held", () => {
    const { actions, handler } = setup();
    for (const tag of ["input", "textarea", "select"]) {
      const el = document.createElement(tag);
      document.body.append(el);
      handler({ key: "c", target: el });
    }
    const editable = document.createElement("div");
    Object.defineProperty(editable, "isContentEditable", { value: true });
    handler({ key: "c", target: editable });
    handler({ key: "c", altKey: true });
    handler({ key: "c", metaKey: true });
    expect(actions.navigate).not.toHaveBeenCalled();
    expect(isTypingTarget(null)).toBe(false);
  });

  it("ignores single-key shortcuts while a dialog is open", () => {
    const { actions, handler } = setup();
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    document.body.append(dialog);
    handler({ key: "c" });
    expect(actions.navigate).not.toHaveBeenCalled();
    handler({ key: "k", metaKey: true });
    expect(actions.togglePalette).toHaveBeenCalled(); // ⌘K still closes it
  });

  it("documents every shortcut it implements", () => {
    const labels = SHORTCUTS.map((s) => s.label).join(" ");
    for (const href of Object.values(GO_TO)) {
      expect(labels.toLowerCase()).toContain(href.slice(1).split("/")[0].slice(0, 4));
    }
    expect(SHORTCUTS.some((s) => s.keys.join("") === "c")).toBe(true);
  });
});

describe("goalDeadline", () => {
  const now = new Date(2026, 2, 10, 15, 30);

  it("has nothing to say without a date", () => {
    expect(goalDeadline(null, now)).toBeNull();
    expect(goalDeadline(undefined, now)).toBeNull();
  });

  it("is overdue after the date, in the destructive tone", () => {
    expect(goalDeadline("2026-03-09", now)).toMatchObject({ label: "1 day overdue", tone: "overdue" });
    expect(goalDeadline("2026-03-01", now)).toMatchObject({ label: "9 days overdue", tone: "overdue" });
  });

  it("warns on the day and in the final week", () => {
    expect(goalDeadline("2026-03-10", now)).toMatchObject({ label: "Due today", tone: "soon" });
    expect(goalDeadline("2026-03-11", now)).toMatchObject({ label: "1 day left", tone: "soon" });
    expect(goalDeadline("2026-03-17", now)).toMatchObject({ label: "7 days left", tone: "soon" });
  });

  it("is calm further out", () => {
    expect(goalDeadline("2026-03-18", now)).toMatchObject({ label: "8 days left", tone: "ok" });
    expect(goalDeadline("2026-12-31", now)?.tone).toBe("ok");
  });
});

describe("client Life Score (mirrors the backend)", () => {
  it("defaults to all six areas", () => {
    expect(selectedAreaKeys(null)).toHaveLength(6);
    expect(selectedAreaKeys({})).toHaveLength(6);
    expect(selectedAreaKeys({ priority_area_ids: [0, 9, "x"] })).toHaveLength(6);
  });

  it("follows the onboarding selection in canonical order", () => {
    expect(selectedAreaKeys({ priority_area_ids: [4, 1] })).toEqual(["health", "work"]);
  });

  it("is the mean of the selected, rated areas", () => {
    const scores = { health: 8, mind: null, work: 6, money: 2 };
    expect(lifeScore(scores, ["health", "mind", "work"])).toBe(7);
    expect(lifeScore(scores)).toBeCloseTo(5.33, 2);
  });

  it("falls back to whatever was rated, and is null with nothing", () => {
    expect(lifeScore({ money: 4, work: 6 }, ["health"])).toBe(5);
    expect(lifeScore({})).toBeNull();
    expect(lifeScore({ health: null })).toBeNull();
  });
});
