/**
 * Settings Components Barrel Export
 *
 * Usage:
 * import { SettingsLayout, SettingsCard, SettingsNav } from '@/components/settings';
 */

// Layout Components
export { SettingsLayout } from './SettingsLayout';
export { SettingsNav } from './SettingsNav';
export { SettingsCard } from './SettingsCard';
export { SaveStatus, type SaveStatusType } from './SaveStatus';

// Section Components
export { ProfileSection } from './ProfileSection';
export { PreferencesSection } from './PreferencesSection';
export { BusinessSection } from './BusinessSection';
export { TeamSection } from './TeamSection';

// Re-export ThemeSwitcher from existing location
// Note: Verify this path matches your project structure
export { ThemeSwitcher } from '@/components/settings/ThemeSwitcher';

// Re-export types from config
export type {
  SettingsTab,
  SettingsTabId,
  Role,
} from '@/lib/constants/settings-config';
