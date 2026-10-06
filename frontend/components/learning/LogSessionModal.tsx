"use client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { LIFE_AREAS } from "@/types";

const SESSION_TYPES = [
  { value: "deep_work", label: "Deep Work" },
  { value: "learning", label: "Learning" },
  { value: "exercise", label: "Exercise" },
  { value: "reading", label: "Reading" },
  { value: "practice", label: "Practice" },
  { value: "meeting", label: "Meeting" },
  { value: "other", label: "Other" },
];

const schema = z.object({
  life_area_id: z.coerce.number().min(1),
  session_type: z.string().min(1),
  title: z.string().min(1, "Title is required").max(255),
  notes: z.string().max(2000).optional(),
  started_at: z.string().min(1, "Start time required"),
  duration_minutes: z.coerce.number().min(1).max(1440).optional(),
  quality_rating: z.coerce.number().min(1).max(5).optional(),
});

type FormValues = z.infer<typeof schema>;

interface LogSessionModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FormValues & { ended_at?: string }) => void;
  isLoading?: boolean;
}

export function LogSessionModal({ open, onClose, onSubmit, isLoading }: LogSessionModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      life_area_id: 1,
      session_type: "deep_work",
      title: "",
      notes: "",
      started_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      duration_minutes: 60,
      quality_rating: undefined,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        life_area_id: 1,
        session_type: "deep_work",
        title: "",
        notes: "",
        started_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        duration_minutes: 60,
        quality_rating: undefined,
      });
    }
  }, [open, reset]);

  const selectedArea = watch("life_area_id");
  const selectedType = watch("session_type");
  const selectedQuality = watch("quality_rating");

  function handleFormSubmit(data: FormValues) {
    const started = new Date(data.started_at);
    const ended = data.duration_minutes
      ? new Date(started.getTime() + data.duration_minutes * 60_000)
      : undefined;
    onSubmit({
      ...data,
      started_at: started.toISOString(),
      ended_at: ended?.toISOString(),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Session</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4">
          {/* Area + Type row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-fg-secondary">Life Area</label>
              <Select
                value={String(selectedArea)}
                onValueChange={(v) => setValue("life_area_id", Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LIFE_AREAS.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-fg-secondary">Type</label>
              <Select value={selectedType} onValueChange={(v) => setValue("session_type", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-fg-secondary">What did you work on?</label>
            <Input placeholder="Session title..." {...register("title")} />
            {errors.title && <p className="text-xs text-destructive-fg">{errors.title.message}</p>}
          </div>

          {/* Start time + Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-fg-secondary">Started at</label>
              <Input type="datetime-local" {...register("started_at")} />
              {errors.started_at && <p className="text-xs text-destructive-fg">{errors.started_at.message}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-fg-secondary">Duration (min)</label>
              <Input type="number" min={1} max={1440} placeholder="60" {...register("duration_minutes")} />
            </div>
          </div>

          {/* Quality rating */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-fg-secondary">Quality (optional)</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setValue("quality_rating", n)}
                  className={`h-8 w-8 rounded-full text-sm font-medium border transition-colors ${
                    selectedQuality === n
                      ? "bg-accent-solid text-accent-foreground border-accent"
                      : "border-border text-fg-secondary hover:border-accent"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-fg-secondary">Notes (optional)</label>
            <Input placeholder="What did you accomplish?" {...register("notes")} />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving…" : "Log session"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
