import { hashString } from "@/lib/quote-of-the-day";

export const REFLECTION_PROMPTS: readonly string[] = [
  "What gave you energy today?",
  "What drained you today, and what would you change?",
  "What are you proud of from today?",
  "What did you learn today?",
  "Who made your day better, and did you tell them?",
  "What was the hardest part of today, and how did you handle it?",
  "What would make tomorrow a good day?",
  "What did you avoid today that you'd like to face tomorrow?",
  "What small win deserves a mention?",
  "What are you grateful for right now?",
  "Where did your time actually go today?",
  "What would you do differently if you could replay today?",
];

/** Hour (local, 24h) from which the evening reflection is offered. */
export const REFLECTION_HOUR = 18;

/** One prompt per day, stable across reloads. */
export function pickReflectionPrompt(dateKey: string, userId: number | string): string {
  return REFLECTION_PROMPTS[hashString(`reflect:${userId}:${dateKey}`) % REFLECTION_PROMPTS.length];
}

/** Whether to show the reflection card: after 6 pm local time, once today's check-in is done. */
export function shouldShowReflection(now: Date, checkinComplete: boolean): boolean {
  return checkinComplete && now.getHours() >= REFLECTION_HOUR;
}
