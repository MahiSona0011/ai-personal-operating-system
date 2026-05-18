"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { LifeScoreRing } from "@/components/dashboard/LifeScoreRing";
import { AreaScoreGrid } from "@/components/dashboard/AreaScoreGrid";
import { HabitsSummaryCard } from "@/components/dashboard/HabitsSummaryCard";
import { CheckinCTACard } from "@/components/dashboard/CheckinCTACard";
import { useDashboard, useHabitsToday, useCheckinToday } from "@/lib/hooks/useDashboard";
import { habitsApi } from "@/lib/api/habits";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { data: dashboard, isLoading: dashboardLoading } = useDashboard();
  const { data: habitsToday, isLoading: habitsLoading } = useHabitsToday();
  const { data: checkin, isLoading: checkinLoading } = useCheckinToday();

  const logHabitMutation = useMutation({
    mutationFn: (habitId: number) =>
      habitsApi.log(habitId, { log_date: format(new Date(), "yyyy-MM-dd") }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits", "today"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const overallScore = checkin?.overall_score ?? null;

  return (
    <DashboardLayout overallScore={overallScore}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero row */}
        <div className="grid grid-cols-12 gap-4">
          {/* Life Score Hero */}
          <div className="col-span-12 md:col-span-4 bg-surface border border-border rounded-lg p-6 flex flex-col items-center justify-center gap-4">
            <LifeScoreRing score={overallScore} loading={checkinLoading} />
            <p className="text-xs text-muted-foreground text-center">
              {checkin?.is_complete ? "Based on today's check-in" : "Complete your check-in to update"}
            </p>
          </div>

          {/* Area scores */}
          <div className="col-span-12 md:col-span-8 bg-surface border border-border rounded-lg p-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Life Areas
            </h2>
            <AreaScoreGrid scores={dashboard?.life_area_scores} loading={dashboardLoading} />
          </div>
        </div>

        {/* Second row */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-5">
            <CheckinCTACard checkin={checkin} loading={checkinLoading} />
          </div>
          <div className="col-span-12 md:col-span-7">
            <HabitsSummaryCard
              habits={habitsToday}
              loading={habitsLoading}
              onLog={(id) => logHabitMutation.mutate(id)}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
