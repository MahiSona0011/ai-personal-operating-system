"use client";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { CheckinWizard } from "@/components/checkin/CheckinWizard";
import { Skeleton } from "@/components/ui/skeleton";
import { useCheckinWizard } from "@/lib/hooks/useCheckinWizard";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CheckinPage() {
  const router = useRouter();
  const { checkin, isLoading, update, complete, isUpdating, isCompleting } = useCheckinWizard();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (checkin?.is_complete) {
    return (
      <DashboardLayout overallScore={checkin.overall_score}>
        <div className="max-w-2xl mx-auto flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle2 size={28} className="text-success" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Today&apos;s check-in is complete</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {checkin.ai_analysis
                ? "Your AI analysis is ready on the dashboard."
                : "AI analysis is being generated — check back shortly."}
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout overallScore={checkin?.overall_score}>
      <CheckinWizard
        checkin={checkin}
        onSave={update}
        onComplete={async () => {
          await complete();
          router.push("/dashboard");
        }}
        isSaving={isUpdating}
        isCompleting={isCompleting}
      />
    </DashboardLayout>
  );
}
