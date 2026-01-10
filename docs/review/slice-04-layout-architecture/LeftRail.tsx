/**
 * LeftRail - Navigation sidebar
 * @module components/underwrite/layout/LeftRail
 * @slice 04 of 22
 *
 * Principles Applied:
 * - ARIA landmark: role="navigation"
 * - Sticky positioning for scroll context
 * - Scroll forwarding to center content
 * - Hidden on mobile (content moves to mobile nav)
 */

'use client';

import * as React from 'react';
import { cn } from '../utils';

export interface LeftRailProps {
  /** Navigation content */
  children?: React.ReactNode;
  /** Wheel event handler for scroll forwarding */
  onWheel?: (e: WheelEvent) => void;
  /** Optional className for customization */
  className?: string;
}

/**
 * Left navigation rail component.
 * Fixed width (280px), sticky, hidden on mobile.
 */
export function LeftRail({ children, onWheel, className }: LeftRailProps): React.JSX.Element {
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
      role="navigation"
      aria-label="Section navigation"
      className={cn(
        // Hidden on mobile, visible on lg+
        'hidden lg:flex lg:flex-col',
        // Sticky positioning
        'sticky top-0 h-screen',
        // Border separation
        'border-r border-slate-800/50',
        // Background with glassmorphism
        'bg-slate-950/80 backdrop-blur-sm',
        // Padding
        'p-4',
        // Allow internal scrolling when content overflows
        'overflow-y-auto overflow-x-hidden',
        // Custom scrollbar (webkit)
        'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700',
        className
      )}
    >
      {children}
    </aside>
  );
}

LeftRail.displayName = 'LeftRail';
