"use client";
import { useState } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { HabitCard } from "@/components/habits/HabitCard";
import { GoalCard } from "@/components/goals/GoalCard";
import { CreateEditHabitModal } from "@/components/habits/CreateEditHabitModal";
import { CreateEditGoalModal } from "@/components/goals/CreateEditGoalModal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHabitsList, useHabitMutations } from "@/lib/hooks/useHabits";
import { useHabitsToday } from "@/lib/hooks/useDashboard";
import { useGoalsList, useGoalMutations } from "@/lib/hooks/useGoals";
import { LIFE_AREAS } from "@/types";
import type { Habit, Goal } from "@/types";

interface LifeAreaPageProps {
  areaIds: number[];
}

export function LifeAreaPage({ areaIds }: LifeAreaPageProps) {
  const areas = LIFE_AREAS.filter((a) => areaIds.includes(a.id));
  const primaryArea = areas[0];

  const { data: habits, isLoading: habitsLoading } = useHabitsList();
  const { data: habitsToday } = useHabitsToday();
  const { createMutation, updateMutation, deleteMutation, logMutation } = useHabitMutations();

  const { data: goals, isLoading: goalsLoading } = useGoalsList();
  const { createMutation: createGoal, updateMutation: updateGoal, deleteMutation: deleteGoal, completeMutation: completeGoal, completeMilestoneMutation } = useGoalMutations();

  const [habitModalOpen, setHabitModalOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | undefined>();
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>();

  const completedIds = new Set(
    habitsToday?.filter((h) => h.completed_today).map((h) => h.id) ?? []
  );

  const areaHabits = habits?.filter((h) => areaIds.includes(h.life_area_id)) ?? [];
  const areaGoals = goals?.filter((g) => areaIds.includes(g.life_area_id) && !g.completed_at) ?? [];

  const title = areas.length === 1 ? primaryArea.name : areas.map((a) => a.name).join(" & ");

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              {areas.map((area) => (
                <div
                  key={area.id}
                  className="w-3 h-3 rounded-full"
                  style={{ background: area.color }}
                />
              ))}
              <h1 className="text-2xl font-bold">{title}</h1>
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              {areaHabits.length} habits · {areaGoals.length} active goals
            </p>
          </div>
        </div>

        {/* Habits */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">Habits</h2>
            <Button size="sm" variant="outline" onClick={() => { setEditingHabit(undefined); setHabitModalOpen(true); }}>
              <Plus size={14} className="mr-1" /> New Habit
            </Button>
          </div>
          {habitsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : areaHabits.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
              No habits yet for {title}. Create one to start tracking.
            </div>
          ) : (
            <div className="space-y-3">
              {areaHabits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  completedToday={completedIds.has(habit.id)}
                  onLog={() => logMutation.mutate({ id: habit.id, log_date: format(new Date(), "yyyy-MM-dd") })}
                  onEdit={() => { setEditingHabit(habit); setHabitModalOpen(true); }}
                  onDelete={() => deleteMutation.mutate(habit.id)}
                  isLogging={logMutation.isPending}
                />
              ))}
            </div>
          )}
        </section>

        {/* Goals */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">Active Goals</h2>
            <Button size="sm" variant="outline" onClick={() => { setEditingGoal(undefined); setGoalModalOpen(true); }}>
              <Plus size={14} className="mr-1" /> New Goal
            </Button>
          </div>
          {goalsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          ) : areaGoals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
              No active goals for {title}. Set one to stay on track.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {areaGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={() => { setEditingGoal(goal); setGoalModalOpen(true); }}
                  onDelete={() => deleteGoal.mutate(goal.id)}
                  onComplete={() => completeGoal.mutate(goal.id)}
                  onCompleteMilestone={(milestoneId) =>
                    completeMilestoneMutation.mutate({ goalId: goal.id, milestoneId })
                  }
                />
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
              await createMutation.mutateAsync({ ...data, life_area_id: data.life_area_id ?? primaryArea.id });
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
            createGoal.mutate({ ...data, life_area_id: data.life_area_id ?? primaryArea.id });
          }
          setGoalModalOpen(false);
        }}
        isLoading={createGoal.isPending || updateGoal.isPending}
      />
    </DashboardLayout>
  );
}
