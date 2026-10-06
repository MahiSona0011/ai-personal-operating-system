import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query-client";
import type { ReactNode } from "react";

// ---- mocks -----------------------------------------------------------------------------------

const get = vi.fn();
const del = vi.fn();
const post = vi.fn();
vi.mock("@/lib/api/client", () => ({
  default: {
    get: (...a: unknown[]) => get(...a),
    delete: (...a: unknown[]) => del(...a),
    post: (...a: unknown[]) => post(...a),
  },
}));

let search = "";
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(search),
}));

vi.mock("sonner", () => {
  const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
  return { toast, Toaster: () => null };
});

// Recharts needs real layout; replace the pieces with markers that expose the props we care about.
vi.mock("recharts", () => {
  const Box = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  const Series = (kind: string) =>
    function Series(props: Record<string, unknown>) {
      return (
        <div
          data-testid={`series-${kind}-${String(props.dataKey)}`}
          data-connect-nulls={String(props.connectNulls)}
          data-dash={String(props.strokeDasharray ?? "")}
        />
      );
    };
  return {
    ResponsiveContainer: Box,
    ComposedChart: ({ data, children }: { data: unknown[]; children: ReactNode }) => (
      <div data-testid="composed-chart" data-rows={JSON.stringify(data)}>
        {children}
      </div>
    ),
    LineChart: ({ data, children }: { data: unknown[]; children: ReactNode }) => (
      <div data-testid="line-chart" data-rows={JSON.stringify(data)}>
        {children}
      </div>
    ),
    RadialBarChart: Box,
    RadialBar: () => null,
    PolarAngleAxis: () => null,
    Area: Series("area"),
    Line: Series("line"),
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Legend: () => null,
  };
});

import DashboardPage from "@/app/(dashboard)/dashboard/page";
import { LifeScoreHero } from "@/components/dashboard/LifeScoreHero";
import { AreaContributors } from "@/components/dashboard/AreaContributors";
import { ConsistencyStrip } from "@/components/dashboard/ConsistencyStrip";
import { TodayHabits } from "@/components/dashboard/TodayHabits";
import { WeekHighlights } from "@/components/dashboard/WeekHighlights";
import { LatestInsight } from "@/components/dashboard/LatestInsight";
import { QuoteCard } from "@/components/dashboard/QuoteCard";
import { GreetingHeader, greetingFor } from "@/components/dashboard/GreetingHeader";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import type { DashboardData, AreaStat } from "@/lib/api/dashboard";
import type { HabitWithStatus } from "@/types";
import type { AreaKey } from "@/lib/areas";

const KEYS: AreaKey[] = ["health", "mind", "relationships", "work", "money", "growth"];
const nulls = (n: number) => Array<number | null>(n).fill(null);

function dashboardData(over: Partial<DashboardData> = {}): DashboardData {
  const areas = Object.fromEntries(
    KEYS.map((k) => [k, { score: null, delta: null, sparkline_30: nulls(30) } satisfies AreaStat])
  ) as Record<AreaKey, AreaStat>;
  return {
    user: { display_name: "Mahi", onboarding_state: "complete" },
    today: { checkin: null, habits_summary: { total: 0, completed: 0, due_today: [] } },
    life_area_scores: {},
    days: 30,
    selected_areas: KEYS,
    life_score: null,
    life_score_delta: null,
    checkin_streak: 0,
    checkin_consistency_30: Array<boolean>(30).fill(false),
    areas,
    highlights: [],
    latest_insight: null,
    ...over,
  };
}

function trend(values: (number | null)[], mood: (number | null)[] = []) {
  const points = values.map((v, i) => ({
    date: `2026-03-${String(i + 1).padStart(2, "0")}`,
    life_score: v,
    mood: mood[i] ?? null,
    energy: null,
    areas: {},
  }));
  return { points, moving_avg_7: points.map((p, i) => ({ date: p.date, value: i > 0 ? 6 : null })) };
}

const checkin = (over = {}) => ({ id: 1, is_complete: false, ai_analysis: null, overall_score: null, ...over });

function mockApi(routes: {
  dashboard?: DashboardData;
  trend?: ReturnType<typeof trend>;
  habits?: HabitWithStatus[] | (() => HabitWithStatus[]);
  checkin?: object;
}) {
  get.mockImplementation((url: string) => {
    const data =
      url === "/dashboard"
        ? (routes.dashboard ?? dashboardData())
        : url === "/checkins/trend"
          ? (routes.trend ?? trend(nulls(30)))
          : url === "/habits/today"
            ? typeof routes.habits === "function"
              ? routes.habits()
              : (routes.habits ?? [])
            : url === "/checkins/today"
              ? (routes.checkin ?? checkin())
              : {};
    return Promise.resolve({ data });
  });
}

function renderPage() {
  const client = createQueryClient();
  const ui = (
    <QueryClientProvider client={client}>
      <DashboardPage />
    </QueryClientProvider>
  );
  return { client, ...render(ui) };
}

beforeEach(() => {
  vi.clearAllMocks();
  search = "";
  useAuthStore.setState({
    user: {
      id: 7, email: "m@x.com", full_name: "Mahi Sonani", display_name: "Mahi", timezone: "UTC", avatar_url: null,
      onboarding_state: "complete", preferences: null, email_verified_at: null, theme_preference: "system", digest_enabled: true, is_active: true, last_login_at: null, created_at: "",
    },
    accessToken: "t",
    refreshToken: "r",
  });
});

// ---- page ------------------------------------------------------------------------------------

describe("dashboard page, brand-new user", () => {
  it("shows a teaching empty state in every block, with no NaN or undefined", async () => {
    mockApi({});
    const { container } = renderPage();

    expect(await screen.findByText("Your trend starts with one check-in")).toBeInTheDocument();
    expect(await screen.findByText("Your six areas will show up here")).toBeInTheDocument();
    expect(screen.getByText("No mood or energy yet")).toBeInTheDocument();
    expect(screen.getByText("No habits yet")).toBeInTheDocument();
    expect(screen.getByText("Highlights appear after a few check-ins")).toBeInTheDocument();
    expect(screen.getByText("Insights start after your first check-in")).toBeInTheDocument();
    expect(screen.getByText("Complete a check-in to get your first Life Score.")).toBeInTheDocument();
    expect(screen.getByText("Start a check-in streak today")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start today's check-in" })).toHaveAttribute("href", "/checkin");
    expect(screen.getByLabelText(/Check-in consistency, last 30 days: 0 of 30/)).toBeInTheDocument();

    const text = container.textContent ?? "";
    expect(text).not.toMatch(/NaN|undefined|null/);
    expect(screen.queryByTestId("composed-chart")).not.toBeInTheDocument();
  });

  it("shows a stable quote once data has loaded", async () => {
    mockApi({});
    renderPage();
    const quote = await screen.findByRole("figure");
    const first = quote.textContent;
    expect(first).toMatch(/“.+”/);
    expect(screen.getByRole("button", { name: "Show another quote" })).toBeInTheDocument();
  });
});

describe("dashboard page, user with gaps", () => {
  it("passes missing days to the chart as nulls and keeps the moving-average line", async () => {
    const values = [6, null, null, 7, 7.4, null, 8];
    mockApi({
      dashboard: dashboardData({ life_score: 7.1, life_score_delta: 0.6, checkin_streak: 3 }),
      trend: trend(values, [4, null, 3, null, 5, null, 4]),
    });
    renderPage();

    const charts = await screen.findAllByTestId("composed-chart");
    const rows = JSON.parse(charts[0].getAttribute("data-rows")!);
    expect(rows.map((r: { score: number | null }) => r.score)).toEqual(values);
    expect(rows.some((r: { score: number | null }) => r.score === 0)).toBe(false);
    expect(rows[3].avg).toBe(6);
    const area = screen.getByTestId("series-area-score");
    expect(area).toHaveAttribute("data-connect-nulls", "false");
    const avg = screen.getByTestId("series-line-avg");
    expect(avg).toHaveAttribute("data-dash", "4 4");
    expect(avg).toHaveAttribute("data-connect-nulls", "false");

    expect(screen.getByRole("img", { name: "Life score, last 30 days, from 6 to 8" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Mood, last 30 days, from 4 to 4/ })).toBeInTheDocument();
    expect(screen.getByText("Check-in streak: 3 days")).toBeInTheDocument();
    expect(screen.getByText("vs previous 30 days")).toBeInTheDocument();
  });
});

describe("range selection", () => {
  it("reads the range from the URL and requests it", async () => {
    search = "range=90d";
    mockApi({});
    renderPage();
    await waitFor(() => expect(get).toHaveBeenCalledWith("/dashboard", { params: { days: 90 } }));
    expect(get).toHaveBeenCalledWith("/checkins/trend", { params: { days: 90 } });
    expect(await screen.findByRole("radio", { name: "90D" })).toHaveAttribute("aria-checked", "true");
  });

  it("writes a new range to the URL and refetches", async () => {
    const user = userEvent.setup();
    mockApi({});
    renderPage();
    await user.click(await screen.findByRole("radio", { name: "7D" }));
    expect(replace).toHaveBeenCalledWith("/dashboard?range=7d", { scroll: false });
  });

  it("falls back to 30 days for a bad value", async () => {
    search = "range=banana";
    mockApi({});
    renderPage();
    await waitFor(() => expect(get).toHaveBeenCalledWith("/dashboard", { params: { days: 30 } }));
  });
});

describe("hero call to action", () => {
  it("changes once today's check-in is done", async () => {
    mockApi({ checkin: checkin({ is_complete: true, ai_analysis: { summary: "ok" } }) });
    renderPage();
    const link = await screen.findByRole("link", { name: "View today's insight" });
    expect(link).toHaveAttribute("href", "#latest-insight");
  });

  it("shows the analysing state while the AI is still working", async () => {
    mockApi({ checkin: checkin({ is_complete: true, ai_analysis: null }) });
    renderPage();
    expect(await screen.findByText(/Analysing your day/)).toBeInTheDocument();
  });
});

describe("habit logging from the dashboard", () => {
  const habit = (over: Partial<HabitWithStatus> = {}) =>
    ({ id: 5, title: "Read", life_area_id: 2, current_streak: 0, completed_today: false, completion_count_today: 0, ...over }) as HabitWithStatus;

  it("updates optimistically, then offers Undo that removes the log", async () => {
    const user = userEvent.setup();
    // A stateful "server": once the log is posted, the next fetch of today's habits reports it done.
    let logged = false;
    post.mockImplementation(() => {
      logged = true;
      return Promise.resolve({ data: {} });
    });
    del.mockImplementation(() => {
      logged = false;
      return Promise.resolve({ data: {} });
    });
    mockApi({ habits: () => [habit({ completed_today: logged }), habit({ id: 6, title: "Run" })] });
    renderPage();

    await user.click(await screen.findByRole("button", { name: /Read/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Read/ })).toHaveAttribute("aria-pressed", "true"));
    expect(post).toHaveBeenCalledWith("/habits/5/log", expect.objectContaining({ log_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }));

    await waitFor(() => expect(toast).toHaveBeenCalled());
    const [label, options] = (toast as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(label).toBe("Logged “Read”");
    options.action.onClick();
    await waitFor(() => expect(del).toHaveBeenCalledWith("/habits/5/log", { params: { log_date: expect.any(String) } }));
  });

  it("rolls back and shows an error toast when logging fails", async () => {
    const user = userEvent.setup();
    post.mockRejectedValue({ response: { status: 500, data: {} } });
    mockApi({ habits: [habit()] });
    renderPage();

    await user.click(await screen.findByRole("button", { name: /Read/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole("button", { name: /Read/ })).toHaveAttribute("aria-pressed", "false"));
  });
});

// ---- blocks ----------------------------------------------------------------------------------

describe("LifeScoreHero", () => {
  it("shows the score delta with its comparison period", () => {
    render(<LifeScoreHero score={7.4} delta={0.6} days={7} streak={12} checkinComplete={false} />);
    expect(screen.getByText("up 0.6")).toBeInTheDocument();
    expect(screen.getByText("vs previous 7 days")).toBeInTheDocument();
    expect(screen.getByText("Check-in streak: 12 days")).toBeInTheDocument();
  });

  it("says when there is nothing to compare against", () => {
    render(<LifeScoreHero score={7.4} delta={null} days={30} streak={1} checkinComplete />);
    expect(screen.getByText("no earlier data to compare")).toBeInTheDocument();
    expect(screen.getByText("Check-in streak: 1 day")).toBeInTheDocument();
  });

  it("holds the button back while the check-in state loads", () => {
    render(<LifeScoreHero score={null} delta={null} days={30} streak={0} checkinComplete={undefined} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("AreaContributors", () => {
  it("renders six linked tiles with score, delta and sparkline when there is data", () => {
    const areas = dashboardData().areas;
    areas.work = { score: 8.1, delta: 0.9, sparkline_30: [7, null, 8] };
    areas.health = { score: 6.8, delta: -0.4, sparkline_30: [7, 6] };
    render(<AreaContributors areas={areas} />);
    const tiles = screen.getAllByRole("link");
    expect(tiles).toHaveLength(6);
    expect(tiles.map((t) => t.getAttribute("href"))).toEqual(["/health", "/mind", "/relationships", "/work", "/money", "/growth"]);
    const work = within(screen.getByRole("link", { name: /Work/ }));
    expect(work.getByText("8.1")).toBeInTheDocument();
    expect(work.getByText("up 0.9")).toBeInTheDocument();
    expect(within(screen.getByRole("link", { name: /Health/ })).getByText("down 0.4")).toBeInTheDocument();
  });

  it("explains why an area is quieter when it isn't in the Life Score", () => {
    const areas = dashboardData().areas;
    areas.money = { score: 5, delta: 0, sparkline_30: [5] };
    render(<AreaContributors areas={areas} selected={["health"]} />);
    expect(screen.getByTitle("Money isn't part of your Life Score")).toBeInTheDocument();
  });
});

describe("ConsistencyStrip", () => {
  it("counts filled days and exposes a text summary", () => {
    const days = Array<boolean>(30).fill(false);
    [29, 28, 27, 20].forEach((i) => (days[i] = true));
    render(<ConsistencyStrip days={days} today={new Date(2026, 2, 30)} />);
    expect(screen.getByText("4 of 30 days")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Check-in consistency, last 30 days: 4 of 30 days checked in" })).toBeInTheDocument();
    expect(screen.getByTitle("Mon, Mar 30: checked in")).toBeInTheDocument();
    expect(screen.getByTitle("Sun, Mar 1: no check-in")).toBeInTheDocument();
  });
});

describe("TodayHabits", () => {
  const habits = [
    { id: 1, title: "Read", completed_today: true, current_streak: 4 },
    { id: 2, title: "Run", completed_today: false, current_streak: 0 },
    { id: 3, title: "Stretch", completed_today: false, current_streak: 0 },
  ] as HabitWithStatus[];

  it("shows 1/3 progress and only lets unfinished habits be logged", async () => {
    const user = userEvent.setup();
    const onLog = vi.fn();
    render(<TodayHabits habits={habits} onLog={onLog} />);
    expect(screen.getByLabelText("1 of 3 done")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Habits done today" })).toHaveAttribute("aria-valuenow", "1");
    expect(screen.getByRole("button", { name: /Read/ })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /Run/ }));
    expect(onLog).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
  });

  it("caps the list and points to the habits page", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ id: i, title: `H${i}`, completed_today: false, current_streak: 0 })) as HabitWithStatus[];
    render(<TodayHabits habits={many} onLog={() => {}} />);
    expect(screen.getAllByRole("button")).toHaveLength(7);
    expect(screen.getByRole("link", { name: "+3 more" })).toHaveAttribute("href", "/habits");
  });
});

describe("WeekHighlights and LatestInsight", () => {
  it("lists highlights", () => {
    render(<WeekHighlights highlights={["Work is up 1.5 points on the previous 30 days.", "5-day check-in streak."]} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("shows the insight, its first action and the area", () => {
    render(
      <LatestInsight
        insight={{
          id: 1, type: "daily_analysis", summary: "Good day", insight: "Sleep drives your mood", created_at: "",
          action: { action: "Be in bed by 11pm", area: "health", priority: 1 }, action_items: [],
        }}
      />
    );
    expect(screen.getByText("Sleep drives your mood")).toBeInTheDocument();
    expect(screen.getByText("Be in bed by 11pm")).toBeInTheDocument();
    expect(screen.getByText(/Next step · Health/)).toBeInTheDocument();
    expect(document.getElementById("latest-insight")).not.toBeNull();
  });

  it("falls back to the summary when there is no top insight", () => {
    render(<LatestInsight insight={{ id: 1, type: "weekly_review", summary: "A solid week", insight: null, action: null, action_items: [], created_at: "" }} />);
    expect(screen.getByText("A solid week")).toBeInTheDocument();
  });
});

describe("QuoteCard and GreetingHeader", () => {
  it("names the area the quote was chosen for", () => {
    render(<QuoteCard quote={{ text: "Be one.", author: "Marcus Aurelius", source: "Meditations 10.16", areas: ["work"] }} forArea="mind" onNext={() => {}} />);
    expect(screen.getByText("for Mind")).toBeInTheDocument();
    expect(screen.getByText(/Marcus Aurelius, Meditations 10.16/)).toBeInTheDocument();
  });

  it("greets by time of day", () => {
    expect(greetingFor(5)).toBe("Good morning");
    expect(greetingFor(12)).toBe("Good afternoon");
    expect(greetingFor(18)).toBe("Good evening");
    render(<GreetingHeader name="Mahi Sonani" now={new Date(2026, 2, 3, 9)} />);
    expect(screen.getByRole("heading", { name: "Good morning, Mahi" })).toBeInTheDocument();
    expect(screen.getByText("Tuesday, March 3")).toBeInTheDocument();
  });
});
