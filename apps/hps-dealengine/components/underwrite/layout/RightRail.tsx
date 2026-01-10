/**
 * RightRail - Outputs and summary sidebar
 * @module components/underwrite/layout/RightRail
 * @slice 04 of 22
 *
 * Principles Applied:
 * - ARIA landmark: role="complementary"
 * - Sticky positioning for context
 * - Scroll forwarding to center content
 * - Hidden on mobile (outputs shown differently)
 */

'use client';

import * as React from 'react';
import { cn } from '../utils';

export interface RightRailProps {
  /** Outputs and summary content */
  children?: React.ReactNode;
  /** Wheel event handler for scroll forwarding */
  onWheel?: (e: WheelEvent) => void;
  /** Optional className for customization */
  className?: string;
}

/**
 * Right outputs rail component.
 * Fixed width (240px), sticky, hidden on mobile.
 */
export function RightRail({ children, onWheel, className }: RightRailProps): React.JSX.Element {
  const railRef = React.useRef<HTMLElement>(null);

  // Attach native wheel listener for scroll forwarding
  React.useEffect(() => {
    const rail = railRef.current;
    if (!rail || !onWheel) return;

    rail.addEventListener('wheel', onWheel, { passive: false });
    return () => rail.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  return (
    <aside
      ref={railRef}
      role="complementary"
      aria-label="Deal outputs and summary"
      className={cn(
        // Hidden on mobile, visible on lg+
        'hidden lg:flex lg:flex-col',
        // Sticky positioning
        'sticky top-0 h-screen',
        // Border separation
        'border-l border-slate-800/50',
        // Background with glassmorphism
        'bg-slate-950/80 backdrop-blur-sm',
        // Padding
        'p-4',
        // Allow internal scrolling when content overflows
        'overflow-y-auto overflow-x-hidden',
        // Custom scrollbar
        'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700',
        className
      )}
    >
      {children}
    </aside>
  );
}

RightRail.displayName = 'RightRail';
