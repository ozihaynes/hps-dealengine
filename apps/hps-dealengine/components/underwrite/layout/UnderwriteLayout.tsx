/**
 * UnderwriteLayout - 3-column responsive layout
 * @module components/underwrite/layout/UnderwriteLayout
 * @slice 04 of 22
 *
 * Principles Applied:
 * - CSS Grid for responsive layout (1 col mobile → 3 col desktop)
 * - ARIA landmarks for accessibility (navigation, main, complementary)
 * - Skip link for keyboard users (WCAG 2.1.1 bypass blocks)
 * - Scroll forwarding from rails to center content
 * - Sticky rails with independent scroll when needed
 *
 * Layout Dimensions:
 * - Left Rail: 280px (navigation)
 * - Center: flex (form content)
 * - Right Rail: 240px (outputs)
 */

'use client';

import * as React from 'react';
import { cn } from '../utils';
import { LeftRail } from './LeftRail';
import { CenterContent } from './CenterContent';
import { RightRail } from './RightRail';

export interface UnderwriteLayoutProps {
  /** Content for the left navigation rail */
  leftRailContent?: React.ReactNode;
  /** Main form content for center */
  children: React.ReactNode;
  /** Content for the right outputs rail */
  rightRailContent?: React.ReactNode;
  /** Optional className for customization */
  className?: string;
  /** ID for the deal being edited (for aria-describedby) */
  dealId?: string;
}

/**
 * 3-column responsive layout for underwrite page.
 *
 * Desktop (lg+): [LeftRail 280px] [Center flex] [RightRail 240px]
 * Mobile (<lg): Single column with center content only
 *
 * @example
 * ```tsx
 * <UnderwriteLayout
 *   leftRailContent={<SectionNav />}
 *   rightRailContent={<OutputsSummary />}
 *   dealId="deal-123"
 * >
 *   <SellerSection />
 *   <ForeclosureSection />
 * </UnderwriteLayout>
 * ```
 */
export function UnderwriteLayout({
  leftRailContent,
  children,
  rightRailContent,
  className,
  dealId,
}: UnderwriteLayoutProps): React.JSX.Element {
  const centerRef = React.useRef<HTMLElement>(null);

  /**
   * Scroll forwarding: when rails receive wheel events,
   * forward them to center content for unified scrolling.
   * Uses native event for passive: false support.
   */
  const handleRailWheel = React.useCallback((e: WheelEvent) => {
    if (centerRef.current) {
      centerRef.current.scrollTop += e.deltaY;
      e.preventDefault();
    }
  }, []);

  return (
    <>
      {/* Skip link for keyboard navigation (WCAG 2.1.1) */}
      <a
        href="#main-content"
        className={cn(
          // Hidden by default, visible on focus
          'sr-only focus:not-sr-only',
          // Position when focused
          'focus:absolute focus:top-4 focus:left-4 focus:z-[100]',
          // Styling when focused
          'focus:px-4 focus:py-2',
          'focus:bg-emerald-600 focus:text-white',
          'focus:rounded-lg focus:shadow-lg',
          'focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-950'
        )}
      >
        Skip to main content
      </a>

      <div
        className={cn(
          // Base layout
          'min-h-screen w-full',
          // Background
          'bg-slate-950',
          // Grid: single column on mobile, 3 columns on lg+
          'grid grid-cols-1',
          'lg:grid-cols-[280px_1fr_240px]',
          // No gap - borders handle separation
          'lg:gap-0',
          className
        )}
        role="region"
        aria-label={dealId ? `Underwriting form for deal ${dealId}` : 'Underwriting form'}
      >
        {/* Left Rail - Navigation */}
        <LeftRail onWheel={handleRailWheel}>{leftRailContent}</LeftRail>

        {/* Center Content - Main Form */}
        <CenterContent ref={centerRef} id="main-content">
          {children}
        </CenterContent>

        {/* Right Rail - Outputs */}
        <RightRail onWheel={handleRailWheel}>{rightRailContent}</RightRail>
      </div>
    </>
  );
}

UnderwriteLayout.displayName = 'UnderwriteLayout';
