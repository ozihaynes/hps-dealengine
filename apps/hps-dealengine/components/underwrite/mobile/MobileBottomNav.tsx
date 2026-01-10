/**
 * MobileBottomNav - Fixed bottom navigation for mobile
 * @module components/underwrite/mobile/MobileBottomNav
 * @slice 21 of 22
 *
 * Bottom navigation bar with section buttons and outputs toggle.
 * Hidden on desktop (lg:hidden), visible on mobile only.
 *
 * Accessibility (WCAG 2.1 AA):
 * - 44px minimum touch targets (WCAG 2.5.5)
 * - aria-current for active section
 * - aria-expanded for drawer toggle
 * - aria-hidden on decorative icons
 * - Proper focus styling
 *
 * Principles Applied:
 * - Touch: 44px targets via touchTargets.min
 * - Responsive: lg:hidden for mobile-only
 * - Visual Hierarchy: Active state highlighting
 */

'use client';

import * as React from 'react';
import { User, Scale, DollarSign, Wrench, BarChart3 } from 'lucide-react';
import { cn, touchTargets, focus } from '../utils';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface MobileBottomNavProps {
  /** Current active section ID */
  activeSection: string | null;
  /** Section change callback */
  onSectionChange: (sectionId: string) => void;
  /** Open outputs drawer callback */
  onOpenOutputs: () => void;
  /** Whether outputs drawer is open */
  isOutputsOpen: boolean;
  /** Optional className */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAV ITEMS CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const NAV_ITEMS = [
  { id: 'seller-situation', label: 'Seller', Icon: User },
  { id: 'foreclosure-details', label: 'Foreclosure', Icon: Scale },
  { id: 'lien-risk', label: 'Liens', Icon: DollarSign },
  { id: 'property-systems', label: 'Systems', Icon: Wrench },
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function MobileBottomNav({
  activeSection,
  onSectionChange,
  onOpenOutputs,
  isOutputsOpen,
  className,
}: MobileBottomNavProps): React.JSX.Element {
  return (
    <nav
      role="navigation"
      aria-label="Section navigation"
      className={cn(
        // Fixed at bottom, full width
        'fixed bottom-0 left-0 right-0 z-50',
        // Styling
        'bg-slate-900/95 backdrop-blur-lg',
        'border-t border-slate-800',
        // iOS safe area - padding at bottom
        'pb-[env(safe-area-inset-bottom)]',
        // Hide on desktop
        'lg:hidden',
        className
      )}
    >
      <div className="flex items-stretch justify-around">
        {/* Section buttons */}
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = activeSection === id;

          return (
            <button
              key={id}
              onClick={() => onSectionChange(id)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                // Touch target (44px)
                touchTargets.min,
                // Layout
                'flex flex-col items-center justify-center',
                'flex-1 py-2 px-1',
                // Focus
                focus.ring,
                // Color states
                isActive
                  ? 'text-emerald-400'
                  : 'text-slate-400 hover:text-slate-300',
                // Transition
                'transition-colors duration-150'
              )}
            >
              <Icon className="w-5 h-5 mb-1" aria-hidden="true" />
              <span className="text-[10px] font-medium leading-tight">
                {label}
              </span>
            </button>
          );
        })}

        {/* Outputs button */}
        <button
          onClick={onOpenOutputs}
          aria-expanded={isOutputsOpen}
          aria-label={isOutputsOpen ? 'Close outputs' : 'View outputs'}
          className={cn(
            // Touch target (44px)
            touchTargets.min,
            // Layout
            'flex flex-col items-center justify-center',
            'flex-1 py-2 px-1',
            // Focus
            focus.ring,
            // Color states
            isOutputsOpen
              ? 'text-emerald-400'
              : 'text-slate-400 hover:text-slate-300',
            // Transition
            'transition-colors duration-150'
          )}
        >
          <BarChart3 className="w-5 h-5 mb-1" aria-hidden="true" />
          <span className="text-[10px] font-medium leading-tight">Outputs</span>
        </button>
      </div>
    </nav>
  );
}

MobileBottomNav.displayName = 'MobileBottomNav';
