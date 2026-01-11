/**
 * ForeclosureDetailsSection - Complete Foreclosure Details form section
 * @module components/underwrite/sections/ForeclosureDetailsSection
 * @slice 13 of 22
 *
 * Florida Statutes Referenced:
 * - FL 702.10: Foreclosure timeline procedures
 * - FL 45.031: Judicial sale requirements
 * - FL 45.0315: Right of redemption
 *
 * Principles Applied:
 * - Component Architecture: Composition, clear props, single responsibility
 * - UX: Real-time timeline feedback, urgency indicators, visual feedback
 * - Integration: Uses SectionAccordion from Slice 06
 * - Design Tokens: All styling from tokens
 */

'use client';

import * as React from 'react';
import { Scale } from 'lucide-react';
import { cn, card, typography, colors } from '../utils';
import { SectionAccordion } from '../accordion';
import { ForeclosureFields } from './ForeclosureFields';
import {
  useForeclosureForm,
  type ForeclosureFormData,
} from './useForeclosureForm';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ForeclosureDetailsSectionProps {
  /** Initial form data */
  initialData?: Partial<ForeclosureFormData>;
  /** Whether section is expanded */
  isExpanded: boolean;
  /** Toggle callback */
  onToggle: () => void;
  /** Callback when form data changes */
  onChange?: (data: ForeclosureFormData) => void;
  /** Optional className */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// URGENCY LEVEL STYLING
// ═══════════════════════════════════════════════════════════════════════════════

const urgencyLevelStyles = {
  none: colors.text.muted,
  low: colors.text.muted,
  medium: colors.text.info,
  high: colors.text.warning,
  critical: colors.text.error,
} as const;

const urgencyBadgeStyles = {
  none: cn('bg-slate-500/20', colors.text.muted),
  low: cn('bg-slate-500/20', colors.text.muted),
  medium: cn('bg-blue-500/20', colors.text.info),
  high: cn('bg-amber-500/20', colors.text.warning),
  critical: cn('bg-red-500/20', colors.text.error),
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function ForeclosureDetailsSection({
  initialData,
  isExpanded,
  onToggle,
  onChange,
  className,
}: ForeclosureDetailsSectionProps): React.JSX.Element {
  const { state, setField, setTouched } = useForeclosureForm(initialData);

  // Stable onChange ref to avoid infinite loops
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  // Skip initial mount to prevent setState during render
  const isInitialMount = React.useRef(true);

  // Notify parent of changes (debounced by hook already)
  React.useEffect(() => {
    // Skip initial mount - parent already has initialData
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    onChangeRef.current?.(state.data);
  }, [state.data]);

  return (
    <SectionAccordion
      id="foreclosure-details"
      title="Foreclosure Details"
      icon={<Scale className="w-5 h-5" />}
      isExpanded={isExpanded}
      onToggle={onToggle}
      completedFields={state.completedFields}
      totalFields={state.totalFields}
      hasError={!state.isValid && Object.keys(state.touched).length > 0}
      className={className}
    >
      <div className="space-y-6">
        {/* Form Fields */}
        <ForeclosureFields
          data={state.data}
          errors={state.errors}
          touched={state.touched}
          visibleFields={state.visibleFields}
          onFieldChange={setField}
          onFieldBlur={setTouched}
        />

        {/* ─────────────────────────────────────────────────────────────────────
            Timeline Preview
        ───────────────────────────────────────────────────────────────────── */}
        {state.timelinePreview && (
          <div className={cn(card.base, 'p-4')}>
            {/* Header row */}
            <div className="flex items-center justify-between">
              <span className={cn(typography.label, colors.text.muted)}>
                Timeline Preview
              </span>
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium',
                  urgencyBadgeStyles[state.timelinePreview.urgency_level]
                )}
              >
                {state.timelinePreview.urgency_level.toUpperCase()}
              </span>
            </div>

            {/* Days until sale */}
            <div className="mt-3 flex items-baseline gap-2">
              <span
                className={cn(
                  'text-2xl font-bold tabular-nums',
                  urgencyLevelStyles[state.timelinePreview.urgency_level]
                )}
              >
                {state.timelinePreview.days_until_estimated_sale !== null
                  ? state.timelinePreview.days_until_estimated_sale
                  : '—'}
              </span>
              <span className={cn(typography.bodySmall, colors.text.muted)}>
                days until estimated sale
              </span>
            </div>

            {/* Source and motivation boost */}
            <div className="mt-3 grid gap-2">
              {/* Auction date source */}
              <div className="flex items-center gap-2">
                <span className={cn(typography.caption)}>Source:</span>
                <span
                  className={cn(typography.bodySmall, colors.text.secondary)}
                >
                  {formatAuctionSource(
                    state.timelinePreview.auction_date_source
                  )}
                </span>
              </div>

              {/* Seller motivation boost */}
              {state.timelinePreview.seller_motivation_boost > 0 && (
                <div className="flex items-center gap-2">
                  <span className={cn(typography.caption)}>
                    Motivation Boost:
                  </span>
                  <span
                    className={cn(
                      'text-sm font-medium tabular-nums',
                      colors.text.success
                    )}
                  >
                    +{state.timelinePreview.seller_motivation_boost}
                  </span>
                </div>
              )}

              {/* FL statute reference */}
              {state.timelinePreview.statute_reference && (
                <div className="flex items-center gap-2">
                  <span className={cn(typography.caption)}>Statute:</span>
                  <span
                    className={cn(typography.bodySmall, colors.text.secondary)}
                  >
                    {state.timelinePreview.statute_reference}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </SectionAccordion>
  );
}

ForeclosureDetailsSection.displayName = 'ForeclosureDetailsSection';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format auction date source for display.
 */
function formatAuctionSource(source: string): string {
  const sourceMap: Record<string, string> = {
    user_provided: 'User provided',
    estimated_from_judgment: 'Estimated from judgment',
    estimated_from_lis_pendens: 'Estimated from lis pendens',
    estimated_from_status: 'Estimated from status',
    none: 'Not applicable',
  };
  return sourceMap[source] ?? source;
}
