"use client";
import { useState } from "react";
import { Plus, Zap } from "lucide-react";
import { HabitCard } from "@/components/habits/HabitCard";
import { CreateEditHabitModal } from "@/components/habits/CreateEditHabitModal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHabitsList, useHabitMutations, useLogHabitToday } from "@/lib/hooks/useHabits";
import { useHabitsToday } from "@/lib/hooks/useDashboard";
import type { Habit } from "@/types";

import { EmptyState } from "@/components/ui/empty-state";
export default function HabitsPage() {
  const { data: habits, isLoading } = useHabitsList();
  const { data: habitsToday } = useHabitsToday();
  const { createMutation, updateMutation, deleteMutation } = useHabitMutations();
  const logHabit = useLogHabitToday();

  const [loggingId, setLoggingId] = useState<number | null>(null);
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
    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  };

  // Same one-tap logging as the dashboard: instant, rolled back on error, with Undo.
  const handleLog = async (habit: Habit) => {
    setLoggingId(habit.id);
    try {
      await logHabit.log(habit);
    } finally {
      setLoggingId(null);
    }
  };

  const totalToday = habitsToday?.length ?? 0;
  const completedToday = completedIds.size;

  return (
    <>
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
          <EmptyState
            icon={Zap}
            title="No habits yet"
            description="A habit is a small action you repeat, like a 20-minute walk. Tick it off each day to build a streak and lift its life area's score."
            action={{ label: "Add your first habit", onClick: openCreate }}
            className="py-16"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {habits?.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                completedToday={completedIds.has(habit.id)}
                onLog={() => handleLog(habit)}
                onEdit={() => openEdit(habit)}
                onDelete={() => handleDelete(habit.id)}
                isLogging={loggingId === habit.id}
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
    </>
  );
}
