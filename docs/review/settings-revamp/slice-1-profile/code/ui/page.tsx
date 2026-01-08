"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Postures, type UserSettings } from "@hps-internal/contracts";
import {
  fetchProfile,
  updateProfile,
  saveProfileDraft,
  getProfileDraft,
  clearProfileDraft,
  ProfileError,
} from "@/lib/profileSettings";

import { Button, GlassCard, Icon, SelectField } from "@/components/ui";
import { Icons } from "@/constants";
import { fetchUserSettings, upsertUserSettings } from "@/lib/userSettings";
import { ThemeSwitcher } from "@/components/settings/ThemeSwitcher";
import type { ThemeSetting } from "@/components/theme/ThemeProvider";
import { DEFAULT_THEME, THEME_METADATA } from "@/lib/themeTokens";

type FormState = {
  defaultPosture: string;
  defaultMarket: string;
  theme: ThemeSetting;
};

type LocalProfile = {
  name: string;
  email: string;
};

type LocalBusiness = {
  name: string;
  logoDataUrl: string | null;
};

type LocalTeamMember = {
  id: number;
  name: string;
  email: string;
  role: string;
};

const DEFAULTS: FormState = {
  defaultPosture: "base",
  defaultMarket: "ORL",
  theme: DEFAULT_THEME,
};

const themeOptions: Array<{ value: ThemeSetting; label: string; helper: string }> = Object.entries(
  THEME_METADATA,
).map(([value, meta]) => ({
  value: value as ThemeSetting,
  label: meta.label,
  helper: meta.description,
}));
const ALLOWED_THEME_VALUES = new Set<ThemeSetting>(Object.keys(THEME_METADATA) as ThemeSetting[]);
const THEME_ALIASES: Record<string, ThemeSetting> = {
  system: DEFAULT_THEME,
  white: DEFAULT_THEME,
  pink2: "pink",
  pink3: "pink",
};

const marketOptions = [{ value: "ORL", label: "Orlando (ORL)" }];

const quickLinks = [
  {
    href: "/settings/policy-overrides",
    label: "Policy Overrides",
    description: "Review and approve requested underwriting overrides.",
    icon: Icons.briefcase,
  },
  {
    href: "/settings/policy-versions",
    label: "Policy Versions & History",
    description: "Inspect past policy versions and audit underwriting changes.",
    icon: Icons.settings,
  },
];

export default function UserSettingsPage() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [initial, setInitial] = useState<FormState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Profile state with real API integration
  const router = useRouter();
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileFieldError, setProfileFieldError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  const [business, setBusiness] = useState<LocalBusiness>({
    name: "HPS Investments LLC",
    logoDataUrl: null,
  });

  const [team, setTeam] = useState<LocalTeamMember[]>([
    {
      id: 1,
      name: "Alex Analyst",
      email: "alex@hpsinvest.com",
      role: "Underwriter",
    },
    {
      id: 2,
      name: "Casey Manager",
      email: "casey@hpsinvest.com",
      role: "Manager",
    },
  ]);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Viewer");
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      try {
        const settings = await fetchUserSettings();
        const nextState: FormState = settings
          ? mapSettingsToForm(settings)
          : DEFAULTS;

        if (isMounted) {
          setForm(nextState);
          setInitial(nextState);
        }
      } catch (err) {
        console.error("[settings/user] failed to load settings", err);
        if (isMounted) {
          setError("Could not load settings. Please try again.");
          setForm(DEFAULTS);
          setInitial(DEFAULTS);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  // Load profile from API
  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        setProfileLoading(true);
        setProfileError(null);

        const response = await fetchProfile();

        if (isMounted) {
          const draft = getProfileDraft();
          if (draft?.display_name && response.is_new) {
            setProfile({
              name: draft.display_name,
              email: response.email,
            });
          } else {
            setProfile({
              name: response.profile.display_name || "",
              email: response.email,
            });
            clearProfileDraft();
          }
        }
      } catch (err) {
        if (isMounted) {
          if (err instanceof ProfileError && err.status === 401) {
            router.push("/login?returnTo=/settings/user");
            return;
          }
          setProfileError(
            err instanceof Error ? err.message : "Failed to load profile",
          );
        }
      } finally {
        if (isMounted) {
          setProfileLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const hasChanges = useMemo(() => {
    if (!initial) return false;
    return (
      form.defaultPosture !== initial.defaultPosture ||
      form.defaultMarket !== initial.defaultMarket ||
      form.theme !== initial.theme
    );
  }, [form, initial]);

  const onSave = async () => {
    if (!initial || !hasChanges) return;

    const payload: Record<string, unknown> = {};

    if (form.defaultPosture !== initial.defaultPosture) {
      payload.defaultPosture = form.defaultPosture;
    }
    if (form.defaultMarket !== initial.defaultMarket) {
      payload.defaultMarket = form.defaultMarket;
    }
    if (form.theme !== initial.theme) {
      payload.theme = form.theme;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const saved = await upsertUserSettings(payload);
      const next = mapSettingsToForm(saved);
      setForm(next);
      setInitial(next);
      setSuccess("Settings saved.");
    } catch (err) {
      console.error("[settings/user] failed to save settings", err);
      setError("Could not save settings. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Save profile to API
  const onSaveProfile = useCallback(async () => {
    if (!profile?.name?.trim()) {
      setProfileFieldError("Display name is required");
      return;
    }

    try {
      setProfileSaving(true);
      setProfileError(null);
      setProfileFieldError(null);

      saveProfileDraft({ display_name: profile.name });

      await updateProfile({ display_name: profile.name.trim() });

      clearProfileDraft();
      setLocalMessage("Profile saved successfully.");
    } catch (err) {
      if (err instanceof ProfileError) {
        if (err.field === "display_name") {
          setProfileFieldError(err.message);
        } else {
          setProfileError(err.message);
        }
      } else {
        setProfileError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setProfileSaving(false);
    }
  }, [profile]);

  // TODO: Wire business save to org/business settings endpoint when available.
  const onSaveBusiness = () => {
    setLocalMessage(
      "Business settings saved locally. (TODO: connect real business API.)",
    );
  };

  // TODO: Wire team invite/removal to memberships management when available.
  const onInvite = () => {
    if (!inviteEmail.trim()) {
      setLocalMessage("Enter an email before sending an invite.");
      return;
    }

    const newMember: LocalTeamMember = {
      id: Date.now(),
      name: "Pending Invite",
      email: inviteEmail.trim(),
      role: inviteRole,
    };

    setTeam((prev) => [...prev, newMember]);
    setInviteEmail("");
    setInviteRole("Viewer");
    setLocalMessage(
      "Invite staged locally. (TODO: send real invite via backend.)",
    );
  };

  const onRemoveMember = (id: number) => {
    setTeam((prev) => prev.filter((m) => m.id !== id));
    setLocalMessage(
      "Member removed locally. (TODO: remove via backend.)",
    );
  };

  const onLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setBusiness((prev) => ({
        ...prev,
        logoDataUrl: reader.result as string,
      }));
      setLocalMessage(
        "Logo staged locally. (TODO: persist in backend.)",
      );
    };
    reader.readAsDataURL(file);
  };

  const currentPostureLabel = capitalize(form.defaultPosture);
  const currentMarketLabel =
    marketOptions.find((opt) => opt.value === form.defaultMarket)?.label ??
    form.defaultMarket;

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <div className="rounded-2xl border border-white/5 bg-gradient-to-r from-surface-elevated/70 via-surface-elevated/50 to-surface-elevated/70 p-5 md:p-6 shadow-lg shadow-black/20">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
              Settings
            </p>
            <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
              User, Business &amp; Team Settings
            </h1>
            <p className="text-sm text-text-secondary max-w-3xl">
              Control your default posture and market, pick a theme, and jump
              to org-level sandbox and governance tools. All reads/writes stay
              scoped to your org via RLS.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryChip
            icon={Icons.sliders}
            label="Default posture"
            value={isLoading ? "Loading..." : currentPostureLabel}
          />
          <SummaryChip
            icon={Icons.barChart}
            label="Default market"
            value={isLoading ? "Loading..." : currentMarketLabel}
          />
          <SummaryChip
            icon={Icons.edit}
            label="Theme"
            value={isLoading ? "Loading..." : themeLabel(form.theme)}
          />
        </div>
      </div>

      {/* Theme + underwriting defaults */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Theme preference */}
        <GlassCard className="p-5 space-y-4 border border-white/5 bg-surface-elevated/70">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <Icon d={Icons.edit} size={18} className="text-accent-blue" />
                Theme preference
              </h2>
              <p className="text-sm text-text-secondary">
                Pick the visual style for this device. Changes stage until you
                save.
              </p>
            </div>
          </div>
          <ThemeSwitcher
            onSelect={(value) => {
              setSuccess(null);
              setForm((prev) => ({ ...prev, theme: value }));
            }}
          />
        </GlassCard>

        {/* Underwriting defaults */}
        <GlassCard className="p-5 space-y-5 border border-white/5 bg-surface-elevated/70 lg:col-span-2">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <Icon d={Icons.user} size={18} className="text-accent-blue" />
                Underwriting defaults
              </h2>
              <p className="text-sm text-text-secondary">
                These defaults seed new underwriting sessions (posture, market,
                and theme). They continue to save through v1-user-settings with
                org-scoped RLS.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {success && (
                <p
                  className="text-sm text-accent-green"
                  role="status"
                  aria-live="polite"
                >
                  {success}
                </p>
              )}
              {error && (
                <p className="text-sm text-accent-orange" role="alert">
                  {error}
                </p>
              )}
              <Button
                onClick={onSave}
                disabled={isSaving || isLoading || !hasChanges}
                variant="primary"
              >
                {isSaving ? "Saving..." : "Save defaults"}
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-lg border border-white/5 bg-white/5 px-4 py-6 text-sm text-text-secondary">
              Loading settings...
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="Default posture"
                value={form.defaultPosture}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    defaultPosture: e.target.value,
                  }))
                }
                description="Choose which posture to start from when underwriting."
              >
                {Postures.map((posture) => (
                  <option key={posture} value={posture}>
                    {capitalize(posture)}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label="Default market"
                value={form.defaultMarket}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    defaultMarket: e.target.value,
                  }))
                }
                description="Market used for repair rates and defaults."
              >
                {marketOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </SelectField>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Profile / Business / Team */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Profile */}
        <GlassCard className="p-5 space-y-4 border border-white/5 bg-surface-elevated/70">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <Icon d={Icons.user} size={18} className="text-accent-blue" />
                Profile settings
              </h2>
              <p className="text-sm text-text-secondary">
                Manage your display name and account details.
              </p>
            </div>
            {!profileLoading && !profileError && (
              <Button
                size="sm"
                variant="neutral"
                onClick={onSaveProfile}
                disabled={profileSaving || !profile?.name?.trim()}
              >
                {profileSaving ? "Saving..." : "Save Profile"}
              </Button>
            )}
          </div>

          {profileLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-[68px] bg-white/5 rounded-lg" />
              <div className="h-[68px] bg-white/5 rounded-lg" />
            </div>
          ) : profileError ? (
            <div className="p-4 bg-accent-red/10 border border-accent-red/20 rounded-lg">
              <p className="text-accent-red text-sm">{profileError}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-sm text-accent-red/80 underline hover:text-accent-red"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              <div className="space-y-1">
                <label htmlFor="profile-name" className="text-sm font-semibold text-text-primary">
                  Your name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={profile?.name || ""}
                  onChange={(e) => {
                    setProfile((prev) =>
                      prev ? { ...prev, name: e.target.value } : null,
                    );
                    setProfileFieldError(null);
                  }}
                  className={`input-base min-h-[44px] ${
                    profileFieldError
                      ? "border-accent-red/50 focus:ring-accent-red/50"
                      : ""
                  }`}
                  placeholder="Your display name"
                  maxLength={100}
                  disabled={profileSaving}
                />
                {profileFieldError && (
                  <p className="text-sm text-accent-red">{profileFieldError}</p>
                )}
              </div>
              <div className="space-y-1">
                <label htmlFor="profile-email" className="text-sm font-semibold text-text-primary">
                  Email address
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={profile?.email || ""}
                  readOnly
                  className="input-base min-h-[44px] bg-white/5 text-text-secondary cursor-not-allowed"
                />
                <p className="text-xs text-text-secondary">
                  Email cannot be changed here
                </p>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Business */}
        <GlassCard className="p-5 space-y-4 border border-white/5 bg-surface-elevated/70">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <Icon d={Icons.briefcase} size={18} className="text-accent-blue" />
                Business settings
              </h2>
              <p className="text-sm text-text-secondary">
                Local-only for now. Future slice will persist org brand details.
              </p>
            </div>
            <Button size="sm" variant="neutral" onClick={onSaveBusiness}>
              Save Business
            </Button>
          </div>
          <div className="space-y-3">
            <LabeledInput
              label="Business name"
              value={business.name}
              onChange={(e) =>
                setBusiness((prev) => ({ ...prev, name: e.target.value }))
              }
            />
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-text-primary">
                Business logo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={onLogoChange}
                className="input-base"
              />
              {business.logoDataUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element -- local preview uses user-selected data URL */
                <img
                  src={business.logoDataUrl}
                  alt="Business logo preview"
                  className="h-12 w-12 rounded-full object-cover border border-white/10"
                />
              ) : (
                <p className="text-xs text-text-secondary">No logo uploaded.</p>
              )}
            </div>
          </div>
        </GlassCard>

        {/* Team */}
        <GlassCard className="p-5 space-y-4 border border-white/5 bg-surface-elevated/70">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <Icon d={Icons.users} size={18} className="text-accent-blue" />
                Team access
              </h2>
              <p className="text-sm text-text-secondary">
                Local-only invite list to mirror the prototype. RLS remains
                enforced in live paths.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="grid gap-3">
              <LabeledInput
                label="Invite by email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <SelectField
                label="Set role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                <option value="Viewer">Viewer (read-only)</option>
                <option value="Underwriter">
                  Underwriter (can edit deals)
                </option>
                <option value="Manager">Manager (approvals)</option>
              </SelectField>
              <Button onClick={onInvite} variant="primary">
                Send Invite (UI-only)
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Current team (local)
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-text-secondary">
                    <tr>
                      <th className="px-2 py-1">Name</th>
                      <th className="px-2 py-1">Email</th>
                      <th className="px-2 py-1">Role</th>
                      <th className="px-2 py-1 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.map((member) => (
                      <tr
                        key={member.id}
                        className="border-t border-white/5"
                      >
                        <td className="px-2 py-1 text-text-primary">
                          {member.name}
                        </td>
                        <td className="px-2 py-1 text-text-secondary">
                          {member.email}
                        </td>
                        <td className="px-2 py-1">
                          <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs font-semibold text-text-primary">
                            {member.role}
                          </span>
                        </td>
                        <td className="px-2 py-1 text-right">
                          <button
                            onClick={() => onRemoveMember(member.id)}
                            className="text-xs font-semibold text-accent-orange hover:text-accent-red"
                          >
                            Remove (UI-only)
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Workspace / guardrails */}
      <GlassCard className="p-5 space-y-4 border border-white/5 bg-surface-elevated/70">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <Icon d={Icons.users} size={18} className="text-accent-blue" />
              Workspace &amp; team guardrails
            </h2>
            <p className="text-sm text-text-secondary">
              Membership and RLS keep sandbox and policy changes scoped to your
              org. Use these entry points for team-level controls.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <BadgePill label="RLS enforced" />
            <Link
              href="/settings/policy-overrides"
              className="rounded-md border border-accent-blue/50 bg-accent-blue/10 px-3 py-2 text-sm font-semibold text-accent-blue hover:border-accent-blue/70 hover:bg-accent-blue/15"
            >
              View overrides queue
            </Link>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-start gap-3 rounded-lg border border-white/5 bg-white/5 p-4 transition-colors hover:border-accent-blue/60 hover:bg-accent-blue/5"
            >
              <div className="rounded-md bg-accent-blue/10 p-2 text-accent-blue">
                <Icon d={link.icon} size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary group-hover:text-accent-blue">
                  {link.label}
                </p>
                <p className="text-xs text-text-secondary">
                  {link.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
        {localMessage && (
          <p className="text-xs text-text-secondary">
            Note: {localMessage}
          </p>
        )}
      </GlassCard>

      {/* Account / Danger zone */}
      <GlassCard className="p-5 space-y-4 border border-accent-red/30 bg-accent-red/5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <Icon d={Icons.shield} size={18} className="text-accent-red" />
              Account
            </h2>
            <p className="text-sm text-text-secondary">Ends your session on this device.</p>
          </div>
          <Link href="/logout">
            <Button variant="danger">Sign out</Button>
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}

function mapSettingsToForm(settings: UserSettings): FormState {
  const incomingTheme = settings.theme as ThemeSetting | undefined;
  const aliasTheme = incomingTheme ? (THEME_ALIASES[incomingTheme] ?? incomingTheme) : undefined;
  const normalizedTheme = aliasTheme && ALLOWED_THEME_VALUES.has(aliasTheme) ? aliasTheme : DEFAULTS.theme;
  return {
    defaultPosture: settings.defaultPosture ?? DEFAULTS.defaultPosture,
    defaultMarket: settings.defaultMarket ?? DEFAULTS.defaultMarket,
    theme: normalizedTheme,
  };
}

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function themeLabel(value: ThemeSetting) {
  const fromList = themeOptions.find((opt) => opt.value === value)?.label;
  if (fromList) return fromList;
  return capitalize(value || DEFAULTS.theme);
}

function SummaryChip({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2">
      <div className="rounded-md bg-accent-blue/10 p-2 text-accent-blue">
        <Icon d={icon} size={16} />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-text-secondary">
          {label}
        </p>
        <p className="text-sm font-semibold text-text-primary">{value}</p>
      </div>
    </div>
  );
}

function BadgePill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-accent-blue/50 bg-accent-blue/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-blue">
      <Icon d={Icons.shield} size={14} />
      {label}
    </span>
  );
}

function LabeledInput({
  label,
  ...props
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-semibold text-text-primary">{label}</label>
      <input {...props} className="input-base" />
    </div>
  );
}
