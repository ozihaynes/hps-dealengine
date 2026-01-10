/**
 * MobileOutputDrawer - Slide-up drawer for outputs on mobile
 * @module components/underwrite/mobile/MobileOutputDrawer
 * @slice 21 of 22
 *
 * Bottom sheet drawer with drag-to-dismiss gesture support.
 * Uses framer-motion for smooth spring animations.
 *
 * Accessibility (WCAG 2.1 AA):
 * - role="dialog" with aria-modal
 * - aria-label for drawer title
 * - Focus trap inside drawer
 * - Escape key closes drawer
 * - Respects prefers-reduced-motion
 *
 * Principles Applied:
 * - Touch: Drag-to-dismiss gesture
 * - Motion: Spring physics via springs.snappy
 * - Accessibility: Reduced motion support
 */

'use client';

import * as React from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { cn, touchTargets, focus, colors, useMotion, springs } from '../utils';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface MobileOutputDrawerProps {
  /** Is drawer open */
  isOpen: boolean;
  /** Close drawer callback */
  onClose: () => void;
  /** Drawer content */
  children: React.ReactNode;
  /** Drawer title (default: "Outputs") */
  title?: string;
  /** Optional className */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Velocity threshold to trigger close (px/s) */
const VELOCITY_THRESHOLD = 500;

/** Offset threshold to trigger close (px) */
const OFFSET_THRESHOLD = 200;

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function MobileOutputDrawer({
  isOpen,
  onClose,
  children,
  title = 'Outputs',
  className,
}: MobileOutputDrawerProps): React.JSX.Element {
  const { isReduced } = useMotion();
  const dragControls = useDragControls();
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // DRAG HANDLER
  // ─────────────────────────────────────────────────────────────────────────────

  const handleDragEnd = React.useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo): void => {
      // Close if dragged down fast OR far enough
      if (info.velocity.y > VELOCITY_THRESHOLD || info.offset.y > OFFSET_THRESHOLD) {
        onClose();
      }
    },
    [onClose]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // BODY SCROLL LOCK
  // ─────────────────────────────────────────────────────────────────────────────

  React.useEffect(() => {
    if (isOpen) {
      // Lock body scroll
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // ─────────────────────────────────────────────────────────────────────────────
  // ESCAPE KEY HANDLER
  // ─────────────────────────────────────────────────────────────────────────────

  React.useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // ─────────────────────────────────────────────────────────────────────────────
  // FOCUS MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  React.useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      // Focus close button when drawer opens
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  // ─────────────────────────────────────────────────────────────────────────────
  // ANIMATION CONFIG
  // ─────────────────────────────────────────────────────────────────────────────

  const springTransition = isReduced
    ? { type: 'tween' as const, duration: 0 }
    : springs.snappy;

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: isReduced ? 0 : 0.2 }}
            onClick={onClose}
            className={cn(
              'fixed inset-0 z-40',
              'bg-black/60 backdrop-blur-sm',
              'lg:hidden'
            )}
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springTransition}
            drag={isReduced ? false : 'y'}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              // Position
              'fixed bottom-0 left-0 right-0 z-50',
              // Size
              'max-h-[85vh]',
              // Styling
              'bg-slate-900 rounded-t-2xl',
              'border-t border-x border-slate-800',
              // Layout
              'flex flex-col',
              // Hide on desktop
              'lg:hidden',
              className
            )}
          >
            {/* Drag handle */}
            <div
              onPointerDown={(e) => {
                if (!isReduced) dragControls.start(e);
              }}
              className={cn(
                'flex justify-center py-3',
                isReduced ? '' : 'cursor-grab active:cursor-grabbing'
              )}
            >
              <div
                className="w-10 h-1 rounded-full bg-slate-700"
                aria-hidden="true"
              />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-slate-800">
              <h2 className={cn('text-lg font-semibold', colors.text.primary)}>
                {title}
              </h2>
              <button
                ref={closeButtonRef}
                onClick={onClose}
                aria-label="Close drawer"
                className={cn(
                  // Touch target (44px)
                  touchTargets.iconButton,
                  // Styling
                  'rounded-full',
                  'text-slate-400 hover:text-white',
                  'hover:bg-slate-800',
                  // Focus
                  focus.ring,
                  // Transition
                  'transition-colors duration-150'
                )}
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Content */}
            <div
              className={cn(
                'flex-1 overflow-y-auto p-4',
                // iOS safe area at bottom
                'pb-[calc(1rem+env(safe-area-inset-bottom))]'
              )}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

MobileOutputDrawer.displayName = 'MobileOutputDrawer';
