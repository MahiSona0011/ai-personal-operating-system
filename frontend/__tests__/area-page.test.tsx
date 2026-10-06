import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const get = vi.fn();
const post = vi.fn();
vi.mock("@/lib/api/client", () => ({
  default: {
    get: (...a: unknown[]) => get(...a),
    post: (...a: unknown[]) => post(...a),
    delete: vi.fn(),
    patch: vi.fn(),
  },
}));

let search = "";
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/work",
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock("sonner", () => {
  const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
  return { toast, Toaster: () => null };
});
vi.mock("recharts", () => {
  const Box = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  const Chart = (kind: string) =>
    function ChartMock({ data, children }: { data?: unknown[]; children?: ReactNode }) {
      return (
        <div data-testid={`${kind}-chart`} data-rows={JSON.stringify(data ?? [])}>
          {children}
        </div>
      );
    };
  const Series = (kind: string) =>
    function SeriesMock(props: Record<string, unknown>) {
      return <div data-testid={`${kind}-${String(props.dataKey)}`} data-connect-nulls={String(props.connectNulls)} data-dash={String(props.strokeDasharray ?? "")} />;
    };
  return {
    ResponsiveContainer: Box,
    LineChart: Chart("line"),
    BarChart: Chart("bar"),
    ComposedChart: Chart("composed"),
    Line: Series("line-series"),
    Bar: Series("bar-series"),
    Area: Series("area-series"),
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Legend: () => null,
  };
});

import { LifeAreaPage } from "@/components/areas/LifeAreaPage";
import { InsightCard } from "@/components/analysis/InsightCard";
import { useAuthStore } from "@/store/authStore";
import { AREAS } from "@/lib/areas";
import { METRIC_KEYS } from "@/types";
import type { AreaSummary } from "@/lib/api/areas";
import type { AIRecommendation } from "@/types";

const dayKeys = (n: number) => Array.from({ length: n }, (_, i) => `2026-03-${String(i + 1).padStart(2, "0")}`);

function summary(areaId: number, over: Partial<AreaSummary> = {}): AreaSummary {
  const area = AREAS.find((a) => a.id === areaId)!;
  return {
    area: { id: areaId, slug: area.key, name: area.name, icon: area.icon, color: "" },
    days: 30,
    score: null,
    delta: null,
    series: dayKeys(30).map((date) => ({ date, score: null })),
    habits: [],
    goals: [],
    recommendations: [],
    metrics: [],
    ...over,
  };
}

const rec = (over: Partial<AIRecommendation> = {}): AIRecommendation =>
  ({
    id: 1, user_id: 1, recommendation_type: "daily_analysis", source_type: null, source_id: null, model_used: "m",
    prompt_tokens: null, completion_tokens: null, raw_response: { top_insight: "Sleep drives your mood" },
    summary: "A steady day", action_items: [{ action: "Walk at 8am", area: "health", priority: 1 }, { action: "Stretch", area: "health", priority: 2 }, { action: "Third", area: "health", priority: 2 }],
    insights: ["pattern one"], is_dismissed: false, is_actioned: false, user_rating: null, created_at: new Date().toISOString(), ...over,
  }) as AIRecommendation;

interface Routes {
  summary?: (areaId: number) => AreaSummary;
  series?: () => object;
  habits?: object[];
  goals?: object[];
}

function mockApi(routes: Routes = {}) {
  get.mockImplementation((url: string) => {
    let data: unknown = [];
    const m = url.match(/^\/areas\/(\d+)\/summary$/);
    if (m) data = (routes.summary ?? summary)(Number(m[1]));
    else if (url === "/metrics/series")
      data = routes.series?.() ?? { key: "", area_id: null, days: 30, unit: null, points: [], latest: null, average: null, delta: null };
    else if (url === "/habits") data = routes.habits ?? [];
    else if (url === "/habits/today") data = [];
    else if (url === "/goals") data = routes.goals ?? [];
    else if (url === "/sessions/stats") data = { total_minutes: 0, session_count: 0, avg_quality: null, by_area: {}, by_week: [] };
    else if (url === "/sessions") data = [];
    return Promise.resolve({ data });
  });
}

function renderArea(areaId: number) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <LifeAreaPage areaId={areaId} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  search = "";
  useAuthStore.setState({
    user: {
      id: 7, email: "m@x.com", full_name: "Mahi", display_name: "Mahi", timezone: "UTC", avatar_url: null,
      onboarding_state: "complete", preferences: null, email_verified_at: null, theme_preference: "system", digest_enabled: true, is_active: true, last_login_at: null, created_at: "",
    },
    accessToken: "t",
    refreshToken: "r",
  });
});

describe("area pages with no data", () => {
  it.each(AREAS.map((a) => [a.name, a.id] as const))("%s renders teaching empty states and a tile per metric", async (name, id) => {
    mockApi();
    const { container } = renderArea(id);

    expect(await screen.findByRole("heading", { level: 1, name })).toBeInTheDocument();
    expect(await screen.findByText(`No ${name} habits yet`)).toBeInTheDocument();
    expect(screen.getByText(`No active ${name} goals`)).toBeInTheDocument();
    expect(screen.getByText(`No ${name} insights yet`)).toBeInTheDocument();
    expect(screen.getByText(`No ${name} scores in this range`)).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText("No readings in this range")).toHaveLength(METRIC_KEYS[id].length));
    expect(container.textContent).not.toMatch(/NaN|undefined|null/);
  });

  it("asks the API for this area's summary and the range from the URL", async () => {
    search = "range=7d";
    mockApi();
    renderArea(4);
    await waitFor(() => expect(get).toHaveBeenCalledWith("/areas/4/summary", { params: { days: 7 } }));
    expect(await screen.findByRole("radio", { name: "7D" })).toHaveAttribute("aria-checked", "true");
  });

  it("changing the range updates the URL", async () => {
    const user = userEvent.setup();
    mockApi();
    renderArea(1);
    await user.click(await screen.findByRole("radio", { name: "90D" }));
    expect(replace).toHaveBeenCalledWith("/work?range=90d", { scroll: false });
  });
});

describe("area page with data", () => {
  it("shows score, change, a gapped trend with its average, habit rates, goals and compact insights", async () => {
    const series = dayKeys(30).map((date, i) => ({ date, score: i % 5 === 2 ? null : 6 + (i % 3) }));
    mockApi({
      summary: (id) =>
        summary(id, {
          score: 7.2,
          delta: 0.8,
          series,
          habits: [{ habit_id: 11, title: "Deep work", life_area_id: 4, current_streak: 3, completed_30: 20, expected_30: 30, rate_30: 66.7 }],
          recommendations: [rec()],
        }),
      habits: [{ id: 11, user_id: 7, life_area_id: 4, title: "Deep work", description: null, frequency: "daily", frequency_days: null, target_count: 1, current_streak: 3, longest_streak: 5, total_completions: 20, last_completed_date: null, is_active: true, created_at: "" }],
      goals: [{ id: 5, user_id: 7, life_area_id: 4, title: "Ship it", description: null, why: null, status: "active", priority: 3, progress_pct: 40, target_date: null, completed_at: null, milestones: [], created_at: "", updated_at: "" }],
    });
    renderArea(4);

    expect(await screen.findByText("7.2")).toBeInTheDocument();
    expect(screen.getByText("up 0.8")).toBeInTheDocument();
    expect(screen.getByText("vs previous 30 days")).toBeInTheDocument();

    const chart = await screen.findAllByTestId("line-chart");
    const rows = JSON.parse(chart[0].getAttribute("data-rows")!);
    expect(rows).toHaveLength(30);
    expect(rows[2].score).toBeNull();
    expect(rows.some((r: { score: number | null }) => r.score === 0)).toBe(false);
    expect(rows[6].avg).not.toBeNull();
    expect(screen.getAllByTestId("line-series-score")[0]).toHaveAttribute("data-connect-nulls", "false");
    expect(screen.getAllByTestId("line-series-avg")[0]).toHaveAttribute("data-dash", "4 4");

    expect(await screen.findByText("67% · 30 days")).toBeInTheDocument();
    expect(screen.getByText("Ship it")).toBeInTheDocument();

    // Compact insight: top insight and two actions, no rating or expand.
    expect(screen.getByText("Sleep drives your mood")).toBeInTheDocument();
    expect(screen.getByText("Walk at 8am")).toBeInTheDocument();
    expect(screen.getByText("Stretch")).toBeInTheDocument();
    expect(screen.queryByText("Third")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Rate \d of 5/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /More/ })).not.toBeInTheDocument();

    // Work also shows the Focus signal.
    expect(screen.getByRole("heading", { name: "Focus" })).toBeInTheDocument();
  });

  it("shows learning sessions on Growth but not the Focus panel", async () => {
    mockApi();
    renderArea(6);
    expect(await screen.findByRole("heading", { name: "Learning sessions" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Focus" })).not.toBeInTheDocument();
  });
});

describe("logging a metric inline", () => {
  it("appears in the chart without a reload", async () => {
    const user = userEvent.setup();
    let points: { date: string; value: number; n: number }[] = [];
    post.mockImplementation(() => {
      points = [{ date: "2026-03-30", value: 7.5, n: 1 }];
      return Promise.resolve({ data: {} });
    });
    mockApi({
      series: () => ({
        key: "sleep_hours", area_id: 1, days: 30, unit: "hours", points,
        latest: points[0] ?? null, average: points[0]?.value ?? null, delta: null,
      }),
    });
    renderArea(1);

    const sleep = (await screen.findByRole("heading", { name: "Sleep Hours" })).closest("section")!;
    expect(await within(sleep).findByText("No readings in this range")).toBeInTheDocument();

    await user.click(within(sleep).getByRole("button", { name: "Log value, Sleep Hours" }));
    const dialogTitle = await screen.findByText("Log Sleep Hours");
    expect(dialogTitle).toBeInTheDocument();
    // Area and metric pickers are hidden: the form is locked to this metric.
    expect(screen.queryByText("Life area")).not.toBeInTheDocument();
    expect(screen.queryByText("Custom…")).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("0"), "7.5");
    await user.click(screen.getByRole("button", { name: "Log reading" }));

    expect(post).toHaveBeenCalledWith(
      "/metrics",
      expect.objectContaining({ life_area_id: 1, metric_key: "sleep_hours", value_numeric: 7.5, unit: "hours" })
    );
    await waitFor(() => expect(within(sleep).getByText("7.5 hours")).toBeInTheDocument());
    expect(within(sleep).queryByText("No readings in this range")).not.toBeInTheDocument();
    expect(screen.queryByText("Log Sleep Hours")).not.toBeInTheDocument();
  });
});

describe("InsightCard compact variant", () => {
  it("omits rating, expand and extra actions", () => {
    render(<InsightCard rec={rec()} compact />);
    expect(screen.getByText("Walk at 8am")).toBeInTheDocument();
    expect(screen.queryByText("Third")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /More/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dismiss insight" })).not.toBeInTheDocument();
  });

  it("keeps the full controls by default", () => {
    render(<InsightCard rec={rec()} onDismiss={() => {}} onRate={() => {}} />);
    expect(screen.getByText("Third")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss insight" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Rate \d of 5/ })).toHaveLength(5);
  });
});

describe("old area URLs", () => {
  it("redirect to the six-area routes, and /learning stays a real page", async () => {
    const config = (await import("../next.config.mjs")).default as { redirects: () => Promise<{ source: string; destination: string }[]> };
    const map = Object.fromEntries((await config.redirects()).map((r) => [r.source, r.destination]));
    expect(map).toMatchObject({
      "/finances": "/money",
      "/social": "/relationships",
      "/career": "/work",
      "/productivity": "/work",
      "/mental": "/mind",
    });
    expect(map["/learning"]).toBeUndefined();
  });
});

describe("InsightCard resilience", () => {
  it("renders a recommendation whose raw_response is missing", () => {
    const broken = { ...rec(), raw_response: undefined } as unknown as AIRecommendation;
    render(<InsightCard rec={broken} compact />);
    expect(screen.getByText("A steady day")).toBeInTheDocument();
  });
});
