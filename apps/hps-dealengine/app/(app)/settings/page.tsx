import { redirect } from 'next/navigation';

/**
 * Settings Hub Page
 *
 * Redirects to the User Settings tab (first tab in the settings navigation).
 * The tab-based navigation provides access to all main settings sections.
 */
export default function SettingsHubPage() {
  redirect('/settings/user');
}
