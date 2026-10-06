import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

vi.mock("@/lib/api/client", () => ({
  default: { get: vi.fn(() => Promise.resolve({ data: {} })) },
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => "/checkin",
  useSearchParams: () => new URLSearchParams(),
}));

import { CheckinWizard } from "@/components/checkin/CheckinWizard";
import type { Checkin } from "@/types";

const checkin = (overrides: Partial<Checkin> = {}): Checkin => ({
  id: 7, user_id: 1, checkin_date: "2026-10-07",
  score_health: null, score_mind: null, score_relationships: null, score_work: null, score_money: null, score_growth: null,
  overall_score: null, mood: null, energy: null, wins: null, blockers: null, action_plan: null,
  ai_analysis: null, ai_analyzed_at: null, is_complete: false, completed_at: null, created_at: "2026-10-07T08:00:00Z",
  ...overrides,
});

const withClient = (ui: ReactElement) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>
);

function setup(props: Partial<React.ComponentProps<typeof CheckinWizard>> = {}) {
  const onSave = vi.fn(async (data: Partial<Checkin>) => ({ ...checkin(), ...data }) as Checkin);
  const onComplete = vi.fn(async () => {});
  render(
    withClient(
      <CheckinWizard checkin={checkin()} onSave={onSave} onComplete={onComplete} isSaving={false} isCompleting={false} {...props} />
    )
  );
  return { onSave, onComplete, user: userEvent.setup() };
}

const next = () => screen.getByRole("button", { name: /next/i });
const back = () => screen.getByRole("button", { name: /back/i });

beforeEach(() => push.mockClear());

describe("check-in wizard: step navigation", () => {
  it("starts on the first step, with Back disabled", () => {
    setup();
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
    expect(screen.getByText("Rate each of your six life areas")).toBeInTheDocument();
    expect(back()).toBeDisabled();
  });

  it("saves on every Next and walks through all four steps", async () => {
    const { onSave, user } = setup();

    await user.click(next());
    expect(await screen.findByText("Step 2 of 4")).toBeInTheDocument();
    expect(screen.getByText("How are you feeling today?")).toBeInTheDocument();

    await user.click(next());
    expect(await screen.findByText("Step 3 of 4")).toBeInTheDocument();
    expect(screen.getByText("Wins, blockers, and next actions")).toBeInTheDocument();

    await user.click(next());
    expect(await screen.findByRole("button", { name: /complete check-in/i })).toBeInTheDocument();
    expect(onSave).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole("button", { name: /next/i })).not.toBeInTheDocument(); // the last step has its own button
  });

  it("goes back without saving", async () => {
    const { onSave, user } = setup();
    await user.click(next());
    await screen.findByText("Step 2 of 4");
    onSave.mockClear();

    await user.click(back());
    expect(await screen.findByText("Step 1 of 4")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("stays on the step when a save fails, so nothing typed is lost", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("network"));
    const { user } = setup({ onSave });
    await user.click(next());
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
  });

  it("disables Next while a save is in flight", () => {
    setup({ isSaving: true });
    expect(next()).toBeDisabled();
  });
});

describe("check-in wizard: resuming", () => {
  it("sends the saved scores, mood and energy rather than the defaults", async () => {
    const saved = checkin({ score_health: 8, score_work: 3, mood: 9, energy: 2 });
    const { onSave, user } = setup({ checkin: saved });
    await user.click(next());
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({
      score_health: 8, score_work: 3, score_mind: 5, mood: 9, energy: 2,
    });
  });

  it("shows reflections that were saved earlier", async () => {
    const saved = checkin({ wins: ["Shipped the release"], blockers: ["Slow CI"], action_plan: ["Cache deps"] });
    const { user } = setup({ checkin: saved });
    await user.click(next());
    await user.click(await screen.findByRole("button", { name: /next/i }));
    expect(await screen.findByText("Shipped the release")).toBeInTheDocument();
    expect(screen.getByText("Slow CI")).toBeInTheDocument();
    expect(screen.getByText("Cache deps")).toBeInTheDocument();
  });

  it("hydrates when the check-in arrives after the first render", async () => {
    const onSave = vi.fn(async (d: Partial<Checkin>) => ({ ...checkin(), ...d }) as Checkin);
    const props = { onSave, onComplete: vi.fn(), isSaving: false, isCompleting: false };
    const { rerender } = render(withClient(<CheckinWizard checkin={undefined} {...props} />));
    rerender(withClient(<CheckinWizard checkin={checkin({ score_money: 2 })} {...props} />));

    await userEvent.setup().click(next());
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({ score_money: 2 });
  });
});

describe("check-in wizard: completing", () => {
  async function toLastStep(user: ReturnType<typeof userEvent.setup>) {
    for (let i = 0; i < 3; i++) await user.click(await screen.findByRole("button", { name: /next/i }));
    return screen.findByRole("button", { name: /complete check-in/i });
  }

  it("saves the final answers, then completes", async () => {
    const { onSave, onComplete, user } = setup({ checkin: checkin({ wins: ["Win"] }) });
    const complete = await toLastStep(user);
    onSave.mockClear();

    await user.click(complete);
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.invocationCallOrder[0]).toBeLessThan(onComplete.mock.invocationCallOrder[0]);
    expect(onSave.mock.calls[0][0]).toMatchObject({ wins: ["Win"], mood: 5, energy: 5 });
  });

  it("does not complete when the final save fails", async () => {
    const onSave = vi.fn(async (d: Partial<Checkin>) => ({ ...checkin(), ...d }) as Checkin);
    const { onComplete, user } = setup({ onSave });
    const complete = await toLastStep(user);

    onSave.mockRejectedValueOnce(new Error("offline"));
    await user.click(complete);
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(4));
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /complete check-in/i })).toBeInTheDocument(); // still there to retry
  });

  it("stays on the last step when completing fails", async () => {
    const { onComplete, user } = setup();
    onComplete.mockRejectedValueOnce(new Error("boom"));
    await user.click(await toLastStep(user));
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: /complete check-in/i })).toBeInTheDocument();
  });
});

describe("check-in page", () => {
  const hook = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
  vi.mock("@/lib/hooks/useCheckinWizard", () => ({ useCheckinWizard: () => hook.value }));
  vi.mock("@/lib/toast", () => ({ toastSuccess: vi.fn(), toastError: vi.fn() }));

  async function renderPage() {
    const { default: CheckinPage } = await import("@/app/(dashboard)/checkin/page");
    return render(withClient(<CheckinPage />));
  }

  it("shows a skeleton while the check-in loads", async () => {
    hook.value = { checkin: undefined, isLoading: true };
    const { container } = await renderPage();
    expect(container.querySelector(".animate-pulse, [class*='skeleton']")).not.toBeNull();
    expect(screen.queryByText("Daily Check-In")).not.toBeInTheDocument();
  });

  it("says so when today's check-in is already complete", async () => {
    hook.value = { checkin: checkin({ is_complete: true, ai_analysis: null }), isLoading: false };
    await renderPage();
    expect(screen.getByRole("heading", { name: /already|complete/i })).toBeInTheDocument();
    expect(screen.getByText(/being generated/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to dashboard/i })).toHaveAttribute("href", "/dashboard");
  });

  it("completes through the hook, then goes to the insight on the dashboard", async () => {
    const complete = vi.fn(async () => {});
    const update = vi.fn(async (d: Partial<Checkin>) => ({ ...checkin(), ...d }) as Checkin);
    hook.value = { checkin: checkin(), isLoading: false, update, complete, isUpdating: false, isCompleting: false };
    await renderPage();

    const user = userEvent.setup();
    for (let i = 0; i < 3; i++) await user.click(await screen.findByRole("button", { name: /next/i }));
    await user.click(await screen.findByRole("button", { name: /complete check-in/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard#latest-insight"));
    expect(complete).toHaveBeenCalledTimes(1);
  });
});
