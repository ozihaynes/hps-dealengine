/**
 * Feature Flag System for HPS DealEngine
 *
 * Principles Applied:
 * - Gradual rollout capability
 * - Type-safe flag definitions
 * - Server/client compatible
 * - Audit trail via localStorage key
 *
 * @module featureFlags
 */

/**
 * All feature flags with their default values
 *
 * Convention:
 * - Prefix with feature area (v25_, import_, ai_)
 * - Default to false for new features (opt-in)
 * - Default to true for established features
 */
export const FEATURE_FLAGS = {
  /** V2.5 Dashboard with Decision Hero, Confidence Indicators, etc. */
  v25_dashboard: true,

  /** V2.5 Deals List with card layout instead of table */
  v25_deals_list: false,

  /** Animation system (framer-motion) */
  v25_animations: true,

  /** Real-time updates via Supabase subscription */
  v25_realtime: false,

  /** Field mode mobile view */
  v25_field_mode: true,
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

/**
 * Check if a feature flag is enabled
 *
 * Priority order:
 * 1. URL override (?ff_v25_dashboard=true)
 * 2. localStorage override (for dev/testing)
 * 3. Default value from FEATURE_FLAGS
 *
 * @example
 * if (isFeatureEnabled('v25_dashboard')) {
 *   return <V25Dashboard />;
 * }
 */
export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  // Server-side: use defaults only
  if (typeof window === 'undefined') {
    return FEATURE_FLAGS[flag];
  }

  // 1. Check URL override (highest priority for testing)
  const urlParams = new URLSearchParams(window.location.search);
  const urlOverride = urlParams.get(`ff_${flag}`);
  if (urlOverride !== null) {
    return urlOverride === 'true' || urlOverride === '1';
  }

  // 2. Check localStorage override (for persistent dev testing)
  try {
    const stored = localStorage.getItem(`ff_${flag}`);
    if (stored !== null) {
      return stored === 'true' || stored === '1';
    }
  } catch {
    // localStorage not available (SSR, private browsing)
  }

  // 3. Return default
  return FEATURE_FLAGS[flag];
}

/**
 * Set a feature flag override in localStorage
 *
 * @example
 * // Enable V2.5 dashboard for testing
 * setFeatureFlag('v25_dashboard', true);
 */
export function setFeatureFlag(flag: FeatureFlagKey, enabled: boolean): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(`ff_${flag}`, String(enabled));
  } catch {
    // localStorage not available
  }
}

/**
 * Clear a feature flag override (revert to default)
 */
export function clearFeatureFlag(flag: FeatureFlagKey): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(`ff_${flag}`);
  } catch {
    // localStorage not available
  }
}

/**
 * Get all feature flags with their current values
 * Useful for debugging and admin panels
 */
export function getAllFeatureFlags(): Record<FeatureFlagKey, boolean> {
  const flags = {} as Record<FeatureFlagKey, boolean>;

  for (const key of Object.keys(FEATURE_FLAGS) as FeatureFlagKey[]) {
    flags[key] = isFeatureEnabled(key);
  }

  return flags;
}

/**
 * React hook for feature flags (re-renders on URL change)
 *
 * @example
 * function MyComponent() {
 *   const isV25Enabled = useFeatureFlag('v25_dashboard');
 *   return isV25Enabled ? <V25Dashboard /> : <LegacyDashboard />;
 * }
 */
export function useFeatureFlag(flag: FeatureFlagKey): boolean {
  // For now, just return the static value
  // In future, could add useEffect to listen for URL/localStorage changes
  return isFeatureEnabled(flag);
}
