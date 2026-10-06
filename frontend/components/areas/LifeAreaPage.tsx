"use client";
import { Suspense, useState } from "react";
import { Plus, Sparkles, Target, Zap } from "lucide-react";
import { HabitCard } from "@/components/habits/HabitCard";
import { GoalCard } from "@/components/goals/GoalCard";
import { CreateEditHabitModal } from "@/components/habits/CreateEditHabitModal";
import { CreateEditGoalModal } from "@/components/goals/CreateEditGoalModal";
import { InsightCard } from "@/components/analysis/InsightCard";
import { AreaScoreChart } from "@/components/areas/AreaScoreChart";
import { MetricSmallMultiple } from "@/components/areas/MetricSmallMultiple";
import { FocusPanel } from "@/components/areas/FocusPanel";
import { LearningPanel } from "@/components/areas/LearningPanel";
import { Button } from "@/components/ui/button";
import { Delta } from "@/components/ui/delta";
import { EmptyState } from "@/components/ui/empty-state";
import { RangeTabs } from "@/components/ui/range-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useHabitMutations, useHabitsList, useLogHabitToday } from "@/lib/hooks/useHabits";
import { useAreaSummary, useHabitsToday } from "@/lib/hooks/useDashboard";
import { useGoalMutations, useGoalsList } from "@/lib/hooks/useGoals";
import { useAnalysisMutations } from "@/lib/hooks/useAnalysis";
import { useRangeParam } from "@/lib/hooks/useRangeParam";
import { AREA_BY_ID } from "@/lib/areas";
import { METRIC_KEYS } from "@/types";
import type { Goal, Habit } from "@/types";
import { cn } from "@/lib/utils/cn";

/** Metric keys to chart: the area's presets first, then any custom key the user has logged. */
function metricList(areaId: number, logged: { key: string; unit: string | null }[] | undefined) {
  const presets = METRIC_KEYS[areaId] ?? [];
  const known = new Set(presets.map((p) => p.key));
  const custom = (logged ?? [])
    .filter((m) => !known.has(m.key))
    .map((m) => ({ key: m.key, label: m.key.replace(/_/g, " "), defaultUnit: m.unit ?? "" }));
  return [...presets, ...custom];
}

function AreaPageContent({ areaId }: { areaId: number }) {
  const area = AREA_BY_ID[areaId];
  const [range, setRange] = useRangeParam();
  const { data: summary, isLoading, isError, refetch } = useAreaSummary(areaId, range);

  const { data: habits, isLoading: habitsLoading } = useHabitsList();
  const { data: habitsToday } = useHabitsToday();
  const { createMutation, updateMutation, deleteMutation } = useHabitMutations();
  const logHabit = useLogHabitToday();
  const { data: goals, isLoading: goalsLoading } = useGoalsList();
  const { createMutation: createGoal, updateMutation: updateGoal, deleteMutation: deleteGoal, completeMutation: completeGoal, completeMilestoneMutation } = useGoalMutations();
  const { dismissMutation } = useAnalysisMutations();

  const [habitModalOpen, setHabitModalOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | undefined>();
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>();

  const completedIds = new Set(habitsToday?.filter((h) => h.completed_today).map((h) => h.id) ?? []);
  const rates = new Map((summary?.habits ?? []).map((h) => [h.habit_id, h.rate_30]));
  const areaHabits = habits?.filter((h) => h.life_area_id === areaId) ?? [];
  const areaGoals = goals?.filter((g) => g.life_area_id === areaId && !g.completed_at && g.status !== "completed") ?? [];
  const metrics = metricList(areaId, summary?.metrics);

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span aria-hidden className={cn("h-3 w-3 rounded-full", area.dot)} />
              <h1 className="text-2xl font-semibold text-foreground">{area.name}</h1>
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              {isLoading ? (
                <Skeleton className="h-9 w-28" />
              ) : summary?.score != null ? (
                <>
                  <span className="text-4xl font-bold tabular-nums text-foreground">{summary.score.toFixed(1)}</span>
                  <Delta delta={summary.delta} suffix={summary.delta == null ? "no earlier data" : `vs previous ${range === 365 ? "year" : `${range} days`}`} />
                </>
              ) : (
                <span className="text-sm text-fg-secondary">No {area.name} score in this range yet.</span>
              )}
            </div>
          </div>
          <RangeTabs value={range} onChange={setRange} />
        </header>

        {isError && (
          <EmptyState
            title="Couldn't load this page"
            description="Check your connection and try again."
            action={{ label: "Retry", onClick: () => refetch() }}
          />
        )}

        {/* Score trend */}
        <AreaScoreChart areaName={area.name} series={summary?.series} range={range} color={area.color} loading={isLoading} />

        {/* Work: the Focus signal */}
        {areaId === 4 && <FocusPanel range={range} color={area.color} />}

        {/* Metrics */}
        <section aria-label="Metrics" className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Metrics</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {metrics.map((m) => (
              <MetricSmallMultiple
                key={m.key}
                areaId={areaId}
                metricKey={m.key}
                label={m.label}
                defaultUnit={m.defaultUnit}
                range={range}
                color={area.color}
              />
            ))}
          </div>
        </section>

        {/* Habits */}
        <section aria-label="Habits">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Habits</h2>
            <Button size="sm" variant="outline" onClick={() => { setEditingHabit(undefined); setHabitModalOpen(true); }}>
              <Plus size={14} className="mr-1" aria-hidden /> New habit
            </Button>
          </div>
          {habitsLoading ? (
            <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
          ) : areaHabits.length === 0 ? (
            <EmptyState
              icon={Zap}
              title={`No ${area.name} habits yet`}
              description="A habit is a small action you repeat. Tick it off daily to build a streak and lift this area's score."
              action={{ label: "Add a habit", onClick: () => { setEditingHabit(undefined); setHabitModalOpen(true); } }}
              className="rounded-xl border border-dashed border-border"
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {areaHabits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  completedToday={completedIds.has(habit.id)}
                  rate30={rates.get(habit.id)}
                  onLog={() => logHabit.log(habit)}
                  onEdit={() => { setEditingHabit(habit); setHabitModalOpen(true); }}
                  onDelete={() => deleteMutation.mutate(habit.id)}
                  isLogging={logHabit.isPending}
                />
              ))}
            </div>
          )}
        </section>

        {/* Goals */}
        <section aria-label="Active goals">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Active goals</h2>
            <Button size="sm" variant="outline" onClick={() => { setEditingGoal(undefined); setGoalModalOpen(true); }}>
              <Plus size={14} className="mr-1" aria-hidden /> New goal
            </Button>
          </div>
          {goalsLoading ? (
            <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
          ) : areaGoals.length === 0 ? (
            <EmptyState
              icon={Target}
              title={`No active ${area.name} goals`}
              description="A goal is an outcome with a target date. Break it into milestones and watch the ring fill."
              action={{ label: "Set a goal", onClick: () => { setEditingGoal(undefined); setGoalModalOpen(true); } }}
              className="rounded-xl border border-dashed border-border"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {areaGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={() => { setEditingGoal(goal); setGoalModalOpen(true); }}
                  onDelete={() => deleteGoal.mutate(goal.id)}
                  onComplete={() => completeGoal.mutate(goal.id)}
                  onCompleteMilestone={(milestoneId) => completeMilestoneMutation.mutate({ goalId: goal.id, milestoneId })}
                />
              ))}
            </div>
          )}
        </section>

        {/* Growth: learning sessions */}
        {areaId === 6 && <LearningPanel areaId={areaId} />}

        {/* AI insights */}
        <section aria-label="AI insights">
          <h2 className="mb-3 text-base font-semibold text-foreground">Insights</h2>
          {isLoading ? (
            <Skeleton className="h-32 rounded-xl" />
          ) : !summary || summary.recommendations.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title={`No ${area.name} insights yet`}
              description={`After your daily check-ins, the AI points out patterns and next steps for ${area.name}. The latest three show here.`}
              action={{ label: "Start a check-in", href: "/checkin" }}
              className="rounded-xl border border-dashed border-border"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {summary.recommendations.map((rec) => (
                <InsightCard key={rec.id} rec={rec} compact onDismiss={(id) => dismissMutation.mutate(id)} />
              ))}
            </div>
          )}
        </section>
      </div>

      {habitModalOpen && (
        <CreateEditHabitModal
          habit={editingHabit}
          onSave={async (data) => {
            if (editingHabit) {
              await updateMutation.mutateAsync({ id: editingHabit.id, data });
            } else {
              await createMutation.mutateAsync({ ...data, life_area_id: data.life_area_id ?? areaId });
            }
          }}
          onClose={() => setHabitModalOpen(false)}
          isSaving={createMutation.isPending || updateMutation.isPending}
        />
      )}

      <CreateEditGoalModal
        open={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        defaultValues={editingGoal}
        onSubmit={(data) => {
          if (editingGoal) {
            updateGoal.mutate({ id: editingGoal.id, data });
          } else {
            createGoal.mutate({ ...data, life_area_id: data.life_area_id ?? areaId });
          }
          setGoalModalOpen(false);
        }}
        isLoading={createGoal.isPending || updateGoal.isPending}
      />
    </>
  );
}

/** One of the six life-area pages. `areaId` is 1-6 (see lib/areas.ts). */
export function LifeAreaPage({ areaId }: { areaId: number }) {
  // The selected range lives in the URL (?range=30d), which needs a Suspense boundary.
  return (
    <Suspense fallback={<><Skeleton className="mx-auto h-64 max-w-5xl rounded-xl" /></>}>
      <AreaPageContent areaId={areaId} />
    </Suspense>
  );
}
