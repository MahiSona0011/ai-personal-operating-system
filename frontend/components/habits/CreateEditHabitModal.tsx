"use client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LIFE_AREAS } from "@/types";
import type { Habit } from "@/types";

const schema = z.object({
  title: z.string().min(1, "Title is required").max(120),
  life_area_id: z.coerce.number().min(1),
  frequency: z.enum(["daily", "weekly"]),
  target_count: z.coerce.number().min(1).max(99),
});

type FormData = z.infer<typeof schema>;

interface CreateEditHabitModalProps {
  habit?: Habit;
  onSave: (data: FormData) => Promise<void>;
  onClose: () => void;
  isSaving?: boolean;
}

export function CreateEditHabitModal({
  habit,
  onSave,
  onClose,
  isSaving,
}: CreateEditHabitModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: habit?.title ?? "",
      life_area_id: habit?.life_area_id ?? 1,
      frequency: (habit?.frequency as "daily" | "weekly") ?? "daily",
      target_count: habit?.target_count ?? 1,
    },
  });

  useEffect(() => {
    reset({
      title: habit?.title ?? "",
      life_area_id: habit?.life_area_id ?? 1,
      frequency: (habit?.frequency as "daily" | "weekly") ?? "daily",
      target_count: habit?.target_count ?? 1,
    });
  }, [habit?.id]);

  const onSubmit = async (data: FormData) => {
    await onSave(data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface border border-border rounded-xl shadow-xl w-full max-w-md p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">
            {habit ? "Edit Habit" : "New Habit"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-elevated"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Habit title
            </label>
            <Input
              {...register("title")}
              placeholder="e.g. Morning meditation"
              autoFocus
            />
            {errors.title && (
              <p className="text-xs text-destructive-fg">{errors.title.message}</p>
            )}
          </div>

          {/* Life Area */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Life area
            </label>
            <select
              {...register("life_area_id")}
              className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {LIFE_AREAS.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </div>

          {/* Frequency + Target in a row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Frequency
              </label>
              <select
                {...register("frequency")}
                className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Times per day
              </label>
              <Input
                {...register("target_count")}
                type="number"
                min={1}
                max={99}
              />
              {errors.target_count && (
                <p className="text-xs text-destructive-fg">{errors.target_count.message}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSaving}>
              {isSaving ? (
                <Loader2 size={14} className="animate-spin mr-1.5" />
              ) : null}
              {habit ? "Save Changes" : "Create Habit"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
