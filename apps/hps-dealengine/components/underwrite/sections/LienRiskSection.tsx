/**
 * LienRiskSection - Complete Lien Risk form section
 * @module components/underwrite/sections/LienRiskSection
 * @slice 14 of 22
 *
 * Florida Statutes Referenced:
 * - FL 720.3085: Joint liability for HOA/CDD assessments
 *
 * Principles Applied:
 * - Component Architecture: Composition, clear props, single responsibility
 * - UX: Real-time lien summary, risk indicators, blocking warnings
 * - Integration: Uses SectionAccordion from Slice 06
 * - Design Tokens: All styling from tokens
 */

'use client';

import * as React from 'react';
import { DollarSign, AlertTriangle } from 'lucide-react';
import { cn, card, typography, colors } from '../utils';
import { SectionAccordion } from '../accordion';
import { LienRiskFields } from './LienRiskFields';
import { useLienRiskForm, type LienRiskFormData } from './useLienRiskForm';
import { LIEN_BLOCKING_THRESHOLD } from '@/lib/engine';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LienRiskSectionProps {
  /** Initial form data */
  initialData?: Partial<LienRiskFormData>;
  /** Whether section is expanded */
  isExpanded: boolean;
  /** Toggle callback */
  onToggle: () => void;
  /** Callback when form data changes */
  onChange?: (data: LienRiskFormData) => void;
  /** Optional className */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RISK LEVEL STYLING
// ═══════════════════════════════════════════════════════════════════════════════

const riskLevelStyles = {
  low: colors.text.success,
  medium: colors.text.info,
  high: colors.text.warning,
  critical: colors.text.error,
} as const;

const riskBadgeStyles = {
  low: cn('bg-emerald-500/20', colors.text.success),
  medium: cn('bg-blue-500/20', colors.text.info),
  high: cn('bg-amber-500/20', colors.text.warning),
  critical: cn('bg-red-500/20', colors.text.error),
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function LienRiskSection({
  initialData,
  isExpanded,
  onToggle,
  onChange,
  className,
}: LienRiskSectionProps): React.JSX.Element {
  const { state, setField, setTouched } = useLienRiskForm(initialData);

  // Stable onChange ref to avoid infinite loops
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  // Skip initial mount to prevent setState during render
  const isInitialMount = React.useRef(true);

  // Notify parent of changes
  React.useEffect(() => {
    // Skip initial mount - parent already has initialData
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    onChangeRef.current?.(state.data);
  }, [state.data]);

  // Computed values for display
  const hasBlockingLiens = state.lienPreview?.blocking_gate_triggered ?? false;
  const hasJointLiability = state.lienPreview?.joint_liability_warning ?? false;

  return (
    <SectionAccordion
      id="lien-risk"
      title="Lien Risk"
      icon={<DollarSign className="w-5 h-5" />}
      isExpanded={isExpanded}
      onToggle={onToggle}
      completedFields={state.completedFields}
      totalFields={state.totalFields}
      hasError={hasBlockingLiens}
      className={className}
    >
      <div className="space-y-6">
        {/* Form Fields */}
        <LienRiskFields
          data={state.data}
          errors={state.errors}
          touched={state.touched}
          onFieldChange={setField}
          onFieldBlur={setTouched}
        />

        {/* ─────────────────────────────────────────────────────────────────────
            Lien Summary Preview
        ───────────────────────────────────────────────────────────────────── */}
        {state.lienPreview && (
          <div
            className={cn(
              card.base,
              'p-4',
              hasBlockingLiens && 'border-red-500/50 bg-red-500/5'
            )}
          >
            {/* Header row */}
            <div className="flex items-center justify-between mb-3">
              <span className={cn(typography.label, colors.text.muted)}>
                Total Surviving Liens
              </span>
              <span
                className={cn(
                  'text-xs px-2.5 py-1 rounded-full font-medium uppercase tracking-wide',
                  riskBadgeStyles[state.lienPreview.risk_level]
                )}
              >
                {state.lienPreview.risk_level}
              </span>
            </div>

            {/* Total amount (large display) */}
            <div className="mb-4">
              <span
                className={cn(
                  'text-3xl font-bold tabular-nums',
                  riskLevelStyles[state.lienPreview.risk_level]
                )}
              >
                ${state.lienPreview.total_surviving_liens.toLocaleString()}
              </span>
            </div>

            {/* Breakdown grid */}
            {(state.lienPreview.breakdown.hoa > 0 ||
              state.lienPreview.breakdown.cdd > 0 ||
              state.lienPreview.breakdown.property_tax > 0 ||
              state.lienPreview.breakdown.municipal > 0) && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm mb-4">
                {state.lienPreview.breakdown.hoa > 0 && (
                  <>
                    <span className={colors.text.muted}>HOA:</span>
                    <span className={cn(colors.text.secondary, 'tabular-nums')}>
                      ${state.lienPreview.breakdown.hoa.toLocaleString()}
                    </span>
                  </>
                )}
                {state.lienPreview.breakdown.cdd > 0 && (
                  <>
                    <span className={colors.text.muted}>CDD:</span>
                    <span className={cn(colors.text.secondary, 'tabular-nums')}>
                      ${state.lienPreview.breakdown.cdd.toLocaleString()}
                    </span>
                  </>
                )}
                {state.lienPreview.breakdown.property_tax > 0 && (
                  <>
                    <span className={colors.text.muted}>Property Tax:</span>
                    <span className={cn(colors.text.secondary, 'tabular-nums')}>
                      ${state.lienPreview.breakdown.property_tax.toLocaleString()}
                    </span>
                  </>
                )}
                {state.lienPreview.breakdown.municipal > 0 && (
                  <>
                    <span className={colors.text.muted}>Municipal:</span>
                    <span className={cn(colors.text.secondary, 'tabular-nums')}>
                      ${state.lienPreview.breakdown.municipal.toLocaleString()}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Warnings */}
            <div className="space-y-2">
              {/* Joint Liability Warning */}
              {hasJointLiability && (
                <div
                  className={cn(
                    'flex items-start gap-2 p-2 rounded',
                    'bg-amber-500/10'
                  )}
                >
                  <AlertTriangle
                    className={cn('w-4 h-4 mt-0.5 shrink-0', colors.text.warning)}
                    aria-hidden="true"
                  />
                  <span className={cn(typography.bodySmall, colors.text.warning)}>
                    <strong>FL 720.3085:</strong> Buyer becomes jointly liable
                    for unpaid HOA/CDD assessments
                  </span>
                </div>
              )}

              {/* Blocking Gate Warning */}
              {hasBlockingLiens && (
                <div
                  className={cn(
                    'flex items-start gap-2 p-2 rounded',
                    'bg-red-500/10'
                  )}
                >
                  <AlertTriangle
                    className={cn('w-4 h-4 mt-0.5 shrink-0', colors.text.error)}
                    aria-hidden="true"
                  />
                  <span className={cn(typography.bodySmall, colors.text.error)}>
                    <strong>BLOCKING:</strong> Total liens exceed $
                    {LIEN_BLOCKING_THRESHOLD.toLocaleString()} threshold
                  </span>
                </div>
              )}

              {/* Evidence Needed */}
              {state.lienPreview.evidence_needed.length > 0 && (
                <div className={cn('text-sm', colors.text.muted)}>
                  <span className="font-medium">Evidence needed: </span>
                  <span className={colors.text.secondary}>
                    {state.lienPreview.evidence_needed.join(', ')}
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

LienRiskSection.displayName = 'LienRiskSection';
