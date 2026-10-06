import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ default: api }));
vi.mock("sonner", () => {
  const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
  return { toast, Toaster: () => null };
});
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

import { toast } from "sonner";
import { createQueryClient } from "@/lib/query-client";
import { ConfirmHost } from "@/components/ui/confirm-host";
import { confirm, confirmDelete } from "@/lib/confirm";
import { useHabitMutations } from "@/lib/hooks/useHabits";
import { useGoalMutations } from "@/lib/hooks/useGoals";
import { useAnalysisMutations } from "@/lib/hooks/useAnalysis";
import { HabitCard } from "@/components/habits/HabitCard";
import { GoalCard } from "@/components/goals/GoalCard";
import { JournalEntryCard } from "@/components/journal/JournalEntryCard";
import { MetricCard } from "@/components/metrics/MetricCard";
import { SessionCard } from "@/components/learning/SessionCard";
import type { Goal, Habit } from "@/types";

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        {children}
        <ConfirmHost />
      </QueryClientProvider>
    );
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue({ data: [] });
});

describe("no mutation fails silently", () => {
  it("a 500 on create-habit shows an error toast", async () => {
    api.post.mockRejectedValue({ response: { status: 500, data: {} } });
    const client = createQueryClient();
    const { result } = renderHook(() => useHabitMutations(), { wrapper: wrapperFor(client) });

    await act(async () => {
      await result.current.createMutation.mutateAsync({ life_area_id: 1, title: "Read" }).catch(() => {});
    });
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith("The server hit a problem. Please try again shortly.");
  });

  it("shows the API's own message when it has one", async () => {
    api.post.mockRejectedValue({ response: { status: 400, data: { detail: "Habit title already used" } } });
    const { result } = renderHook(() => useHabitMutations(), { wrapper: wrapperFor(createQueryClient()) });
    await act(async () => {
      await result.current.createMutation.mutateAsync({ life_area_id: 1, title: "Read" }).catch(() => {});
    });
    expect(toast.error).toHaveBeenCalledWith("Habit title already used");
  });

  it("uses the mutation's fallback message when the error has no detail", async () => {
    api.post.mockRejectedValue({ response: { status: 400, data: {} } });
    const { result } = renderHook(() => useGoalMutations(), { wrapper: wrapperFor(createQueryClient()) });
    await act(async () => {
      await result.current.createMutation.mutateAsync({ life_area_id: 1, title: "x" }).catch(() => {});
    });
    expect(toast.error).toHaveBeenCalledWith("Couldn't create the goal");
  });

  it("shows a success toast for creates", async () => {
    api.post.mockResolvedValue({ data: { id: 1 } });
    const { result } = renderHook(() => useHabitMutations(), { wrapper: wrapperFor(createQueryClient()) });
    await act(async () => {
      await result.current.createMutation.mutateAsync({ life_area_id: 1, title: "Read" });
    });
    expect(toast.success).toHaveBeenCalledWith("Habit created", { description: undefined });
  });

  it("every mutation hook declares an error message", async () => {
    // Guards against a future mutation being added without feedback: each one must be
    // covered by the global handler, which only needs an error to fire. Spot-check the lot.
    const client = createQueryClient();
    const wrapper = wrapperFor(client);
    api.post.mockRejectedValue({ response: { status: 500, data: {} } });
    api.patch.mockRejectedValue({ response: { status: 500, data: {} } });
    api.delete.mockRejectedValue({ response: { status: 500, data: {} } });

    const habits = renderHook(() => useHabitMutations(), { wrapper }).result;
    const goals = renderHook(() => useGoalMutations(), { wrapper }).result;
    const analysis = renderHook(() => useAnalysisMutations(), { wrapper }).result;
    const calls: Promise<unknown>[] = [
      habits.current.updateMutation.mutateAsync({ id: 1, data: {} }),
      habits.current.deleteMutation.mutateAsync(1),
      habits.current.logMutation.mutateAsync({ id: 1, log_date: "2026-01-01" }),
      goals.current.updateMutation.mutateAsync({ id: 1, data: {} }),
      goals.current.deleteMutation.mutateAsync(1),
      goals.current.completeMutation.mutateAsync(1),
      analysis.current.rateMutation.mutateAsync({ id: 1, rating: 5 }),
      analysis.current.onDemandMutation.mutateAsync({ question: "?" }),
    ];
    await act(async () => {
      await Promise.allSettled(calls);
    });
    expect(toast.error).toHaveBeenCalledTimes(calls.length);
  });
});

describe("confirm()", () => {
  it("resolves true on confirm and false on cancel", async () => {
    const user = userEvent.setup();
    render(<ConfirmHost />);

    const yes = confirm({ title: "Delete it?", confirmLabel: "Delete", destructive: true });
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await expect(yes).resolves.toBe(true);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());

    const no = confirm({ title: "Delete it?" });
    await screen.findByRole("alertdialog");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await expect(no).resolves.toBe(false);
  });

  it("escape cancels", async () => {
    const user = userEvent.setup();
    render(<ConfirmHost />);
    const result = confirmDelete("“Read”");
    await screen.findByText("Delete “Read”?");
    await user.keyboard("{Escape}");
    await expect(result).resolves.toBe(false);
  });
});

const habit = { id: 5, title: "Read 20 minutes", life_area_id: 2, current_streak: 0, longest_streak: 0, total_completions: 0, target_count: 1 } as unknown as Habit;

describe("deleting needs confirmation", () => {
  it("habit: cancel keeps it, confirm deletes it", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<HabitCard habit={habit} completedToday={false} onLog={() => {}} onEdit={() => {}} onDelete={onDelete} />, {
      wrapper: wrapperFor(createQueryClient()),
    });

    await user.click(screen.getByRole("button", { name: "Delete habit: Read 20 minutes" }));
    expect(await screen.findByText("Delete “Read 20 minutes”?")).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Delete habit: Read 20 minutes" }));
    await user.click(await screen.findByRole("button", { name: "Delete" }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
  });

  it("goal, journal entry, metric reading and session all ask first", async () => {
    const user = userEvent.setup();
    const wrapper = wrapperFor(createQueryClient());
    const goal = { id: 1, title: "Ship", life_area_id: 4, status: "active", priority: 2, progress_pct: 0, target_date: null, completed_at: null, milestones: [] } as unknown as Goal;
    const onDelete = vi.fn();

    const goalView = render(
      <GoalCard goal={goal} onEdit={() => {}} onDelete={onDelete} onComplete={() => {}} onCompleteMilestone={() => {}} />,
      { wrapper }
    );
    await user.click(screen.getByRole("button", { name: "Delete goal: Ship" }));
    expect(onDelete).not.toHaveBeenCalled();
    await user.click(await screen.findByRole("button", { name: "Cancel" }));
    goalView.unmount();

    const entry = { id: 2, entry_date: "2026-03-01", title: "A day", content: "x", mood_tag: null, life_area_tags: [] } as never;
    const journalView = render(<JournalEntryCard entry={entry} onSelect={() => {}} onEdit={() => {}} onDelete={onDelete} />, { wrapper });
    await user.click(screen.getByRole("button", { name: "Delete entry" }));
    expect(await screen.findByText("Delete “A day”?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    journalView.unmount();

    const metric = { id: 3, life_area_id: 1, metric_key: "sleep_hours", metric_date: "2026-03-01", value_numeric: 7, unit: "h" } as never;
    const metricView = render(<MetricCard metric={metric} onSelect={() => {}} onEdit={() => {}} onDelete={onDelete} />, { wrapper });
    await user.click(screen.getByRole("button", { name: "Delete Sleep Hours reading" }));
    expect(await screen.findByText("Delete this Sleep Hours reading?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    metricView.unmount();

    const session = { id: 4, life_area_id: 4, session_type: "deep_work", title: "Block", started_at: "2026-03-01T10:00:00Z", duration_minutes: 60, quality_rating: 4 } as never;
    render(<SessionCard session={session} onDelete={onDelete} />, { wrapper });
    await user.click(screen.getByRole("button", { name: "Delete session: Block" }));
    expect(await screen.findByText("Delete “Block”?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onDelete).not.toHaveBeenCalled();
  });
});

describe("goal deadlines", () => {
  const goal = (target: string) =>
    ({ id: 1, title: "Ship", life_area_id: 4, status: "active", priority: 2, progress_pct: 0, target_date: target, completed_at: null, milestones: [] }) as unknown as Goal;
  const iso = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  it.each([
    [-3, "3 days overdue", "overdue", "text-destructive-fg"],
    [4, "4 days left", "soon", "text-warning-fg"],
    [40, "40 days left", "ok", "text-fg-secondary"],
  ])("offset %i shows %s in the %s tone", (offset, label, tone, cls) => {
    render(<GoalCard goal={goal(iso(offset))} onEdit={() => {}} onDelete={() => {}} onComplete={() => {}} onCompleteMilestone={() => {}} />, {
      wrapper: wrapperFor(createQueryClient()),
    });
    const el = screen.getByText(`· ${label}`);
    expect(el).toHaveAttribute("data-deadline", tone);
    expect(el.className).toContain(cls);
  });
});

describe("undo for reversible actions", () => {
  it("ticking a milestone is optimistic, offers Undo, and Undo un-ticks it", async () => {
    const client = createQueryClient();
    const goal = { id: 1, title: "Ship", progress_pct: 0, milestones: [{ id: 10, goal_id: 1, title: "a", is_completed: false }, { id: 11, goal_id: 1, title: "b", is_completed: false }] };
    client.setQueryData(["goals", "list"], [goal]);
    api.post.mockResolvedValue({ data: {} });
    api.get.mockResolvedValue({ data: [goal] });
    const { result } = renderHook(() => useGoalMutations(), { wrapper: wrapperFor(client) });

    await act(async () => {
      await result.current.completeMilestoneMutation.mutate({ goalId: 1, milestoneId: 10, title: "a" });
    });
    expect(api.post).toHaveBeenCalledWith("/goals/1/milestones/10/complete");
    const [label, opts] = (toast as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(label).toBe("Milestone done: a");

    await act(async () => {
      opts.action.onClick();
    });
    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/goals/1/milestones/10/uncomplete"));
  });

  it("a failed milestone tick rolls back and shows an error", async () => {
    const client = createQueryClient();
    const goal = { id: 1, title: "Ship", progress_pct: 0, milestones: [{ id: 10, goal_id: 1, title: "a", is_completed: false }] };
    client.setQueryData(["goals", "list"], [goal]);
    api.post.mockRejectedValue({ response: { status: 500, data: {} } });
    api.get.mockResolvedValue({ data: [goal] });
    const { result } = renderHook(() => useGoalMutations(), { wrapper: wrapperFor(client) });

    await act(async () => {
      await result.current.completeMilestoneMutation.mutate({ goalId: 1, milestoneId: 10 });
    });
    expect(toast.error).toHaveBeenCalled();
    const after = client.getQueryData<(typeof goal)[]>(["goals", "list"])!;
    expect(after[0].milestones[0].is_completed).toBe(false);
  });

  it("dismissing an insight removes it at once and Undo restores it", async () => {
    const client = createQueryClient();
    const recs = [{ id: 1 }, { id: 2 }];
    client.setQueryData(["analysis", "recommendations", { limit: 10 }], recs);
    api.patch.mockResolvedValue({ data: {} });
    api.get.mockResolvedValue({ data: recs });
    const { result } = renderHook(() => useAnalysisMutations(), { wrapper: wrapperFor(client) });

    await act(async () => {
      await result.current.dismissMutation.mutateAsync(1);
    });
    expect(api.patch).toHaveBeenCalledWith("/analysis/recommendations/1", { is_dismissed: true });
    const [label, opts] = (toast as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(label).toBe("Insight dismissed");

    await act(async () => {
      opts.action.onClick();
    });
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith("/analysis/recommendations/1", { is_dismissed: false }));
  });

  it("a failed dismissal puts the insight back", async () => {
    const client = createQueryClient();
    const key = ["analysis", "recommendations", { limit: 10 }];
    client.setQueryData(key, [{ id: 1 }, { id: 2 }]);
    api.patch.mockRejectedValue({ response: { status: 500, data: {} } });
    api.get.mockResolvedValue({ data: [{ id: 1 }, { id: 2 }] });
    const { result } = renderHook(() => useAnalysisMutations(), { wrapper: wrapperFor(client) });

    await act(async () => {
      await result.current.dismissMutation.mutateAsync(1).catch(() => {});
    });
    expect(toast.error).toHaveBeenCalled();
    expect(client.getQueryData<{ id: number }[]>(key)).toHaveLength(2);
  });
});
