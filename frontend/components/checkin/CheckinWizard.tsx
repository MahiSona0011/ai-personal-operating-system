"use client";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepScores, type AreaScores } from "./StepScores";
import { StepMoodEnergy } from "./StepMoodEnergy";
import { StepReflection } from "./StepReflection";
import { StepReview } from "./StepReview";
import type { Checkin } from "@/types";

const STEPS = [
  { label: "Life Areas", description: "Rate each of your 8 life areas" },
  { label: "Mood & Energy", description: "How are you feeling today?" },
  { label: "Reflections", description: "Wins, blockers, and next actions" },
  { label: "Review", description: "Confirm and get AI analysis" },
];

const DEFAULT_SCORES: AreaScores = {
  score_discipline: 5,
  score_focus: 5,
  score_learning: 5,
  score_career: 5,
  score_health: 5,
  score_mental: 5,
  score_social: 5,
  score_financial: 5,
};

interface CheckinWizardProps {
  checkin: Checkin | undefined;
  onSave: (data: Partial<Checkin>) => Promise<Checkin>;
  onComplete: () => Promise<void>;
  isSaving: boolean;
  isCompleting: boolean;
}

export function CheckinWizard({
  checkin,
  onSave,
  onComplete,
  isSaving,
  isCompleting,
}: CheckinWizardProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const [scores, setScores] = useState<AreaScores>(DEFAULT_SCORES);
  const [mood, setMood] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [wins, setWins] = useState<string[]>([]);
  const [blockers, setBlockers] = useState<string[]>([]);
  const [actionPlan, setActionPlan] = useState<string[]>([]);

  // Hydrate from existing check-in on load
  useEffect(() => {
    if (!checkin) return;
    setScores({
      score_discipline: checkin.score_discipline ?? 5,
      score_focus: checkin.score_focus ?? 5,
      score_learning: checkin.score_learning ?? 5,
      score_career: checkin.score_career ?? 5,
      score_health: checkin.score_health ?? 5,
      score_mental: checkin.score_mental ?? 5,
      score_social: checkin.score_social ?? 5,
      score_financial: checkin.score_financial ?? 5,
    });
    setMood(checkin.mood ?? 5);
    setEnergy(checkin.energy ?? 5);
    setWins(checkin.wins ?? []);
    setBlockers(checkin.blockers ?? []);
    setActionPlan(checkin.action_plan ?? []);
  }, [checkin?.id]);

  const buildPayload = (): Partial<Checkin> => ({
    ...scores,
    mood,
    energy,
    wins,
    blockers,
    action_plan: actionPlan,
  });

  const handleNext = async () => {
    setError(null);
    try {
      await onSave(buildPayload());
      setDirection(1);
      setStep((s) => s + 1);
    } catch {
      setError("Failed to save. Please try again.");
    }
  };

  const handleBack = () => {
    setDirection(-1);
    setStep((s) => s - 1);
  };

  const handleComplete = async () => {
    setError(null);
    try {
      await onSave(buildPayload());
      await onComplete();
    } catch {
      setError("Failed to complete check-in. Please try again.");
    }
  };

  const isLastStep = step === STEPS.length - 1;

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold">Daily Check-In</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {STEPS[step].description}
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-1.5">
              <div
                className={
                  i < step
                    ? "w-2 h-2 rounded-full bg-success"
                    : i === step
                    ? "w-2.5 h-2.5 rounded-full bg-accent ring-4 ring-accent/20"
                    : "w-2 h-2 rounded-full bg-border"
                }
              />
              <span
                className={`text-xs hidden sm:block ${
                  i === step ? "text-foreground font-medium" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px ${i < step ? "bg-success" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-surface border border-border rounded-xl p-6 min-h-[340px]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {step === 0 && (
              <StepScores scores={scores} onChange={setScores} />
            )}
            {step === 1 && (
              <StepMoodEnergy
                mood={mood}
                energy={energy}
                onChange={(field, value) =>
                  field === "mood" ? setMood(value) : setEnergy(value)
                }
              />
            )}
            {step === 2 && (
              <StepReflection
                wins={wins}
                blockers={blockers}
                actionPlan={actionPlan}
                onChange={(field, tags) => {
                  if (field === "wins") setWins(tags);
                  else if (field === "blockers") setBlockers(tags);
                  else setActionPlan(tags);
                }}
              />
            )}
            {step === 3 && (
              <StepReview
                scores={scores}
                mood={mood}
                energy={energy}
                wins={wins}
                blockers={blockers}
                actionPlan={actionPlan}
                onComplete={handleComplete}
                isCompleting={isCompleting || isSaving}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Error */}
      {error && (
        <p className="mt-3 text-sm text-destructive text-center">{error}</p>
      )}

      {/* Navigation */}
      {step < STEPS.length - 1 && (
        <div className="flex items-center justify-between mt-4">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 0}
            size="sm"
          >
            <ChevronLeft size={14} className="mr-1" />
            Back
          </Button>
          <span className="text-xs text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </span>
          <Button onClick={handleNext} disabled={isSaving} size="sm">
            {isSaving ? (
              <Loader2 size={14} className="animate-spin mr-1" />
            ) : null}
            Next
            <ChevronRight size={14} className="ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
