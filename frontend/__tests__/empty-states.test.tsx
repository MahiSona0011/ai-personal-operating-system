import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn(), patch: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ default: api }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("sonner", () => {
  const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
  return { toast, Toaster: () => null };
});
vi.mock("recharts", () => {
  const Box = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    ResponsiveContainer: Box, LineChart: Box, BarChart: Box, ComposedChart: Box, RadialBarChart: Box,
    Line: () => null, Bar: () => null, Area: () => null, RadialBar: () => null, PolarAngleAxis: () => null,
    XAxis: () => null, YAxis: () => null, CartesianGrid: () => null, Tooltip: () => null, Legend: () => null,
  };
});

import HabitsPage from "@/app/(dashboard)/habits/page";
import GoalsPage from "@/app/(dashboard)/goals/page";
import JournalPage from "@/app/(dashboard)/journal/page";
import ReviewsPage from "@/app/(dashboard)/reviews/page";
import AnalysisPage from "@/app/(dashboard)/analysis/page";
import MetricsPage from "@/app/(dashboard)/metrics/page";
import LearningPage from "@/app/(dashboard)/learning/page";
import { createQueryClient } from "@/lib/query-client";

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation((url: string) =>
    Promise.resolve({
      data: url.startsWith("/sessions/stats")
        ? { total_minutes: 0, session_count: 0, avg_quality: null, by_area: {}, by_week: [] }
        : [],
    })
  );
});

const cases: [string, () => ReactElement, string, RegExp][] = [
  ["Habits", () => <HabitsPage />, "No habits yet", /small action you repeat/i],
  ["Goals", () => <GoalsPage />, "No goals yet", /outcome with a target date/i],
  ["Journal", () => <JournalPage />, "No entries yet", /write freely/i],
  ["Reviews", () => <ReviewsPage />, "No weekly reviews yet", /summarises your week/i],
  ["AI Analysis", () => <AnalysisPage />, "No insights yet", /analysed for patterns/i],
  ["Metrics", () => <MetricsPage />, "No readings yet", /one number you track/i],
  ["Learning sessions", () => <LearningPage />, "No sessions yet", /block of focused time/i],
];

describe("every list page teaches when it is empty", () => {
  it.each(cases)("%s explains what it is and offers the next step", async (_name, page, title, description) => {
    const { container } = render(<QueryClientProvider client={createQueryClient()}>{page()}</QueryClientProvider>);
    expect(await screen.findByText(title)).toBeInTheDocument();
    expect(screen.getByText(description)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/NaN|undefined/);
  });

  it.each(cases.filter(([n]) => n !== "Reviews"))("%s has a button or link for the next step", async (_name, page, title) => {
    render(<QueryClientProvider client={createQueryClient()}>{page()}</QueryClientProvider>);
    const heading = await screen.findByText(title);
    const block = heading.closest("div")!.parentElement!;
    expect(block.querySelector("button, a")).not.toBeNull();
  });
});
