'use client';

import { useState } from 'react';
import { SettingsLayout } from '@/components/settings/SettingsLayout';
import { BusinessSection } from '@/components/settings/BusinessSection';
import { TeamSection } from '@/components/settings/TeamSection';

/**
 * Organization Settings Page
 *
 * Business settings and team management.
 * Tab 2 of 3 in the Settings section.
 */
export default function OrganizationSettingsPage() {
  const [orgId, setOrgId] = useState<string | null>(null);

  return (
    <SettingsLayout
      title="Organization"
      description="Manage your business settings and team members."
    >
      <BusinessSection orgId={orgId} onOrgLoaded={setOrgId} />
      <TeamSection orgId={orgId} />
    </SettingsLayout>
  );
}
