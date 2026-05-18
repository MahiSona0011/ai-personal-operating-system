"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Settings2, KeyRound, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/store/authStore";

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  // Profile form state
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [timezone, setTimezone] = useState(user?.timezone ?? "UTC");
  const [profileSaved, setProfileSaved] = useState(false);

  // Password form state
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaved, setPwSaved] = useState(false);

  const profileMutation = useMutation({
    mutationFn: () =>
      authApi.updateMe({
        full_name: fullName.trim() || undefined,
        display_name: displayName.trim() || undefined,
        timezone: timezone.trim() || undefined,
      } as Parameters<typeof authApi.updateMe>[0]),
    onSuccess: (updated) => {
      setUser(updated);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: () =>
      authApi.changePassword({ current_password: currentPw, new_password: newPw }),
    onSuccess: () => {
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setPwError(null);
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 3000);
    },
    onError: () => setPwError("Incorrect current password"),
  });

  function handlePasswordSubmit() {
    if (newPw.length < 8) { setPwError("New password must be at least 8 characters"); return; }
    if (newPw !== confirmPw) { setPwError("Passwords do not match"); return; }
    setPwError(null);
    passwordMutation.mutate();
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-[hsl(var(--fg-primary))] mb-6">Settings</h1>

      {/* Profile section */}
      <section className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-6 mb-5">
        <div className="flex items-center gap-2 mb-5">
          <Settings2 size={16} className="text-[hsl(var(--fg-secondary))]" />
          <h2 className="font-semibold text-[hsl(var(--fg-primary))]">Profile</h2>
        </div>

        <div className="flex items-start gap-6 mb-5">
          <AvatarUpload />
          <div className="flex-1 flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium text-[hsl(var(--fg-secondary))] block mb-1">
                Full name
              </label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[hsl(var(--fg-secondary))] block mb-1">
                Display name
              </label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How you appear in the app"
              />
            </div>
          </div>
        </div>

        <div className="mb-5">
          <label className="text-xs font-medium text-[hsl(var(--fg-secondary))] block mb-1">
            Timezone
          </label>
          <Input
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="e.g. America/New_York, Europe/London, UTC"
            className="max-w-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={() => profileMutation.mutate()}
            disabled={profileMutation.isPending}
          >
            {profileMutation.isPending ? "Saving…" : "Save profile"}
          </Button>
          {profileSaved && (
            <span className="flex items-center gap-1 text-xs text-[hsl(var(--accent))]">
              <CheckCircle2 size={13} /> Saved
            </span>
          )}
          {profileMutation.isError && (
            <span className="text-xs text-[hsl(var(--area-health))]">Save failed</span>
          )}
        </div>
      </section>

      {/* Password section */}
      <section className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-6">
        <div className="flex items-center gap-2 mb-5">
          <KeyRound size={16} className="text-[hsl(var(--fg-secondary))]" />
          <h2 className="font-semibold text-[hsl(var(--fg-primary))]">Change password</h2>
        </div>

        <div className="flex flex-col gap-3 max-w-sm">
          <div>
            <label className="text-xs font-medium text-[hsl(var(--fg-secondary))] block mb-1">
              Current password
            </label>
            <Input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[hsl(var(--fg-secondary))] block mb-1">
              New password
            </label>
            <Input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[hsl(var(--fg-secondary))] block mb-1">
              Confirm new password
            </label>
            <Input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>

        {pwError && (
          <p className="mt-3 text-xs text-[hsl(var(--area-health))]">{pwError}</p>
        )}

        <div className="flex items-center gap-3 mt-4">
          <Button
            size="sm"
            onClick={handlePasswordSubmit}
            disabled={passwordMutation.isPending || !currentPw || !newPw || !confirmPw}
          >
            {passwordMutation.isPending ? "Changing…" : "Change password"}
          </Button>
          {pwSaved && (
            <span className="flex items-center gap-1 text-xs text-[hsl(var(--accent))]">
              <CheckCircle2 size={13} /> Password updated
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
