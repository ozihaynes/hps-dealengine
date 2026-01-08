"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Postures,
  type UserSettings,
  type TeamMember,
  type InvitationDisplay,
  type InviteRole,
  INVITE_ROLE_OPTIONS,
  getTeamRoleDisplay,
} from "@hps-internal/contracts";
import {
  fetchProfile,
  updateProfile,
  saveProfileDraft,
  getProfileDraft,
  clearProfileDraft,
  ProfileError,
} from "@/lib/profileSettings";
import {
  sendInvite,
  listInvites,
  revokeInvite,
  InviteError,
} from "@/lib/teamInvites";
import { listMembers, removeMember, TeamError } from "@/lib/teamMembers";
import {
  getOrganization,
  updateOrganization,
  uploadOrganizationLogo,
  removeOrganizationLogo,
  OrgError,
} from "@/lib/orgSettings";
import {
  MAX_LOGO_SIZE,
  ALLOWED_LOGO_TYPES,
  isAllowedLogoType,
  isValidLogoSize,
  formatFileSize,
} from "@hps-internal/contracts";
import { getSupabaseClient } from "@/lib/supabaseClient";

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

type OrgBusiness = {
  name: string;
  logoUrl: string | null;
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

  // ============================================================================
  // ORGANIZATION STATE (Real API integration - Slice 3)
  // ============================================================================
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [business, setBusiness] = useState<OrgBusiness | null>(null);
  const [businessLoading, setBusinessLoading] = useState(true);
  const [businessError, setBusinessError] = useState<string | null>(null);
  const [businessFieldError, setBusinessFieldError] = useState<string | null>(null);
  const [businessSaving, setBusinessSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [canEditBusiness, setCanEditBusiness] = useState(false); // VP-only

  // ============================================================================
  // TEAM STATE (Real API integration - Slice 2)
  // ============================================================================

  // Team members from API
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);

  // Pending invites from API
  const [pendingInvites, setPendingInvites] = useState<InvitationDisplay[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(true);

  // Permission check
  const [canManageTeam, setCanManageTeam] = useState(false);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("analyst");
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteFieldError, setInviteFieldError] = useState<string | null>(null);

  // Action states
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);

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

  // Load current org, team data, and organization settings from API (Slice 2 + 3)
  useEffect(() => {
    let isMounted = true;

    async function loadOrgAndTeamData() {
      // Get current user's org from their membership
      const supabase = getSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Get user's first org membership
      const { data: membership } = await supabase
        .from("memberships")
        .select("org_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (!membership?.org_id) {
        if (isMounted) {
          setMembersLoading(false);
          setInvitesLoading(false);
          setBusinessLoading(false);
        }
        return;
      }

      if (isMounted) {
        setCurrentOrgId(membership.org_id);
      }

      // Fetch organization settings (Slice 3)
      try {
        const orgResponse = await getOrganization(membership.org_id);
        if (isMounted) {
          setBusiness({
            name: orgResponse.organization.name,
            logoUrl: orgResponse.organization.logo_url || null,
          });
          setCanEditBusiness(orgResponse.caller_role === "vp");
          setBusinessLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setBusinessError(
            err instanceof OrgError ? err.message : "Failed to load organization",
          );
          setBusinessLoading(false);
        }
      }

      // Fetch team members (Slice 2)
      try {
        const teamResponse = await listMembers(membership.org_id);
        if (isMounted) {
          setMembers(teamResponse.members);
          setCanManageTeam(teamResponse.can_manage);
          setMembersLoading(false);

          // Fetch pending invites (only if can manage)
          if (teamResponse.can_manage) {
            try {
              const invitesResponse = await listInvites(membership.org_id);
              setPendingInvites(invitesResponse.invitations);
            } catch (err) {
              console.error("[settings] Failed to load invites:", err);
            }
          }
          setInvitesLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setMembersError(
            err instanceof Error ? err.message : "Failed to load team",
          );
          setMembersLoading(false);
          setInvitesLoading(false);
        }
      }
    }

    loadOrgAndTeamData();

    return () => {
      isMounted = false;
    };
  }, []);

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

  // Save business settings to API (Slice 3)
  const onSaveBusiness = useCallback(async () => {
    if (!business?.name?.trim() || !currentOrgId) {
      setBusinessFieldError("Business name is required");
      return;
    }

    try {
      setBusinessSaving(true);
      setBusinessError(null);
      setBusinessFieldError(null);

      await updateOrganization({
        org_id: currentOrgId,
        name: business.name.trim(),
      });

      setLocalMessage("Business settings saved successfully.");
    } catch (err) {
      if (err instanceof OrgError) {
        if (err.field === "name") {
          setBusinessFieldError(err.message);
        } else {
          setBusinessError(err.message);
        }
      } else {
        setBusinessError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setBusinessSaving(false);
    }
  }, [business, currentOrgId]);

  // Handle sending team invite (Slice 2)
  const handleSendInvite = useCallback(async () => {
    if (!inviteEmail.trim() || !currentOrgId) {
      setInviteFieldError("Email is required");
      return;
    }

    try {
      setInviteSending(true);
      setInviteError(null);
      setInviteFieldError(null);

      const result = await sendInvite({
        email: inviteEmail.trim(),
        role: inviteRole,
        org_id: currentOrgId,
      });

      // Success - clear form and refresh invites
      setInviteEmail("");
      setLocalMessage(result.message);

      // Refresh invite list
      if (canManageTeam) {
        const invitesResponse = await listInvites(currentOrgId);
        setPendingInvites(invitesResponse.invitations);
      }
    } catch (err) {
      if (err instanceof InviteError) {
        if (err.field === "email") {
          setInviteFieldError(err.message);
        } else {
          setInviteError(err.message);
        }
      } else {
        setInviteError("Failed to send invitation");
      }
    } finally {
      setInviteSending(false);
    }
  }, [inviteEmail, inviteRole, currentOrgId, canManageTeam]);

  // Handle revoking invite (Slice 2)
  const handleRevokeInvite = useCallback(
    async (invitationId: string) => {
      if (!currentOrgId) return;

      try {
        setRevokingInviteId(invitationId);

        await revokeInvite({ invitation_id: invitationId });

        // Remove from list
        setPendingInvites((prev) =>
          prev.filter((inv) => inv.id !== invitationId),
        );
        setLocalMessage("Invitation revoked");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to revoke invitation");
      } finally {
        setRevokingInviteId(null);
      }
    },
    [currentOrgId],
  );

  // Handle removing member (Slice 2)
  const handleRemoveMember = useCallback(
    async (userId: string) => {
      if (!currentOrgId) return;

      try {
        setRemovingMemberId(userId);
        setConfirmRemoveId(null);

        await removeMember({ user_id: userId, org_id: currentOrgId });

        // Remove from list
        setMembers((prev) => prev.filter((m) => m.user_id !== userId));
        setLocalMessage("Member removed");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to remove member");
      } finally {
        setRemovingMemberId(null);
      }
    },
    [currentOrgId],
  );

  // Handle logo file selection and upload (Slice 3)
  const onLogoChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !currentOrgId) return;

      // Validate file type
      if (!isAllowedLogoType(file.type)) {
        setBusinessFieldError(
          `Invalid file type. Allowed: ${ALLOWED_LOGO_TYPES.join(", ")}`,
        );
        return;
      }

      // Validate file size
      if (!isValidLogoSize(file.size)) {
        setBusinessFieldError(
          `File too large. Maximum size is ${formatFileSize(MAX_LOGO_SIZE)}.`,
        );
        return;
      }

      try {
        setLogoUploading(true);
        setBusinessError(null);
        setBusinessFieldError(null);

        const publicUrl = await uploadOrganizationLogo(currentOrgId, file);

        setBusiness((prev) =>
          prev ? { ...prev, logoUrl: publicUrl } : null,
        );
        setLocalMessage("Logo uploaded successfully.");
      } catch (err) {
        if (err instanceof OrgError) {
          setBusinessError(err.message);
        } else {
          setBusinessError("Failed to upload logo. Please try again.");
        }
      } finally {
        setLogoUploading(false);
        // Clear the file input
        event.target.value = "";
      }
    },
    [currentOrgId],
  );

  // Handle logo removal (Slice 3)
  const onRemoveLogo = useCallback(async () => {
    if (!currentOrgId) return;

    try {
      setLogoUploading(true);
      setBusinessError(null);

      await removeOrganizationLogo(currentOrgId);

      setBusiness((prev) =>
        prev ? { ...prev, logoUrl: null } : null,
      );
      setLocalMessage("Logo removed.");
    } catch (err) {
      if (err instanceof OrgError) {
        setBusinessError(err.message);
      } else {
        setBusinessError("Failed to remove logo. Please try again.");
      }
    } finally {
      setLogoUploading(false);
    }
  }, [currentOrgId]);

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
                {canEditBusiness
                  ? "Manage your organization's name and logo."
                  : "View your organization's details. Only VP can edit."}
              </p>
            </div>
            {!businessLoading && !businessError && canEditBusiness && (
              <Button
                size="sm"
                variant="neutral"
                onClick={onSaveBusiness}
                disabled={businessSaving || !business?.name?.trim()}
              >
                {businessSaving ? "Saving..." : "Save Business"}
              </Button>
            )}
          </div>

          {businessLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-[68px] bg-white/5 rounded-lg" />
              <div className="h-20 bg-white/5 rounded-lg" />
            </div>
          ) : businessError ? (
            <div className="p-4 bg-accent-red/10 border border-accent-red/20 rounded-lg">
              <p className="text-accent-red text-sm">{businessError}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-sm text-accent-red/80 underline hover:text-accent-red"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="business-name" className="text-sm font-semibold text-text-primary">
                  Business name
                </label>
                <input
                  id="business-name"
                  type="text"
                  value={business?.name || ""}
                  onChange={(e) => {
                    setBusiness((prev) =>
                      prev ? { ...prev, name: e.target.value } : null,
                    );
                    setBusinessFieldError(null);
                  }}
                  className={`input-base min-h-[44px] ${
                    businessFieldError
                      ? "border-accent-red/50 focus:ring-accent-red/50"
                      : ""
                  } ${!canEditBusiness ? "bg-white/5 text-text-secondary cursor-not-allowed" : ""}`}
                  placeholder="Your organization name"
                  maxLength={100}
                  disabled={businessSaving || !canEditBusiness}
                />
                {businessFieldError && (
                  <p className="text-sm text-accent-red">{businessFieldError}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-text-primary">
                  Business logo
                </label>
                {canEditBusiness && (
                  <input
                    type="file"
                    accept={ALLOWED_LOGO_TYPES.join(",")}
                    onChange={onLogoChange}
                    className="input-base"
                    disabled={logoUploading}
                  />
                )}
                {logoUploading && (
                  <p className="text-xs text-accent-blue animate-pulse">Uploading...</p>
                )}
                {business?.logoUrl ? (
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element -- org logo from storage */}
                    <img
                      src={business.logoUrl}
                      alt="Business logo"
                      className="h-12 w-auto max-w-[150px] object-contain rounded border border-white/10"
                    />
                    {canEditBusiness && (
                      <button
                        onClick={onRemoveLogo}
                        disabled={logoUploading}
                        className="text-xs text-accent-orange hover:text-accent-red disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-text-secondary">
                    {canEditBusiness
                      ? `No logo uploaded. Max ${formatFileSize(MAX_LOGO_SIZE)}.`
                      : "No logo uploaded."}
                  </p>
                )}
              </div>
            </div>
          )}
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
                {canManageTeam
                  ? "Manage team members and send invitations."
                  : "View your team members."}
              </p>
            </div>
          </div>

          {/* Loading State */}
          {membersLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-10 bg-white/5 rounded-lg" />
              <div className="h-10 bg-white/5 rounded-lg" />
              <div className="h-10 bg-white/5 rounded-lg" />
            </div>
          ) : membersError ? (
            <div className="p-4 bg-accent-red/10 border border-accent-red/20 rounded-lg">
              <p className="text-accent-red text-sm">{membersError}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-sm text-accent-red/80 underline hover:text-accent-red"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Invite Form (only for managers) */}
              {canManageTeam && (
                <div className="p-4 bg-white/5 rounded-lg space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Send invitation
                  </p>
                  <div className="space-y-1">
                    <label
                      htmlFor="invite-email"
                      className="text-sm font-semibold text-text-primary"
                    >
                      Email address
                    </label>
                    <input
                      id="invite-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => {
                        setInviteEmail(e.target.value);
                        setInviteFieldError(null);
                      }}
                      placeholder="colleague@company.com"
                      className={`input-base min-h-[44px] ${
                        inviteFieldError
                          ? "border-accent-red/50 focus:ring-accent-red/50"
                          : ""
                      }`}
                      disabled={inviteSending}
                    />
                    {inviteFieldError && (
                      <p className="text-sm text-accent-red">{inviteFieldError}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="invite-role"
                      className="text-sm font-semibold text-text-primary"
                    >
                      Role
                    </label>
                    <select
                      id="invite-role"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as InviteRole)}
                      className="input-base min-h-[44px]"
                      disabled={inviteSending}
                    >
                      {INVITE_ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {inviteError && (
                    <p className="text-sm text-accent-red">{inviteError}</p>
                  )}
                  <Button
                    onClick={handleSendInvite}
                    variant="primary"
                    disabled={inviteSending || !inviteEmail.trim()}
                    className="w-full min-h-[44px]"
                  >
                    {inviteSending ? "Sending..." : "Send Invite"}
                  </Button>
                </div>
              )}

              {/* Pending Invites (only for managers) */}
              {canManageTeam && pendingInvites.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Pending invitations ({pendingInvites.length})
                  </p>
                  <div className="space-y-2">
                    {pendingInvites.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                      >
                        <div>
                          <p className="text-sm text-text-primary">{invite.email}</p>
                          <p className="text-xs text-text-secondary">
                            {getTeamRoleDisplay(invite.role)} &bull; Expires{" "}
                            {new Date(invite.expires_at).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRevokeInvite(invite.id)}
                          disabled={revokingInviteId === invite.id}
                          className="min-h-[44px] px-3 text-xs font-semibold text-accent-orange hover:text-accent-red disabled:opacity-50"
                        >
                          {revokingInviteId === invite.id ? "..." : "Revoke"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Team Members */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Team members ({members.length})
                </p>
                <div className="space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.user_id}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue text-sm font-semibold">
                          {member.display_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="text-sm text-text-primary">
                            {member.display_name}
                            {member.is_self && (
                              <span className="ml-2 text-xs text-text-secondary">(you)</span>
                            )}
                          </p>
                          <p className="text-xs text-text-secondary">
                            {getTeamRoleDisplay(member.role)}
                          </p>
                        </div>
                      </div>
                      {canManageTeam && !member.is_self && member.role !== "vp" && (
                        <>
                          {confirmRemoveId === member.user_id ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleRemoveMember(member.user_id)}
                                disabled={removingMemberId === member.user_id}
                                className="min-h-[44px] px-3 text-xs font-semibold text-accent-red hover:text-accent-red/80 disabled:opacity-50"
                              >
                                {removingMemberId === member.user_id
                                  ? "..."
                                  : "Confirm"}
                              </button>
                              <button
                                onClick={() => setConfirmRemoveId(null)}
                                className="min-h-[44px] px-3 text-xs font-semibold text-text-secondary hover:text-text-primary"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmRemoveId(member.user_id)}
                              className="min-h-[44px] px-3 text-xs font-semibold text-accent-orange hover:text-accent-red"
                            >
                              Remove
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
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
