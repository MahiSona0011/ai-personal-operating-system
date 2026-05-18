"use client";
import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { HabitWithStatus } from "@/types";

interface HabitsSummaryCardProps {
  habits: HabitWithStatus[] | undefined;
  loading?: boolean;
  onLog: (habitId: number) => void;
}

export function HabitsSummaryCard({ habits, loading, onLog }: HabitsSummaryCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Today&apos;s Habits</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
        </CardContent>
      </Card>
    );
  }

  const completed = habits?.filter((h) => h.completed_today).length ?? 0;
  const total = habits?.length ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Today&apos;s Habits</span>
          <span className="text-accent font-bold">{completed}/{total}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {habits?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No habits yet.{" "}
            <Link href="/habits" className="text-accent hover:underline">Add one</Link>
          </p>
        )}
        {habits?.slice(0, 7).map((habit) => (
          <button
            key={habit.id}
            onClick={() => !habit.completed_today && onLog(habit.id)}
            className="w-full flex items-center gap-3 py-1.5 px-2 rounded hover:bg-elevated transition-colors group"
          >
            {habit.completed_today
              ? <CheckCircle2 size={16} className="text-success shrink-0" />
              : <Circle size={16} className="text-muted-foreground group-hover:text-accent shrink-0" />
            }
            <span className={`text-sm truncate ${habit.completed_today ? "line-through text-muted-foreground" : ""}`}>
              {habit.title}
            </span>
            {habit.current_streak > 0 && (
              <span className="ml-auto text-xs text-muted-foreground shrink-0">{habit.current_streak}🔥</span>
            )}
          </button>
        ))}
        {(habits?.length ?? 0) > 7 && (
          <Link href="/habits" className="text-xs text-accent hover:underline block text-center pt-1">
            +{(habits?.length ?? 0) - 7} more
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
