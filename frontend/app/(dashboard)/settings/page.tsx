"use client";
import { useId, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Settings2, KeyRound, Download, Palette, Mail, ShieldAlert, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { authApi } from "@/lib/api/auth";
import { exportApi, triggerBlobDownload } from "@/lib/api/export";
import { useAuthStore } from "@/store/authStore";
import { useAuth } from "@/lib/hooks/useAuth";
import { confirm } from "@/lib/confirm";
import { cn } from "@/lib/utils/cn";
import { useSetThemePreference, type ThemePreference } from "@/lib/hooks/useThemePreference";

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const FALLBACK_ZONES = ["UTC", "America/Toronto", "America/New_York", "America/Los_Angeles", "Europe/London", "Asia/Kolkata", "Asia/Tokyo", "Australia/Sydney"];

function timeZones(current: string): string[] {
  let zones: string[] = FALLBACK_ZONES;
  try {
    const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.("timeZone");
    if (supported?.length) zones = supported.includes("UTC") ? supported : ["UTC", ...supported];
  } catch {
    /* older browsers: use the fallback list */
  }
  return zones.includes(current) ? zones : [current, ...zones];
}

const selectClass =
  "flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

function Section({ icon: Icon, title, children, danger }: { icon: typeof Settings2; title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <section
      aria-label={title}
      className={cn("rounded-xl border bg-surface p-6 mb-5", danger ? "border-destructive/40" : "border-border")}
    >
      <div className="flex items-center gap-2 mb-5">
        <Icon size={16} className={danger ? "text-destructive-fg" : "text-fg-secondary"} aria-hidden />
        <h2 className={cn("font-semibold", danger ? "text-destructive-fg" : "text-foreground")}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ id, label, children, hint }: { id: string; label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium text-fg-secondary block mb-1">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const uid = useId();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { logout } = useAuth();
  const setThemePreference = useSetThemePreference();

  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [timezone, setTimezone] = useState(user?.timezone ?? "UTC");
  const zones = useMemo(() => timeZones(user?.timezone ?? "UTC"), [user?.timezone]);

  const [exportDays, setExportDays] = useState(90);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);

  const [deletePw, setDeletePw] = useState("");

  const profileMutation = useMutation({
    mutationFn: () =>
      authApi.updateMe({
        full_name: fullName.trim() || undefined,
        display_name: displayName.trim() || undefined,
        timezone,
      }),
    onSuccess: (updated) => setUser(updated),
    meta: { successMessage: "Profile saved" },
  });

  const digestMutation = useMutation({
    mutationFn: (enabled: boolean) => authApi.updateMe({ digest_enabled: enabled }),
    onSuccess: (updated) => setUser(updated),
    meta: { successMessage: "Digest preference saved" },
  });

  const passwordMutation = useMutation({
    mutationFn: () => authApi.changePassword({ current_password: currentPw, new_password: newPw }),
    onSuccess: () => {
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setPwError(null);
    },
    meta: { successMessage: "Password updated", errorMessage: "Couldn't change your password" },
  });

  const verifyMutation = useMutation({
    mutationFn: authApi.sendVerification,
    meta: { successMessage: "Verification email sent. Check your inbox." },
  });

  const checkinExport = useMutation({
    mutationFn: () => exportApi.downloadCheckins(exportDays),
    onSuccess: (blob) => triggerBlobDownload(blob, `checkins_${exportDays}d.csv`),
    meta: { errorMessage: "Export failed. Please try again." },
  });

  const habitExport = useMutation({
    mutationFn: () => exportApi.downloadHabits(exportDays),
    onSuccess: (blob) => triggerBlobDownload(blob, `habits_${exportDays}d.csv`),
    meta: { errorMessage: "Export failed. Please try again." },
  });

  const deleteMutation = useMutation({
    mutationFn: () => authApi.deleteAccount(deletePw),
    onSuccess: () => logout(),
    meta: { errorMessage: "Couldn't delete your account" },
  });

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPw.length < 8 || !/[A-Z]/.test(newPw) || !/[0-9]/.test(newPw)) {
      setPwError("Use at least 8 characters with an uppercase letter and a digit");
      return;
    }
    if (newPw !== confirmPw) {
      setPwError("Passwords do not match");
      return;
    }
    setPwError(null);
    passwordMutation.mutate();
  }

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    const ok = await confirm({
      title: "Delete your account?",
      description: "All your check-ins, habits, goals, journals and reviews are permanently deleted. This can't be undone.",
      confirmLabel: "Delete my account",
      destructive: true,
      typeToConfirm: "DELETE",
    });
    if (ok) deleteMutation.mutate();
  }

  const verified = !!user?.email_verified_at;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>

      <Section icon={Settings2} title="Profile">
        <div className="flex flex-wrap items-start gap-6 mb-5">
          <AvatarUpload />
          <div className="flex-1 min-w-[12rem] flex flex-col gap-3">
            <Field id={`${uid}-full`} label="Full name">
              <Input id={`${uid}-full`} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
            </Field>
            <Field id={`${uid}-display`} label="Display name">
              <Input
                id={`${uid}-display`}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How you appear in the app"
              />
            </Field>
          </div>
        </div>
        <div className="mb-5 max-w-sm">
          <Field id={`${uid}-tz`} label="Timezone" hint="Decides when your day starts for check-ins and habit streaks.">
            <select id={`${uid}-tz`} value={timezone} onChange={(e) => setTimezone(e.target.value)} className={selectClass}>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Button size="sm" onClick={() => profileMutation.mutate()} disabled={profileMutation.isPending}>
          {profileMutation.isPending ? "Saving…" : "Save profile"}
        </Button>
      </Section>

      <Section icon={Palette} title="Appearance">
        <fieldset>
          <legend className="text-xs font-medium text-fg-secondary mb-2">Theme</legend>
          <div className="inline-flex rounded-md border border-border p-0.5 gap-0.5">
            {THEME_OPTIONS.map((o) => {
              const selected = (user?.theme_preference ?? "system") === o.value;
              return (
                <label
                  key={o.value}
                  className={cn(
                    "cursor-pointer rounded px-3 py-1 text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent",
                    selected ? "bg-accent-solid text-accent-foreground" : "text-fg-secondary hover:bg-elevated"
                  )}
                >
                  <input
                    type="radio"
                    name={`${uid}-theme`}
                    value={o.value}
                    checked={selected}
                    onChange={() => setThemePreference(o.value)}
                    className="sr-only"
                  />
                  {o.label}
                </label>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2">System follows your device. Your choice is saved to your account.</p>
        </fieldset>
      </Section>

      <Section icon={Mail} title="Email">
        <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
          <span className="text-foreground">{user?.email}</span>
          {verified ? (
            <span className="inline-flex items-center gap-1 text-xs text-success-fg">
              <MailCheck size={13} aria-hidden /> Verified
            </span>
          ) : (
            <>
              <span className="text-xs text-warning-fg">Not verified</span>
              <Button size="sm" variant="outline" onClick={() => verifyMutation.mutate()} disabled={verifyMutation.isPending || verifyMutation.isSuccess}>
                {verifyMutation.isSuccess ? "Email sent" : "Send verification email"}
              </Button>
            </>
          )}
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            role="switch"
            checked={user?.digest_enabled ?? true}
            disabled={digestMutation.isPending}
            onChange={(e) => digestMutation.mutate(e.target.checked)}
            className="mt-1 h-4 w-4 accent-accent-solid"
          />
          <span>
            <span className="block text-sm font-medium text-foreground">Weekly digest email</span>
            <span className="block text-xs text-muted-foreground">
              Your Life Score and highlights every Sunday{verified ? "." : ", once your email is verified."}
            </span>
          </span>
        </label>
      </Section>

      <Section icon={Download} title="Export data">
        <fieldset className="mb-4">
          <legend className="text-xs font-medium text-fg-secondary mb-2">Date range</legend>
          <div className="flex gap-2">
            {([30, 90, 365] as const).map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={exportDays === d}
                onClick={() => setExportDays(d)}
                className={cn(
                  "px-3 py-1 rounded-md text-sm font-medium border transition-colors",
                  exportDays === d
                    ? "bg-accent-solid text-accent-foreground border-accent"
                    : "border-border text-fg-secondary hover:border-accent"
                )}
              >
                {d === 365 ? "1 year" : `${d} days`}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-wrap gap-3">
          <Button size="sm" variant="outline" onClick={() => checkinExport.mutate()} disabled={checkinExport.isPending}>
            <Download size={13} className="mr-1.5" aria-hidden />
            {checkinExport.isPending ? "Downloading…" : "Check-ins CSV"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => habitExport.mutate()} disabled={habitExport.isPending}>
            <Download size={13} className="mr-1.5" aria-hidden />
            {habitExport.isPending ? "Downloading…" : "Habits CSV"}
          </Button>
        </div>
      </Section>

      <Section icon={KeyRound} title="Change password">
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3 max-w-sm">
          <Field id={`${uid}-cur`} label="Current password">
            <Input id={`${uid}-cur`} type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} autoComplete="current-password" />
          </Field>
          <Field id={`${uid}-new`} label="New password" hint="At least 8 characters, with an uppercase letter and a digit.">
            <Input id={`${uid}-new`} type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" />
          </Field>
          <Field id={`${uid}-conf`} label="Confirm new password">
            <Input id={`${uid}-conf`} type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} autoComplete="new-password" />
          </Field>
          {pwError && (
            <p role="alert" className="text-xs text-destructive-fg">
              {pwError}
            </p>
          )}
          <div>
            <Button type="submit" size="sm" disabled={passwordMutation.isPending || !currentPw || !newPw || !confirmPw}>
              {passwordMutation.isPending ? "Changing…" : "Change password"}
            </Button>
          </div>
        </form>
      </Section>

      <Section icon={ShieldAlert} title="Danger zone" danger>
        <p className="text-sm text-muted-foreground mb-4">
          Deleting your account permanently removes your profile and everything you&apos;ve logged. Export your data first if you want a copy.
        </p>
        <form onSubmit={handleDelete} className="flex flex-col gap-3 max-w-sm">
          <Field id={`${uid}-del`} label="Your password">
            <Input id={`${uid}-del`} type="password" value={deletePw} onChange={(e) => setDeletePw(e.target.value)} autoComplete="current-password" />
          </Field>
          <div>
            <Button type="submit" size="sm" variant="destructive" disabled={!deletePw || deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting…" : "Delete my account"}
            </Button>
          </div>
        </form>
      </Section>
    </div>
  );
}
