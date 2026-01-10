/**
 * SectionAccordion - Expandable form section with accessibility
 * @module components/underwrite/accordion/SectionAccordion
 * @slice 06 of 22
 *
 * Accessibility (WCAG 2.1):
 * - aria-expanded on trigger button
 * - aria-controls linking trigger to content
 * - role="region" on content with aria-labelledby
 * - Keyboard: Enter/Space to toggle
 *
 * Motion:
 * - Framer Motion animations (150-300ms)
 * - Respects prefers-reduced-motion via useMotion
 *
 * UX:
 * - CompletionBadge showing X/Y progress
 * - Visual indicators for error/warning/complete states
 * - Chevron rotation animation
 */

'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn, card, focus, touchTargets, useMotion } from '../utils';
import { CompletionBadge } from './CompletionBadge';

export interface SectionAccordionProps {
  /** Unique section ID (used for ARIA relationships) */
  id: string;
  /** Section title displayed in header */
  title: string;
  /** Optional icon displayed before title */
  icon?: React.ReactNode;
  /** Whether section is currently expanded */
  isExpanded: boolean;
  /** Callback when user toggles section */
  onToggle: () => void;
  /** Number of fields completed in this section */
  completedFields?: number;
  /** Total number of fields in this section */
  totalFields?: number;
  /** Whether section contains validation errors */
  hasError?: boolean;
  /** Whether section contains validation warnings */
  hasWarning?: boolean;
  /** Section content (form fields, etc.) */
  children: React.ReactNode;
  /** Optional className for customization */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * Accessible accordion section for form organization.
 *
 * @example
 * ```tsx
 * <SectionAccordion
 *   id="seller-situation"
 *   title="Seller Situation"
 *   icon={<User className="w-5 h-5" />}
 *   isExpanded={isExpanded('seller-situation')}
 *   onToggle={() => toggle('seller-situation')}
 *   completedFields={3}
 *   totalFields={7}
 * >
 *   <SellerSituationForm />
 * </SectionAccordion>
 * ```
 */
export function SectionAccordion({
  id,
  title,
  icon,
  isExpanded,
  onToggle,
  completedFields = 0,
  totalFields = 0,
  hasError = false,
  hasWarning = false,
  children,
  className,
  'data-testid': testId,
}: SectionAccordionProps): React.JSX.Element {
  const { getDurationSeconds } = useMotion();

  // ARIA IDs for accessibility relationships
  const contentId = `${id}-content`;
  const triggerId = `${id}-trigger`;

  // Handle keyboard navigation (WCAG 2.1.1)
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onToggle();
      }
    },
    [onToggle]
  );

  // Determine left border color based on status
  const isComplete = completedFields === totalFields && totalFields > 0;
  let statusBorderClass = '';

  if (hasError) {
    statusBorderClass = 'border-l-4 border-l-red-500';
  } else if (hasWarning) {
    statusBorderClass = 'border-l-4 border-l-amber-500';
  } else if (isComplete) {
    statusBorderClass = 'border-l-4 border-l-emerald-500';
  }

  return (
    <div
      className={cn(card.base, statusBorderClass, className)}
      data-testid={testId ?? `section-accordion-${id}`}
    >
      {/* Accordion Trigger Button */}
      <button
        id={triggerId}
        type="button"
        aria-expanded={isExpanded}
        aria-controls={contentId}
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full',
          touchTargets.min,
          'flex items-center justify-between',
          'px-4 py-3',
          'text-left',
          'rounded-xl',
          'hover:bg-white/5',
          'transition-colors duration-150',
          focus.ring
        )}
      >
        {/* Left side: Icon + Title */}
        <div className="flex items-center gap-3">
          {icon && (
            <span className="text-slate-400 flex-shrink-0" aria-hidden="true">
              {icon}
            </span>
          )}
          <span className="font-semibold text-white">{title}</span>
        </div>

        {/* Right side: Badge + Chevron */}
        <div className="flex items-center gap-3">
          {totalFields > 0 && (
            <CompletionBadge
              completed={completedFields}
              total={totalFields}
              hasError={hasError}
              hasWarning={hasWarning}
            />
          )}

          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: getDurationSeconds(200) }}
            className="flex-shrink-0"
          >
            <ChevronDown
              className="w-5 h-5 text-slate-400"
              aria-hidden="true"
            />
          </motion.div>
        </div>
      </button>

      {/* Accordion Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            id={contentId}
            role="region"
            aria-labelledby={triggerId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: {
                duration: getDurationSeconds(300),
                ease: 'easeInOut',
              },
              opacity: {
                duration: getDurationSeconds(200),
                ease: 'easeInOut',
              },
            }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

SectionAccordion.displayName = 'SectionAccordion';
