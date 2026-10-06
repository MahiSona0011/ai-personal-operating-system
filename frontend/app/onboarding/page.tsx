"use client";
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/lib/api/auth";
import StepIndicator from "@/components/onboarding/StepIndicator";
import Welcome from "./steps/Welcome";
import Profile from "./steps/Profile";
import LifeAreas from "./steps/LifeAreas";
import FirstGoal from "./steps/FirstGoal";
import FirstHabit from "./steps/FirstHabit";
import Done from "./steps/Done";

const TOTAL_STEPS = 5;

export default function OnboardingPage() {
  const { user, setUser } = useAuthStore();
  const [step, setStep] = useState(0);

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);

  const handleProfileNext = async (data: { display_name: string; timezone: string }) => {
    try {
      const updated = await authApi.updateMe(data);
      setUser(updated);
    } catch {
      // non-blocking — continue anyway
    }
    next();
  };

  const handleLifeAreasNext = (priorities: number[]) => {
    // Store priorities in user preferences non-blocking
    authApi.updateMe({ preferences: { priority_area_ids: priorities } }).catch(() => {});
    next();
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <span className="text-2xl font-bold tracking-tight text-foreground">Selfstack</span>
          {step > 0 && step < TOTAL_STEPS && (
            <StepIndicator total={TOTAL_STEPS} current={step} />
          )}
        </div>

        {/* Step card */}
        <div className="bg-surface border border-border rounded-2xl p-8 flex flex-col items-center">
          {step === 0 && <Welcome name={user.full_name} onNext={next} />}
          {step === 1 && (
            <Profile
              initialDisplayName={user.display_name ?? ""}
              initialTimezone={user.timezone}
              onNext={handleProfileNext}
              onBack={back}
            />
          )}
          {step === 2 && <LifeAreas onNext={handleLifeAreasNext} onBack={back} />}
          {step === 3 && <FirstGoal onNext={next} onBack={back} />}
          {step === 4 && <FirstHabit onNext={next} onBack={back} />}
          {step === 5 && <Done />}
        </div>

        {/* Step counter text */}
        {step > 0 && step <= TOTAL_STEPS && (
          <p className="text-center text-xs text-fg-muted mt-4">
            Step {step} of {TOTAL_STEPS}
          </p>
        )}
      </div>
    </div>
  );
}
