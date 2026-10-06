"use client";
import Link from "next/link";
import { format } from "date-fns";
import { PenLine } from "lucide-react";
import { pickReflectionPrompt } from "@/lib/reflection-prompts";

/** One question for the evening and a link to journal about it. The page decides when to show it
 * (after 6 pm local, once today's check-in is complete; see `shouldShowReflection`). */
export function ReflectionPrompt({ userId, now = new Date() }: { userId: number | string; now?: Date }) {
  const prompt = pickReflectionPrompt(format(now, "yyyy-MM-dd"), userId);
  return (
    <section aria-label="Evening reflection" className="rounded-xl border border-border bg-surface p-4 shadow-sm dark:shadow-none">
      <h2 className="mb-2 text-base font-semibold text-foreground">Evening reflection</h2>
      <p className="mb-3 text-sm text-foreground">{prompt}</p>
      <Link
        href={`/journal?prompt=${encodeURIComponent(prompt)}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-fg hover:underline"
      >
        <PenLine size={14} aria-hidden /> Write
      </Link>
    </section>
  );
}
