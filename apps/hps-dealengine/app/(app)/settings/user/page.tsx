'use client';

import { SettingsLayout } from '@/components/settings/SettingsLayout';
import { ProfileSection } from '@/components/settings/ProfileSection';
import { PreferencesSection } from '@/components/settings/PreferencesSection';

/**
 * User Settings Page
 *
 * Personal preferences and profile management.
 * Tab 1 of 3 in the Settings section.
 *
 * Note: Consider wrapping with ErrorBoundary for production
 */
export default function UserSettingsPage(): JSX.Element {
  return (
    <SettingsLayout
      title="User Settings"
      description="Manage your personal preferences and profile information."
    >
      <ProfileSection />
      <PreferencesSection />
    </SettingsLayout>
  );
}
