'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User } from 'lucide-react';
import { SettingsCard } from './SettingsCard';
import { SaveStatus, SaveStatusType } from './SaveStatus';
import { Button } from '@/components/ui';
import {
  fetchProfile,
  updateProfile,
  saveProfileDraft,
  getProfileDraft,
  clearProfileDraft,
  ProfileError,
} from '@/lib/profileSettings';
import { useToast } from '@/hooks/useToast';

interface ProfileData {
  name: string;
  email: string;
}

/**
 * ProfileSection
 *
 * Manages user profile settings (display name, email).
 * Includes API integration with draft persistence.
 *
 * Accessibility:
 * - aria-invalid indicates validation state
 * - aria-describedby links inputs to error messages
 * - aria-busy indicates loading operations
 * - WCAG 2.5.5 touch targets (44px)
 */
export function ProfileSection(): JSX.Element {
  const router = useRouter();
  const { toast } = useToast();

  // Profile state
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileFieldError, setProfileFieldError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatusType>('idle');

  // Load profile from API
  useEffect(() => {
    let isMounted = true;

    async function loadProfile(): Promise<void> {
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
              name: response.profile.display_name || '',
              email: response.email,
            });
            clearProfileDraft();
          }
        }
      } catch (err) {
        if (isMounted) {
          if (err instanceof ProfileError && err.status === 401) {
            router.push('/login?returnTo=/settings/user');
            return;
          }
          setProfileError(
            err instanceof Error ? err.message : 'Failed to load profile'
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

  // Save profile to API
  const onSaveProfile = useCallback(async (): Promise<void> => {
    if (!profile?.name?.trim()) {
      setProfileFieldError('Display name is required');
      return;
    }

    try {
      setSaveStatus('saving');
      setProfileError(null);
      setProfileFieldError(null);

      saveProfileDraft({ display_name: profile.name });

      await updateProfile({ display_name: profile.name.trim() });

      clearProfileDraft();
      setSaveStatus('success');
      toast.success('Profile saved', 'Your profile has been updated.');

      // Reset status after delay
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setSaveStatus('error');
      if (err instanceof ProfileError) {
        if (err.field === 'display_name') {
          setProfileFieldError(err.message);
        } else {
          setProfileError(err.message);
          toast.error('Save failed', err.message);
        }
      } else {
        setProfileError('An unexpected error occurred. Please try again.');
        toast.error('Save failed', 'An unexpected error occurred.');
      }
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [profile, toast]);

  // Loading state
  if (profileLoading) {
    return (
      <SettingsCard
        title="Profile"
        description="Manage your display name and account details."
        icon={<User className="h-5 w-5" />}
        data-testid="settings-card-profile"
      >
        <div
          className="space-y-3 animate-pulse motion-reduce:animate-none"
          aria-busy="true"
          aria-label="Loading profile"
        >
          <div className="h-[68px] bg-white/5 rounded-lg" />
          <div className="h-[68px] bg-white/5 rounded-lg" />
        </div>
      </SettingsCard>
    );
  }

  // Error state
  if (profileError && !profile) {
    return (
      <SettingsCard
        title="Profile"
        description="Manage your display name and account details."
        icon={<User className="h-5 w-5" />}
        data-testid="settings-card-profile"
      >
        <div
          className="p-4 bg-accent-red/10 border border-accent-red/20 rounded-lg"
          role="alert"
        >
          <p className="text-accent-red text-sm">{profileError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 text-sm text-accent-red/80 underline hover:text-accent-red min-h-[44px] inline-flex items-center"
          >
            Retry
          </button>
        </div>
      </SettingsCard>
    );
  }

  const hasNameError = !!profileFieldError;
  const nameErrorId = 'profile-name-error';

  return (
    <SettingsCard
      title="Profile"
      description="Manage your display name and account details."
      icon={<User className="h-5 w-5" />}
      data-testid="settings-card-profile"
      footer={
        <div className="flex items-center gap-3">
          <SaveStatus status={saveStatus} />
          <Button
            size="sm"
            variant="primary"
            onClick={onSaveProfile}
            disabled={saveStatus === 'saving' || !profile?.name?.trim()}
            data-testid="save-profile-button"
          >
            {saveStatus === 'saving' ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4">
        {/* Display Name */}
        <div className="space-y-1">
          <label
            htmlFor="profile-name"
            className="text-sm font-semibold text-text-primary"
          >
            Your name
          </label>
          <input
            id="profile-name"
            type="text"
            value={profile?.name || ''}
            onChange={(e) => {
              setProfile((prev) =>
                prev ? { ...prev, name: e.target.value } : null
              );
              setProfileFieldError(null);
            }}
            className={`input-base min-h-[44px] ${
              hasNameError
                ? 'border-accent-red/50 focus:ring-accent-red/50'
                : ''
            }`}
            placeholder="Your display name"
            maxLength={100}
            disabled={saveStatus === 'saving'}
            aria-invalid={hasNameError}
            aria-describedby={hasNameError ? nameErrorId : undefined}
            data-testid="profile-name-input"
          />
          {hasNameError && (
            <p id={nameErrorId} className="text-sm text-accent-red" role="alert">
              {profileFieldError}
            </p>
          )}
        </div>

        {/* Email (Read-only) */}
        <div className="space-y-1">
          <label
            htmlFor="profile-email"
            className="text-sm font-semibold text-text-primary"
          >
            Email address
          </label>
          <input
            id="profile-email"
            type="email"
            value={profile?.email || ''}
            readOnly
            className="input-base min-h-[44px] bg-white/5 text-text-secondary cursor-not-allowed"
            aria-readonly="true"
          />
          <p className="text-xs text-text-secondary">
            Email cannot be changed here
          </p>
        </div>
      </div>
    </SettingsCard>
  );
}
