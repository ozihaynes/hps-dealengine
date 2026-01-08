/**
 * Settings Page Configuration
 *
 * Defines tabs, routes, and options for the Settings page.
 * Used by SettingsLayout and SettingsNav components.
 *
 * @module settings-config
 */

import type { LucideIcon } from 'lucide-react';
import { User, Building2, Shield } from 'lucide-react';

// ============================================================================
// TAB CONFIGURATION
// ============================================================================

export interface SettingsTab {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

export const SETTINGS_TABS: readonly SettingsTab[] = [
  {
    id: 'user',
    label: 'User',
    href: '/settings/user',
    icon: User,
    description: 'Personal preferences and profile',
  },
  {
    id: 'organization',
    label: 'Organization',
    href: '/settings/organization',
    icon: Building2,
    description: 'Business settings and team management',
  },
  {
    id: 'account',
    label: 'Account',
    href: '/settings/account',
    icon: Shield,
    description: 'Security and account actions',
  },
] as const;

export type SettingsTabId = (typeof SETTINGS_TABS)[number]['id'];

/**
 * Get tab by ID
 * @param id - Tab identifier
 * @returns SettingsTab if found, undefined otherwise
 */
export function getSettingsTab(id: string): SettingsTab | undefined {
  return SETTINGS_TABS.find((tab) => tab.id === id);
}

/**
 * Get tab by pathname (matches if pathname starts with tab href)
 * @param pathname - Current route pathname
 * @returns SettingsTab if found, undefined otherwise
 */
export function getSettingsTabByPath(pathname: string): SettingsTab | undefined {
  return SETTINGS_TABS.find((tab) => pathname.startsWith(tab.href));
}

// ============================================================================
// FORM OPTIONS
// ============================================================================

export const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (no DST)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'UTC', label: 'UTC' },
] as const;

export const POSTURE_OPTIONS = [
  { value: 'base', label: 'Base' },
  { value: 'aggressive', label: 'Aggressive' },
  { value: 'conservative', label: 'Conservative' },
] as const;

export const MARKET_OPTIONS = [
  { value: 'ORL', label: 'Orlando (ORL)' },
  { value: 'TPA', label: 'Tampa (TPA)' },
  { value: 'JAX', label: 'Jacksonville (JAX)' },
  { value: 'MIA', label: 'Miami (MIA)' },
  { value: 'FTL', label: 'Fort Lauderdale (FTL)' },
] as const;

// ============================================================================
// ROLE CONFIGURATION
// ============================================================================

export const ROLE_CONFIG = {
  vp: {
    label: 'VP',
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/10',
    description: 'Full access to all settings and team management',
  },
  manager: {
    label: 'Manager',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    description: 'Can manage deals and view team settings',
  },
  analyst: {
    label: 'Analyst',
    color: 'text-slate-400',
    bgColor: 'bg-slate-400/10',
    description: 'Can view and analyze deals',
  },
} as const;

export type Role = keyof typeof ROLE_CONFIG;
