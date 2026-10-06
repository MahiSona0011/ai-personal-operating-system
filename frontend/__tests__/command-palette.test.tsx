import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ default: api }));
const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));
const setTheme = vi.hoisted(() => vi.fn());
vi.mock("next-themes", () => ({ useTheme: () => ({ theme: "dark", setTheme }) }));
vi.mock("sonner", () => {
  const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
  return { toast, Toaster: () => null };
});

import { CommandPalette } from "@/components/command/CommandPalette";
import { ShortcutSheet } from "@/components/command/ShortcutSheet";
import { NAV_ITEMS } from "@/components/shared/Sidebar";
import { createQueryClient } from "@/lib/query-client";
import { useCommandStore } from "@/store/commandStore";

beforeAll(() => {
  // cmdk measures and scrolls; jsdom has neither.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView = vi.fn();
});

const habits = [
  { id: 1, title: "Morning walk", completed_today: false, life_area_id: 1, current_streak: 0 },
  { id: 2, title: "Read 20 minutes", completed_today: false, life_area_id: 6, current_streak: 0 },
  { id: 3, title: "Meditate", completed_today: true, life_area_id: 2, current_streak: 4 },
];

function renderPalette() {
  api.get.mockImplementation((url: string) => Promise.resolve({ data: url === "/habits/today" ? habits : [] }));
  api.post.mockResolvedValue({ data: {} });
  act(() => useCommandStore.setState({ open: true, helpOpen: false }));
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <CommandPalette />
      <ShortcutSheet />
    </QueryClientProvider>
  );
}

const visibleOptions = () => screen.queryAllByRole("option").map((o) => o.textContent ?? "");

beforeEach(() => {
  vi.clearAllMocks();
  act(() => useCommandStore.setState({ open: false, helpOpen: false }));
});

describe("command palette", () => {
  it("is closed until opened", () => {
    api.get.mockResolvedValue({ data: [] });
    render(
      <QueryClientProvider client={createQueryClient()}>
        <CommandPalette />
      </QueryClientProvider>
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("lists every item in the sidebar, so every nav item is reachable", async () => {
    renderPalette();
    await screen.findByRole("dialog");
    const options = visibleOptions();
    for (const item of NAV_ITEMS.filter(Boolean)) {
      expect(options, item!.label).toContain(item!.label);
    }
    expect(options).toContain("Learning sessions");
    expect(options).toContain("Settings");
    expect(options).toContain("Mind");
  });

  it("filters as you type", async () => {
    const user = userEvent.setup();
    renderPalette();
    const input = await screen.findByPlaceholderText("Type a command or search…");

    await user.type(input, "hab");
    await waitFor(() => {
      const options = visibleOptions();
      expect(options).toContain("Habits");
      expect(options.some((o) => o.includes("Morning walk"))).toBe(true);
      expect(options).not.toContain("Dashboard");
      expect(options).not.toContain("Settings");
    });

    await user.clear(input);
    await user.type(input, "zzzzqq");
    expect(await screen.findByText("Nothing matches that.")).toBeInTheDocument();
    expect(visibleOptions()).toHaveLength(0);
  });

  it("matches on keywords as well as labels", async () => {
    const user = userEvent.setup();
    renderPalette();
    await user.type(await screen.findByPlaceholderText("Type a command or search…"), "password");
    await waitFor(() => expect(visibleOptions()).toEqual(["Settings"]));
  });

  it("only offers to log habits that aren't done yet", async () => {
    renderPalette();
    await waitFor(() => expect(visibleOptions().some((o) => o.includes("Morning walk"))).toBe(true));
    const options = visibleOptions();
    expect(options).toContain("Log “Morning walk”");
    expect(options).toContain("Log “Read 20 minutes”");
    expect(options).not.toContain("Log “Meditate”");
  });

  it("navigates and closes when a page is chosen", async () => {
    const user = userEvent.setup();
    renderPalette();
    await user.click(await screen.findByRole("option", { name: "Work" }));
    expect(push).toHaveBeenCalledWith("/work");
    expect(useCommandStore.getState().open).toBe(false);
  });

  it("starts a check-in and opens the create flows", async () => {
    const user = userEvent.setup();
    renderPalette();
    await user.click(await screen.findByRole("option", { name: "Start today's check-in" }));
    expect(push).toHaveBeenCalledWith("/checkin");

    act(() => useCommandStore.setState({ open: true }));
    await user.click(await screen.findByRole("option", { name: "New goal" }));
    expect(push).toHaveBeenCalledWith("/goals?new=1");

    act(() => useCommandStore.setState({ open: true }));
    await user.click(await screen.findByRole("option", { name: "New journal entry" }));
    expect(push).toHaveBeenCalledWith("/journal?new=1");
  });

  it("logs a habit from the palette", async () => {
    const user = userEvent.setup();
    renderPalette();
    await user.click(await screen.findByRole("option", { name: "Log “Morning walk”" }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/habits/1/log", expect.objectContaining({ log_date: expect.any(String) })));
  });

  it("flips the theme", async () => {
    const user = userEvent.setup();
    renderPalette();
    await user.click(await screen.findByRole("option", { name: "Switch to light theme" }));
    expect(setTheme).toHaveBeenCalledWith("light");
  });

  it("opens the shortcut sheet from the palette", async () => {
    const user = userEvent.setup();
    renderPalette();
    await user.click(await screen.findByRole("option", { name: "Keyboard shortcuts" }));
    const sheet = await screen.findByRole("alertdialog", { name: "Keyboard shortcuts" });
    expect(within(sheet).getByText("Open the command palette")).toBeInTheDocument();
    expect(within(sheet).getByText("Go to Dashboard")).toBeInTheDocument();
  });
});
