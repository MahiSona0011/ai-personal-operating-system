"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { GreetingHeader } from "@/components/dashboard/GreetingHeader";
import { QuoteCard } from "@/components/dashboard/QuoteCard";
import { LifeScoreHero } from "@/components/dashboard/LifeScoreHero";
import { LifeScoreTrendChart } from "@/components/dashboard/LifeScoreTrendChart";
import { AreaContributors } from "@/components/dashboard/AreaContributors";
import { MoodEnergyChart } from "@/components/dashboard/MoodEnergyChart";
import { TodayHabits } from "@/components/dashboard/TodayHabits";
import { WeekHighlights } from "@/components/dashboard/WeekHighlights";
import { LatestInsight } from "@/components/dashboard/LatestInsight";
import { ConsistencyStrip } from "@/components/dashboard/ConsistencyStrip";
import { ReflectionPrompt } from "@/components/dashboard/ReflectionPrompt";
import { useCheckinToday, useDashboard, useHabitsToday } from "@/lib/hooks/useDashboard";
import { useLogHabitToday } from "@/lib/hooks/useHabits";
import { useRangeParam } from "@/lib/hooks/useRangeParam";
import { pickQuote, weakestArea } from "@/lib/quote-of-the-day";
import { isAnalysisPending } from "@/lib/checkin-utils";
import { shouldShowReflection } from "@/lib/reflection-prompts";
import { toastError } from "@/lib/toast";
import { useAuthStore } from "@/store/authStore";

function DashboardContent() {
  const user = useAuthStore((s) => s.user);
  const [range, setRange] = useRangeParam();
  const { data: dashboard, isLoading: dashboardLoading, isError, error } = useDashboard(range);
  const { data: habitsToday, isLoading: habitsLoading } = useHabitsToday();
  const { data: checkin, isLoading: checkinLoading } = useCheckinToday();
  const logHabit = useLogHabitToday();

  useEffect(() => {
    if (isError) toastError(error, "Couldn't load your dashboard");
  }, [isError, error]);

  // Quote: stable for the day. Wait for the data (its weakest area picks the quote) and for mount
  // (the date and the signed-in user come from the browser), so it never flips after first paint.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [quoteOffset, setQuoteOffset] = useState(0);
  const picked = useMemo(() => {
    if (!mounted || !user || dashboardLoading) return null;
    return pickQuote({
      dateKey: format(new Date(), "yyyy-MM-dd"),
      userId: user.id,
      weakestArea: weakestArea(dashboard?.areas, dashboard?.selected_areas),
      offset: quoteOffset,
    });
  }, [mounted, user, dashboardLoading, dashboard, quoteOffset]);

  // The evening reflection depends on the browser's clock, so decide after mount.
  const showReflection = mounted && shouldShowReflection(new Date(), checkin?.is_complete === true);

  const checkinComplete = checkinLoading ? undefined : (checkin?.is_complete ?? false);

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
        <GreetingHeader name={user?.display_name ?? user?.full_name} />

        {picked ? (
          <QuoteCard quote={picked.quote} forArea={picked.forArea} onNext={() => setQuoteOffset((n) => n + 1)} />
        ) : (
          <Skeleton className="h-14 rounded-lg" />
        )}

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-5 lg:col-span-4">
            <LifeScoreHero
              score={dashboard?.life_score ?? null}
              delta={dashboard?.life_score_delta ?? null}
              days={range}
              streak={dashboard?.checkin_streak ?? 0}
              checkinComplete={checkinComplete}
              loading={dashboardLoading}
            />
          </div>
          <div className="col-span-12 md:col-span-7 lg:col-span-8">
            <LifeScoreTrendChart range={range} onRangeChange={setRange} />
          </div>
        </div>

        <AreaContributors areas={dashboard?.areas} loading={dashboardLoading} selected={dashboard?.selected_areas} />

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-7">
            <MoodEnergyChart range={range} />
          </div>
          <div className="col-span-12 md:col-span-5">
            <TodayHabits habits={habitsToday} loading={habitsLoading} onLog={(h) => logHabit.log(h)} />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-5">
            <WeekHighlights highlights={dashboard?.highlights} loading={dashboardLoading} />
          </div>
          <div className="col-span-12 md:col-span-7">
            <LatestInsight
              insight={dashboard?.latest_insight}
              loading={dashboardLoading}
              analysing={isAnalysisPending(checkin)}
            />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className={showReflection ? "col-span-12 md:col-span-7" : "col-span-12"}>
            <ConsistencyStrip days={dashboard?.checkin_consistency_30} loading={dashboardLoading} />
          </div>
          {showReflection && user && (
            <div className="col-span-12 md:col-span-5">
              <ReflectionPrompt userId={user.id} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function DashboardPage() {
  // useSearchParams (the range lives in the URL) needs a Suspense boundary.
  return (
    <Suspense
      fallback={
        <>
          <div className="mx-auto max-w-7xl space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
