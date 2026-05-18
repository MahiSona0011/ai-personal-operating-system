"use client";
import Link from "next/link";
import { CheckSquare, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Checkin } from "@/types";

interface CheckinCTACardProps {
  checkin: Checkin | undefined;
  loading?: boolean;
}

export function CheckinCTACard({ checkin, loading }: CheckinCTACardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Daily Check-In</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-20" /></CardContent>
      </Card>
    );
  }

  const isComplete = checkin?.is_complete ?? false;
  const hasAI = !!checkin?.ai_analysis;

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><CheckSquare size={16} className="text-accent" />Daily Check-In</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {!isComplete ? (
          <>
            <p className="text-sm text-muted-foreground">Rate your 8 life areas and get AI insights.</p>
            <Link href="/checkin">
              <Button className="w-full" size="sm">Start Check-In</Button>
            </Link>
          </>
        ) : !hasAI ? (
          <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles size={14} className="text-accent animate-pulse" />
              AI is analyzing your day…
            </div>
            <p className="text-xs text-muted-foreground">Results will appear shortly.</p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm text-success">
              <Sparkles size={14} />
              Check-in complete
            </div>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {(checkin?.ai_analysis as { summary?: string })?.summary}
            </p>
            <Link href="/analysis">
              <Button variant="outline" className="w-full" size="sm">View Full Analysis</Button>
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
