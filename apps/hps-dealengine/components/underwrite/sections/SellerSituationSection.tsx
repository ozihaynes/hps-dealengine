/**
 * SellerSituationSection - Complete Seller Situation form section
 * @module components/underwrite/sections/SellerSituationSection
 * @slice 12 of 22
 *
 * Principles Applied:
 * - Component Architecture: Composition, clear props, single responsibility
 * - UX: Real-time feedback, motivation preview, visual feedback
 * - Integration: Uses SectionAccordion from Slice 06
 * - Design Tokens: All styling from tokens
 */

'use client';

import * as React from 'react';
import { User } from 'lucide-react';
import { cn, card, typography, colors } from '../utils';
import { SectionAccordion } from '../accordion';
import { SellerSituationFields } from './SellerSituationFields';
import {
  useSellerSituationForm,
  type SellerSituationFormData,
} from './useSellerSituationForm';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SellerSituationSectionProps {
  /** Initial form data */
  initialData?: Partial<SellerSituationFormData>;
  /** Foreclosure boost from timeline (0-25) */
  foreclosureBoost?: number;
  /** Whether section is expanded */
  isExpanded: boolean;
  /** Toggle callback */
  onToggle: () => void;
  /** Callback when form data changes */
  onChange?: (data: SellerSituationFormData) => void;
  /** Optional className */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOTIVATION LEVEL STYLING
// ═══════════════════════════════════════════════════════════════════════════════

const motivationLevelStyles = {
  low: colors.text.muted,
  medium: colors.text.info,
  high: colors.text.warning,
  critical: colors.text.error,
} as const;

const confidenceStyles = {
  low: cn('bg-slate-500/20', colors.text.muted),
  medium: cn('bg-amber-500/20', colors.text.warning),
  high: cn('bg-emerald-500/20', colors.text.success),
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function SellerSituationSection({
  initialData,
  foreclosureBoost = 0,
  isExpanded,
  onToggle,
  onChange,
  className,
}: SellerSituationSectionProps): React.JSX.Element {
  const { state, setField, setTouched } = useSellerSituationForm(
    initialData,
    foreclosureBoost
  );

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
      id="seller-situation"
      title="Seller Situation"
      icon={<User className="w-5 h-5" />}
      isExpanded={isExpanded}
      onToggle={onToggle}
      completedFields={state.completedFields}
      totalFields={state.totalFields}
      hasError={!state.isValid && Object.keys(state.touched).length > 0}
      className={className}
    >
      <div className="space-y-6">
        {/* Form Fields */}
        <SellerSituationFields
          data={state.data}
          errors={state.errors}
          touched={state.touched}
          onFieldChange={setField}
          onFieldBlur={setTouched}
        />

        {/* ─────────────────────────────────────────────────────────────────────
            Motivation Preview
        ───────────────────────────────────────────────────────────────────── */}
        {state.motivationPreview && (
          <div className={cn(card.base, 'p-4')}>
            {/* Header row */}
            <div className="flex items-center justify-between">
              <span className={cn(typography.label, colors.text.muted)}>
                Motivation Preview
              </span>
              <span
                className={cn(
                  'text-lg font-bold tabular-nums',
                  motivationLevelStyles[state.motivationPreview.motivation_level]
                )}
              >
                {state.motivationPreview.motivation_score}/100
              </span>
            </div>

            {/* Confidence indicator */}
            <div className="mt-2 flex items-center gap-2">
              <span className={cn(typography.caption)}>Confidence:</span>
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full',
                  confidenceStyles[state.motivationPreview.confidence]
                )}
              >
                {state.motivationPreview.confidence}
              </span>
            </div>

            {/* Red flags */}
            {state.motivationPreview.red_flags.length > 0 && (
              <ul className="mt-3 space-y-1">
                {state.motivationPreview.red_flags.map((flag, i) => (
                  <li
                    key={i}
                    className={cn(
                      typography.bodySmall,
                      colors.text.warning,
                      'flex items-start gap-2'
                    )}
                  >
                    <span className="shrink-0" aria-hidden="true">
                      ⚠️
                    </span>
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </SectionAccordion>
  );
}

SellerSituationSection.displayName = 'SellerSituationSection';
