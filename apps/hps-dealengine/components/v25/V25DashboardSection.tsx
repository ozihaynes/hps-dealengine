/**
 * V25DashboardSection — Slice 13
 *
 * Feature-flagged wrapper for the V2.5 dashboard.
 * Uses the feature flag system to conditionally render V25Dashboard.
 *
 * Usage in overview page:
 * ```tsx
 * <V25DashboardSection fallback={<LegacyDashboard />} />
 * ```
 *
 * Feature Flag Control:
 * - URL param: ?v25=true
 * - LocalStorage: localStorage.setItem('v25_dashboard', 'true')
 * - Default: Based on FEATURE_FLAGS.V25_DASHBOARD.defaultValue
 *
 * @module V25DashboardSection
 */

'use client';

import { memo, Suspense } from 'react';
import { useFeatureFlag } from '@/lib/featureFlags';
import { V25Dashboard, type V25DashboardProps } from './V25Dashboard';
import { V25DashboardSkeleton } from './V25DashboardSkeleton';

// ─────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────

export interface V25DashboardSectionProps extends V25DashboardProps {
  /** Fallback content when V2.5 is disabled */
  fallback?: React.ReactNode;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
  /** Force enable (for testing/preview) */
  forceEnable?: boolean;
}

// ─────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────

export const V25DashboardSection = memo(function V25DashboardSection({
  fallback,
  loadingComponent,
  forceEnable,
  ...dashboardProps
}: V25DashboardSectionProps): JSX.Element {
  const isV25Enabled = useFeatureFlag('v25_dashboard');

  // Check if V2.5 dashboard should be shown
  const showV25 = forceEnable ?? isV25Enabled;

  // ─────────────────────────────────────────────────────────────────
  // FALLBACK: Show legacy dashboard when V2.5 is disabled
  // ─────────────────────────────────────────────────────────────────

  if (!showV25) {
    return (
      <div data-testid="v25-section" data-enabled="false">
        {fallback ?? null}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // V2.5 ENABLED: Render with Suspense boundary
  // ─────────────────────────────────────────────────────────────────

  return (
    <div data-testid="v25-section" data-enabled="true">
      <Suspense
        fallback={
          loadingComponent ?? (
            <V25DashboardSkeleton
              compact={dashboardProps.compact}
              showDetailedCards={dashboardProps.showDetailedCards}
            />
          )
        }
      >
        <V25Dashboard {...dashboardProps} />
      </Suspense>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────

export default V25DashboardSection;
