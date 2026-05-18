"use client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { LIFE_AREAS } from "@/types";
import type { Goal } from "@/types";

const schema = z.object({
  life_area_id: z.coerce.number().min(1),
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(2000).optional(),
  why: z.string().max(1000).optional(),
  priority: z.coerce.number().min(1).max(3),
  target_date: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CreateEditGoalModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FormValues) => void;
  isLoading?: boolean;
  defaultValues?: Goal;
}

export function CreateEditGoalModal({
  open,
  onClose,
  onSubmit,
  isLoading,
  defaultValues,
}: CreateEditGoalModalProps) {
  const isEdit = !!defaultValues;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      life_area_id: defaultValues?.life_area_id ?? 1,
      title: defaultValues?.title ?? "",
      description: defaultValues?.description ?? "",
      why: defaultValues?.why ?? "",
      priority: defaultValues?.priority ?? 2,
      target_date: defaultValues?.target_date ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        life_area_id: defaultValues?.life_area_id ?? 1,
        title: defaultValues?.title ?? "",
        description: defaultValues?.description ?? "",
        why: defaultValues?.why ?? "",
        priority: defaultValues?.priority ?? 2,
        target_date: defaultValues?.target_date ?? "",
      });
    }
  }, [open, defaultValues, reset]);

  const selectedArea = watch("life_area_id");
  const selectedPriority = watch("priority");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Goal" : "New Goal"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Life area */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[hsl(var(--fg-secondary))]">Life Area</label>
            <Select
              value={String(selectedArea)}
              onValueChange={(v) => setValue("life_area_id", Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select area" />
              </SelectTrigger>
              <SelectContent>
                {LIFE_AREAS.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.life_area_id && <p className="text-xs text-[hsl(var(--area-health))]">{errors.life_area_id.message}</p>}
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[hsl(var(--fg-secondary))]">Title</label>
            <Input placeholder="What do you want to achieve?" {...register("title")} />
            {errors.title && <p className="text-xs text-[hsl(var(--area-health))]">{errors.title.message}</p>}
          </div>

          {/* Why */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[hsl(var(--fg-secondary))]">Why this matters</label>
            <Input placeholder="Your deeper reason..." {...register("why")} />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[hsl(var(--fg-secondary))]">Description (optional)</label>
            <Input placeholder="Additional context..." {...register("description")} />
          </div>

          {/* Priority + target date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-[hsl(var(--fg-secondary))]">Priority</label>
              <Select
                value={String(selectedPriority)}
                onValueChange={(v) => setValue("priority", Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Low</SelectItem>
                  <SelectItem value="2">Medium</SelectItem>
                  <SelectItem value="3">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-[hsl(var(--fg-secondary))]">Target date</label>
              <Input type="date" {...register("target_date")} />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving…" : isEdit ? "Save changes" : "Create goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
