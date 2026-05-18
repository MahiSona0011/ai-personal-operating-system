export interface User {
  id: number;
  email: string;
  full_name: string;
  display_name: string | null;
  timezone: string;
  avatar_url: string | null;
  onboarding_state: "pending" | "complete";
  preferences: Record<string, unknown> | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface Checkin {
  id: number;
  user_id: number;
  checkin_date: string;
  score_discipline: number | null;
  score_focus: number | null;
  score_learning: number | null;
  score_career: number | null;
  score_health: number | null;
  score_mental: number | null;
  score_social: number | null;
  score_financial: number | null;
  overall_score: number | null;
  mood: number | null;
  energy: number | null;
  wins: string[] | null;
  blockers: string[] | null;
  action_plan: string[] | null;
  ai_analysis: AIAnalysis | null;
  ai_analyzed_at: string | null;
  is_complete: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface AIAnalysis {
  summary: string;
  top_insight: string;
  action_items: Array<{ action: string; area: string; priority: number }>;
  patterns: string[];
  system_adjustment: string;
}

export interface Habit {
  id: number;
  user_id: number;
  life_area_id: number;
  title: string;
  description: string | null;
  frequency: string;
  frequency_days: number[] | null;
  target_count: number;
  current_streak: number;
  longest_streak: number;
  total_completions: number;
  last_completed_date: string | null;
  is_active: boolean;
  created_at: string;
}

export interface HabitWithStatus extends Habit {
  completed_today: boolean;
  completion_count_today: number;
}

export interface Goal {
  id: number;
  user_id: number;
  life_area_id: number;
  title: string;
  description: string | null;
  why: string | null;
  status: "active" | "completed" | "paused";
  priority: number;
  progress_pct: number;
  target_date: string | null;
  completed_at: string | null;
  created_at: string;
  milestones: Milestone[];
}

export interface Milestone {
  id: number;
  goal_id: number;
  title: string;
  is_completed: boolean;
  completed_at: string | null;
  due_date: string | null;
  sort_order: number;
  created_at: string;
}

export const LIFE_AREAS = [
  { id: 1, slug: "discipline", name: "Discipline", icon: "shield", color: "hsl(var(--area-discipline))" },
  { id: 2, slug: "focus", name: "Focus", icon: "crosshair", color: "hsl(var(--area-focus))" },
  { id: 3, slug: "learning", name: "Learning", icon: "book-open", color: "hsl(var(--area-learning))" },
  { id: 4, slug: "career", name: "Career", icon: "briefcase", color: "hsl(var(--area-career))" },
  { id: 5, slug: "health", name: "Health", icon: "heart", color: "hsl(var(--area-health))" },
  { id: 6, slug: "mental", name: "Mental", icon: "brain", color: "hsl(var(--area-mental))" },
  { id: 7, slug: "social", name: "Social", icon: "users", color: "hsl(var(--area-social))" },
  { id: 8, slug: "financial", name: "Financial", icon: "trending-up", color: "hsl(var(--area-financial))" },
] as const;

export interface HabitLogEntry {
  log_date: string;
  completion_count: number;
  status: string;
}

export interface WorkSession {
  id: number;
  user_id: number;
  life_area_id: number;
  goal_id: number | null;
  session_type: string;
  title: string;
  notes: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  quality_rating: number | null;
  created_at: string;
}

export interface SessionStats {
  total_minutes: number;
  session_count: number;
  avg_quality: number | null;
  by_area: Record<string, number>;
  by_week: Array<{ week_start: string; minutes: number; count: number }>;
}

export interface ActionItem {
  action: string;
  area: string;
  priority: number;
}

export interface AIRecommendation {
  id: number;
  user_id: number;
  recommendation_type: "daily_analysis" | "weekly_review" | "on_demand" | "journal_insight";
  source_type: string | null;
  source_id: number | null;
  model_used: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  raw_response: Record<string, unknown>;
  summary: string | null;
  action_items: ActionItem[] | null;
  insights: string[] | null;
  is_dismissed: boolean;
  is_actioned: boolean;
  user_rating: number | null;
  created_at: string;
}

export interface WeeklyReview {
  id: number;
  user_id: number;
  week_start_date: string;
  week_end_date: string;
  avg_scores: Record<string, number>;
  habit_completion_rate: number | null;
  total_session_minutes: number | null;
  ai_narrative: string | null;
  highlights: string[] | null;
  improvement_areas: string[] | null;
  generation_status: "pending" | "in_progress" | "completed" | "failed";
  generated_at: string | null;
  created_at: string;
}

export type LifeAreaSlug = (typeof LIFE_AREAS)[number]["slug"];

export interface JournalEntry {
  id: number;
  user_id: number;
  entry_date: string;
  title: string | null;
  content: string;
  life_area_tags: string[] | null;
  mood_tag: string | null;
  ai_summary: string | null;
  ai_themes: string[] | null;
  ai_sentiment: string | null;
  created_at: string;
  updated_at: string;
}

export interface Metric {
  id: number;
  user_id: number;
  life_area_id: number;
  metric_key: string;
  metric_date: string;
  value_numeric: number | null;
  unit: string | null;
  created_at: string;
  updated_at: string;
}

export const METRIC_KEYS: Record<number, { key: string; label: string; defaultUnit: string }[]> = {
  1: [
    { key: "habits_completed", label: "Habits Completed", defaultUnit: "count" },
    { key: "streak_days", label: "Streak Days", defaultUnit: "days" },
  ],
  2: [
    { key: "deep_work_hours", label: "Deep Work Hours", defaultUnit: "hours" },
    { key: "pomodoros", label: "Pomodoros", defaultUnit: "count" },
    { key: "distractions", label: "Distractions", defaultUnit: "count" },
  ],
  3: [
    { key: "pages_read", label: "Pages Read", defaultUnit: "pages" },
    { key: "study_hours", label: "Study Hours", defaultUnit: "hours" },
    { key: "courses_completed", label: "Courses Completed", defaultUnit: "count" },
  ],
  4: [
    { key: "tasks_completed", label: "Tasks Completed", defaultUnit: "count" },
    { key: "applications_sent", label: "Applications Sent", defaultUnit: "count" },
    { key: "meetings", label: "Meetings", defaultUnit: "count" },
  ],
  5: [
    { key: "weight", label: "Weight", defaultUnit: "kg" },
    { key: "sleep_hours", label: "Sleep Hours", defaultUnit: "hours" },
    { key: "steps", label: "Steps", defaultUnit: "steps" },
    { key: "workout_minutes", label: "Workout Minutes", defaultUnit: "min" },
    { key: "water_ml", label: "Water Intake", defaultUnit: "ml" },
    { key: "heart_rate", label: "Resting Heart Rate", defaultUnit: "bpm" },
  ],
  6: [
    { key: "stress_level", label: "Stress Level", defaultUnit: "1–10" },
    { key: "mood_score", label: "Mood Score", defaultUnit: "1–10" },
    { key: "meditation_minutes", label: "Meditation", defaultUnit: "min" },
  ],
  7: [
    { key: "social_hours", label: "Social Hours", defaultUnit: "hours" },
    { key: "connections_made", label: "Connections Made", defaultUnit: "count" },
  ],
  8: [
    { key: "savings", label: "Savings", defaultUnit: "USD" },
    { key: "expenses", label: "Expenses", defaultUnit: "USD" },
    { key: "income", label: "Income", defaultUnit: "USD" },
    { key: "investments", label: "Investments", defaultUnit: "USD" },
  ],
};

export const MOOD_TAGS = [
  { value: "reflecting", label: "Reflecting" },
  { value: "grateful", label: "Grateful" },
  { value: "energized", label: "Energized" },
  { value: "focused", label: "Focused" },
  { value: "neutral", label: "Neutral" },
  { value: "anxious", label: "Anxious" },
  { value: "frustrated", label: "Frustrated" },
] as const;

export type MoodTag = (typeof MOOD_TAGS)[number]["value"];
