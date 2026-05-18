"use client";
import { useState } from "react";
import { format } from "date-fns";
import { Plus, Zap } from "lucide-react";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { HabitCard } from "@/components/habits/HabitCard";
import { CreateEditHabitModal } from "@/components/habits/CreateEditHabitModal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHabitsList, useHabitMutations } from "@/lib/hooks/useHabits";
import { useHabitsToday } from "@/lib/hooks/useDashboard";
import type { Habit } from "@/types";

export default function HabitsPage() {
  const { data: habits, isLoading } = useHabitsList();
  const { data: habitsToday } = useHabitsToday();
  const { createMutation, updateMutation, deleteMutation, logMutation } = useHabitMutations();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | undefined>();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const completedIds = new Set(
    habitsToday?.filter((h) => h.completed_today).map((h) => h.id) ?? []
  );

  const openCreate = () => {
    setEditing(undefined);
    setModalOpen(true);
  };

  const openEdit = (habit: Habit) => {
    setEditing(habit);
    setModalOpen(true);
  };

  const handleSave = async (data: {
    title: string;
    life_area_id: number;
    frequency: string;
    target_count: number;
  }) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this habit? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleLog = (id: number) => {
    logMutation.mutate({ id, log_date: format(new Date(), "yyyy-MM-dd") });
  };

  const totalToday = habitsToday?.length ?? 0;
  const completedToday = completedIds.size;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Habits</h1>
            {totalToday > 0 && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {completedToday}/{totalToday} completed today
              </p>
            )}
          </div>
          <Button onClick={openCreate} size="sm">
            <Plus size={14} className="mr-1.5" />
            New Habit
          </Button>
        </div>

        {/* Progress bar */}
        {totalToday > 0 && (
          <div className="h-1.5 w-full rounded-full bg-elevated">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${(completedToday / totalToday) * 100}%` }}
            />
          </div>
        )}

        {/* Habit grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-52 rounded-xl" />
            ))}
          </div>
        ) : habits?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-elevated flex items-center justify-center">
              <Zap size={22} className="text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">No habits yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start tracking habits to build streaks and see your progress.
              </p>
            </div>
            <Button onClick={openCreate} size="sm">
              <Plus size={14} className="mr-1.5" />
              Add your first habit
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {habits?.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                completedToday={completedIds.has(habit.id)}
                onLog={() => handleLog(habit.id)}
                onEdit={() => openEdit(habit)}
                onDelete={() => handleDelete(habit.id)}
                isLogging={logMutation.isPending && logMutation.variables?.id === habit.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <CreateEditHabitModal
          habit={editing}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
          isSaving={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </DashboardLayout>
  );
}
