/**
 * CenterContent - Main scrollable content area
 * @module components/underwrite/layout/CenterContent
 * @slice 04 of 22
 *
 * Principles Applied:
 * - ARIA landmark: role="main"
 * - Primary scroll container for the page
 * - Responsive padding (tighter on mobile)
 * - Max-width constraint for readability
 */

'use client';

import * as React from 'react';
import { cn } from '../utils';

export interface CenterContentProps {
  /** Form section content */
  children: React.ReactNode;
  /** ID for skip link target */
  id?: string;
  /** Optional className for customization */
  className?: string;
}

/**
 * Center content area with main form sections.
 * This is the primary scroll container.
 */
export const CenterContent = React.forwardRef<HTMLElement, CenterContentProps>(
  function CenterContent({ children, id, className }, ref): React.JSX.Element {
    return (
      <main
        ref={ref}
        id={id}
        role="main"
        aria-label="Underwriting form content"
        tabIndex={-1} // Allows programmatic focus for skip link
        className={cn(
          // Full height, primary scroll container
          'h-screen overflow-y-auto',
          // Responsive padding
          'px-4 py-6',
          'sm:px-6',
          'lg:px-8 lg:py-8',
          // Max width for readability (prose width)
          'max-w-4xl mx-auto w-full',
          // Spacing between child sections
          'space-y-6',
          // Focus outline for skip link target
          'focus:outline-none',
          // Custom scrollbar
          'scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700',
          className
        )}
      >
        {children}
      </main>
    );
  }
);

CenterContent.displayName = 'CenterContent';
