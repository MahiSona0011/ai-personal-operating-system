"use client";
import { useState } from "react";
import { Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GoalCard } from "@/components/goals/GoalCard";
import { CreateEditGoalModal } from "@/components/goals/CreateEditGoalModal";
import { useGoalsList, useGoalMutations } from "@/lib/hooks/useGoals";
import { LIFE_AREAS } from "@/types";
import type { Goal } from "@/types";

export default function GoalsPage() {
  const { data: goals, isLoading } = useGoalsList();
  const {
    createMutation,
    updateMutation,
    deleteMutation,
    completeMutation,
    completeMilestoneMutation,
  } = useGoalMutations();

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Goal | undefined>(undefined);

  const activeGoals = goals?.filter((g) => g.status !== "completed") ?? [];
  const completedGoals = goals?.filter((g) => g.status === "completed") ?? [];
  const completedCount = completedGoals.length;
  const totalCount = goals?.length ?? 0;

  function openCreate() {
    setEditTarget(undefined);
    setModalOpen(true);
  }

  function openEdit(goal: Goal) {
    setEditTarget(goal);
    setModalOpen(true);
  }

  function handleSubmit(data: Parameters<typeof createMutation.mutate>[0]) {
    if (editTarget) {
      updateMutation.mutate(
        { id: editTarget.id, data },
        { onSuccess: () => setModalOpen(false) },
      );
    } else {
      createMutation.mutate(data, { onSuccess: () => setModalOpen(false) });
    }
  }

  // Group active goals by life area
  const byArea = LIFE_AREAS.map((area) => ({
    area,
    goals: activeGoals.filter((g) => g.life_area_id === area.id),
  })).filter((g) => g.goals.length > 0);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--fg-primary))]">Goals</h1>
          {!isLoading && totalCount > 0 && (
            <p className="text-sm text-[hsl(var(--fg-secondary))] mt-0.5">
              {completedCount} of {totalCount} completed
            </p>
          )}
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus size={15} className="mr-1" /> New goal
        </Button>
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && activeGoals.length === 0 && completedGoals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <Target size={40} className="text-[hsl(var(--fg-secondary))]" />
          <p className="text-[hsl(var(--fg-secondary))]">No goals yet. Set your first intention.</p>
          <Button onClick={openCreate}>
            <Plus size={15} className="mr-1" /> Create your first goal
          </Button>
        </div>
      )}

      {/* Active goals grouped by life area */}
      {!isLoading && byArea.length > 0 && (
        <div className="flex flex-col gap-8">
          {byArea.map(({ area, goals: areaGoals }) => (
            <section key={area.id}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold" style={{ color: area.color }}>
                  {area.name}
                </span>
                <span className="text-xs text-[hsl(var(--fg-secondary))]">
                  {areaGoals.length} goal{areaGoals.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {areaGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={openEdit}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    onComplete={(id) => completeMutation.mutate(id)}
                    onCompleteMilestone={(gid, mid) =>
                      completeMilestoneMutation.mutate({ goalId: gid, milestoneId: mid })
                    }
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Completed section */}
      {!isLoading && completedGoals.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold text-[hsl(var(--fg-secondary))] mb-3 uppercase tracking-wider">
            Completed
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-60">
            {completedGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={openEdit}
                onDelete={(id) => deleteMutation.mutate(id)}
                onComplete={(id) => completeMutation.mutate(id)}
                onCompleteMilestone={(gid, mid) =>
                  completeMilestoneMutation.mutate({ goalId: gid, milestoneId: mid })
                }
              />
            ))}
          </div>
        </section>
      )}

      <CreateEditGoalModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
        defaultValues={editTarget}
      />
    </div>
  );
}
