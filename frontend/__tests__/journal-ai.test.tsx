import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ default: api }));
vi.mock("sonner", () => {
  const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
  return { toast, Toaster: () => null };
});
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/journal",
  useSearchParams: () => new URLSearchParams(""),
}));

import { createQueryClient } from "@/lib/query-client";
import { isAnalysing } from "@/lib/hooks/useJournal";
import { JournalAiSummary } from "@/components/journal/JournalAiSummary";
import JournalPage from "@/app/(dashboard)/journal/page";
import type { JournalEntry } from "@/types";

const NOW = Date.parse("2026-10-06T12:00:00Z");
const ENTRY: JournalEntry = {
  id: 1, user_id: 1, entry_date: "2026-10-05", title: "Long day", content: "Shipped the thing I was worried about.",
  life_area_tags: null, mood_tag: null, ai_summary: null, ai_themes: null, ai_sentiment: null, ai_status: null,
  created_at: "2026-10-05T10:00:00Z", updated_at: new Date().toISOString(),
};

beforeEach(() => vi.clearAllMocks());

describe("isAnalysing", () => {
  it("is true only for a recently-queued entry", () => {
    const pending = { ...ENTRY, ai_status: "pending" as const, updated_at: "2026-10-06T11:59:30Z" };
    expect(isAnalysing(pending, NOW)).toBe(true);
    expect(isAnalysing({ ...pending, updated_at: "2026-10-06T11:50:00Z" }, NOW)).toBe(false); // lost with its worker
    expect(isAnalysing({ ...pending, ai_status: "completed" }, NOW)).toBe(false);
  });
});

describe("JournalAiSummary", () => {
  it("shows progress while the analysis is queued", () => {
    render(<JournalAiSummary entry={{ ...ENTRY, ai_status: "pending" }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Analysing this entry");
  });

  it("shows the summary, tone and themes once done", () => {
    render(
      <JournalAiSummary
        entry={{ ...ENTRY, ai_status: "completed", ai_summary: "You felt stretched but proud.", ai_themes: ["work stress", "pride"], ai_sentiment: "mixed" }}
      />,
    );
    expect(screen.getByRole("region", { name: "AI summary" })).toHaveTextContent("You felt stretched but proud.");
    const themes = screen.getByRole("list", { name: "Themes" });
    expect(themes).toHaveTextContent("Mixed tone");
    expect(themes).toHaveTextContent("work stress");
    expect(themes).toHaveTextContent("pride");
  });

  it("hides the stale summary while an edited entry is re-analysed", () => {
    render(<JournalAiSummary entry={{ ...ENTRY, ai_status: "pending", ai_summary: "Old summary" }} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("Old summary")).toBeNull();
  });

  it("explains a failure and how to retry", () => {
    render(<JournalAiSummary entry={{ ...ENTRY, ai_status: "failed" }} />);
    expect(screen.getByText(/couldn.t be generated/)).toHaveTextContent("Editing and saving the entry will try again");
  });

  it("explains why a skipped entry has no summary", () => {
    render(<JournalAiSummary entry={{ ...ENTRY, ai_status: "skipped" }} />);
    expect(screen.getByText(/No AI summary/)).toBeInTheDocument();
  });

  it("renders nothing for an entry that was never analysed", () => {
    const { container } = render(<JournalAiSummary entry={ENTRY} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("journal page", () => {
  it("shows 'Analysing…' for a queued entry and swaps in the summary when polling finds it done", async () => {
    const pending = { ...ENTRY, ai_status: "pending" as const };
    const done = {
      ...ENTRY, ai_status: "completed" as const, ai_summary: "You shipped despite the worry.", ai_themes: ["shipping"], ai_sentiment: "positive",
    };
    api.get.mockResolvedValueOnce({ data: [pending] }).mockResolvedValue({ data: [done] });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <JournalPage />
      </QueryClientProvider>,
    );
    await userEvent.click(await screen.findByRole("button", { name: /Open journal entry from Oct 5, 2026/ }));
    expect(await screen.findByRole("status")).toHaveTextContent("Analysing this entry");

    await waitFor(() => expect(screen.getByRole("region", { name: "AI summary" })).toHaveTextContent("You shipped despite the worry."), {
      timeout: 8000,
    });
    expect(screen.queryByRole("status")).toBeNull();
  }, 15000);
});
