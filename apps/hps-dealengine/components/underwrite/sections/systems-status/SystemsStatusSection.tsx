/**
 * SystemsStatusSection - Property systems accordion section
 * @module components/underwrite/sections/systems-status/SystemsStatusSection
 * @slice 18 of 22
 *
 * Accordion section containing:
 * - Property systems form fields
 * - Live SystemsStatusCard preview
 *
 * Accessibility (WCAG 2.1 AA):
 * - Accordion keyboard navigation
 * - aria-expanded state
 * - Focus management
 *
 * Principles Applied:
 * - Atomic Design: Section-level component
 * - Visual Hierarchy: Form + Preview layout
 * - Performance: Debounced computation
 */

'use client';

import * as React from 'react';
import { Wrench } from 'lucide-react';
import { cn, colors } from '../../utils';
import { SectionAccordion } from '../../accordion';
import { SystemsStatusCard } from '../../visualizations';
import { SystemsStatusFields } from './SystemsStatusFields';
import { useSystemsStatusForm, type SystemsStatusFormData } from './useSystemsStatusForm';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SystemsStatusSectionProps {
  /** Initial form data */
  initialData?: Partial<SystemsStatusFormData>;
  /** Whether section is expanded */
  isExpanded: boolean;
  /** Toggle expansion callback */
  onToggle: () => void;
  /** Callback when form data changes */
  onChange?: (data: SystemsStatusFormData) => void;
  /** Optional className */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function SystemsStatusSection({
  initialData,
  isExpanded,
  onToggle,
  onChange,
  className,
}: SystemsStatusSectionProps): React.JSX.Element {
  // ─────────────────────────────────────────────────────────────────────────────
  // FORM HOOK
  // ─────────────────────────────────────────────────────────────────────────────

  const {
    data,
    output,
    isComputing,
    setField,
    completedFields,
    totalFields,
  } = useSystemsStatusForm({
    initialData,
  });

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
    onChangeRef.current?.(data);
  }, [data]);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <SectionAccordion
      id="property-systems"
      title="Property Systems"
      icon={<Wrench className="w-5 h-5" aria-hidden="true" />}
      isExpanded={isExpanded}
      onToggle={onToggle}
      completedFields={completedFields}
      totalFields={totalFields}
      className={className}
    >
      <div className="space-y-6">
        {/* ───────────────────────────────────────────────────────────────────────
            FORM FIELDS
        ─────────────────────────────────────────────────────────────────────── */}
        <SystemsStatusFields
          data={data}
          onFieldChange={setField}
        />

        {/* ───────────────────────────────────────────────────────────────────────
            PREVIEW CARD
        ─────────────────────────────────────────────────────────────────────── */}
        <div className="pt-4 border-t border-slate-700/50">
          <div className="flex items-center justify-between mb-3">
            <span className={cn('text-sm font-medium', colors.text.secondary)}>
              Systems Status Preview
            </span>
            {isComputing && (
              <span className={cn('text-xs', colors.text.muted)}>
                Computing...
              </span>
            )}
          </div>
          <SystemsStatusCard output={output} />
        </div>
      </div>
    </SectionAccordion>
  );
}

SystemsStatusSection.displayName = 'SystemsStatusSection';
