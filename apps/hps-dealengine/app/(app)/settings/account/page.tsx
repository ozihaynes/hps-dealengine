'use client';

import { useRouter } from 'next/navigation';
import { Shield, LogOut } from 'lucide-react';
import { SettingsLayout } from '@/components/settings/SettingsLayout';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { Button } from '@/components/ui';

/**
 * Account Settings Page
 *
 * Security settings and account actions (sign out).
 * Tab 3 of 3 in the Settings section.
 *
 * Accessibility:
 * - Proper button semantics (not nested in Link)
 * - aria-live for session status
 * - Reduced motion support for pulse animation
 */
export default function AccountSettingsPage(): JSX.Element {
  const router = useRouter();

  const handleSignOut = (): void => {
    router.push('/logout');
  };

  return (
    <SettingsLayout
      title="Account"
      description="Security settings and account actions."
    >
      {/* Sign Out Section */}
      <SettingsCard
        title="Sign Out"
        description="End your session on this device."
        icon={<Shield className="h-5 w-5" />}
        variant="danger"
        data-testid="settings-card-signout"
        footer={
          <Button
            type="button"
            variant="danger"
            onClick={handleSignOut}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </Button>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            Signing out will end your current session. You will need to sign in
            again to access your account.
          </p>
          <div
            className="p-3 bg-accent-red/10 border border-accent-red/20 rounded-lg"
            role="alert"
          >
            <p className="text-xs text-accent-red/80">
              <strong>Note:</strong> Any unsaved changes will be lost when you
              sign out.
            </p>
          </div>
        </div>
      </SettingsCard>

      {/* Session Info */}
      <SettingsCard
        title="Session Information"
        description="Details about your current session."
        icon={<Shield className="h-5 w-5" />}
        data-testid="settings-card-session"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <p className="text-sm font-medium text-text-primary">
                Current Device
              </p>
              <p className="text-xs text-text-secondary">
                This browser session is active
              </p>
            </div>
            <span
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-accent-green/10 text-accent-green text-xs font-medium"
              role="status"
              aria-live="polite"
            >
              <span
                className="h-1.5 w-1.5 rounded-full bg-accent-green animate-pulse motion-reduce:animate-none"
                aria-hidden="true"
              />
              Active
            </span>
          </div>
          <p className="text-xs text-text-secondary">
            Sessions are secured with industry-standard encryption and
            automatically expire after a period of inactivity.
          </p>
        </div>
      </SettingsCard>
    </SettingsLayout>
  );
}
