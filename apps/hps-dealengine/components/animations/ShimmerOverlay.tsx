/**
 * ShimmerOverlay Component
 *
 * Loading shimmer effect for skeleton states.
 * Uses CSS gradient animation for smooth performance.
 * Respects reduced motion preferences.
 *
 * @module components/animations/ShimmerOverlay
 * @version 1.0.0 (Slice 20 - Animation Library Enhancement)
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { prefersReducedMotion } from '@/lib/animations/tokens';
import { shimmer, skeletonPulse } from '@/lib/animations/variants';

// =============================================================================
// TYPES
// =============================================================================

export interface ShimmerOverlayProps {
  /** Width of the shimmer (default: 100%) */
  width?: string | number;
  /** Height of the shimmer (default: 100%) */
  height?: string | number;
  /** Border radius (default: 4px) */
  borderRadius?: string | number;
  /** Base color (default: slate-700) */
  baseColor?: string;
  /** Highlight color (default: slate-600) */
  highlightColor?: string;
  /** Animation duration in seconds (default: 1.5) */
  duration?: number;
  /** Additional CSS classes */
  className?: string;
  /** Fallback to pulse animation for reduced motion */
  fallbackToPulse?: boolean;
}

// =============================================================================
// SHIMMER STYLES
// =============================================================================

function getShimmerGradient(baseColor: string, highlightColor: string): string {
  return `linear-gradient(
    90deg,
    ${baseColor} 0%,
    ${highlightColor} 50%,
    ${baseColor} 100%
  )`;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ShimmerOverlay - Animated loading shimmer
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ShimmerOverlay width={200} height={20} />
 *
 * // Custom colors
 * <ShimmerOverlay
 *   width="100%"
 *   height={48}
 *   baseColor="#1f2937"
 *   highlightColor="#374151"
 * />
 *
 * // Rounded corners
 * <ShimmerOverlay
 *   width={40}
 *   height={40}
 *   borderRadius="50%"
 * />
 * ```
 */
export function ShimmerOverlay({
  width = '100%',
  height = '100%',
  borderRadius = 4,
  baseColor = '#334155', // slate-700
  highlightColor = '#475569', // slate-600
  duration = 1.5,
  className = '',
  fallbackToPulse = true,
}: ShimmerOverlayProps): React.ReactElement {
  const shouldReduceMotion = prefersReducedMotion();

  const style: React.CSSProperties = {
    width,
    height,
    borderRadius,
    background: getShimmerGradient(baseColor, highlightColor),
    backgroundSize: '200% 100%',
  };

  // Reduced motion: static or pulse fallback
  if (shouldReduceMotion) {
    if (fallbackToPulse) {
      return (
        <motion.div
          className={className}
          style={{
            width,
            height,
            borderRadius,
            backgroundColor: baseColor,
          }}
          variants={skeletonPulse}
          animate="animate"
        />
      );
    }

    return (
      <div
        className={className}
        style={{
          width,
          height,
          borderRadius,
          backgroundColor: baseColor,
        }}
      />
    );
  }

  return (
    <motion.div
      className={className}
      style={style}
      variants={shimmer}
      initial="initial"
      animate="animate"
    />
  );
}

// =============================================================================
// SKELETON COMPONENTS
// =============================================================================

/**
 * SkeletonText - Text line skeleton
 */
export interface SkeletonTextProps {
  /** Width (default: 100%) */
  width?: string | number;
  /** Line height (default: 16px) */
  height?: number;
  /** Additional CSS classes */
  className?: string;
}

export function SkeletonText({
  width = '100%',
  height = 16,
  className = '',
}: SkeletonTextProps): React.ReactElement {
  return (
    <ShimmerOverlay
      width={width}
      height={height}
      borderRadius={4}
      className={className}
    />
  );
}

/**
 * SkeletonParagraph - Multiple text lines
 */
export interface SkeletonParagraphProps {
  /** Number of lines (default: 3) */
  lines?: number;
  /** Gap between lines in px (default: 8) */
  gap?: number;
  /** Last line width (default: 60%) */
  lastLineWidth?: string | number;
  /** Additional CSS classes */
  className?: string;
}

export function SkeletonParagraph({
  lines = 3,
  gap = 8,
  lastLineWidth = '60%',
  className = '',
}: SkeletonParagraphProps): React.ReactElement {
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonText
          key={index}
          width={index === lines - 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  );
}

/**
 * SkeletonAvatar - Circular avatar skeleton
 */
export interface SkeletonAvatarProps {
  /** Size in px (default: 40) */
  size?: number;
  /** Additional CSS classes */
  className?: string;
}

export function SkeletonAvatar({
  size = 40,
  className = '',
}: SkeletonAvatarProps): React.ReactElement {
  return (
    <ShimmerOverlay
      width={size}
      height={size}
      borderRadius="50%"
      className={className}
    />
  );
}

/**
 * SkeletonButton - Button skeleton
 */
export interface SkeletonButtonProps {
  /** Width (default: 100px) */
  width?: string | number;
  /** Height (default: 36px) */
  height?: number;
  /** Additional CSS classes */
  className?: string;
}

export function SkeletonButton({
  width = 100,
  height = 36,
  className = '',
}: SkeletonButtonProps): React.ReactElement {
  return (
    <ShimmerOverlay
      width={width}
      height={height}
      borderRadius={6}
      className={className}
    />
  );
}

/**
 * SkeletonCard - Card skeleton with header and content
 */
export interface SkeletonCardProps {
  /** Show avatar (default: true) */
  showAvatar?: boolean;
  /** Number of content lines (default: 3) */
  contentLines?: number;
  /** Additional CSS classes */
  className?: string;
}

export function SkeletonCard({
  showAvatar = true,
  contentLines = 3,
  className = '',
}: SkeletonCardProps): React.ReactElement {
  return (
    <div
      className={`p-4 rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur-xl ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        {showAvatar && <SkeletonAvatar size={40} />}
        <div className="flex-1 space-y-2">
          <SkeletonText width="60%" height={14} />
          <SkeletonText width="40%" height={12} />
        </div>
      </div>

      {/* Content */}
      <SkeletonParagraph lines={contentLines} gap={8} />
    </div>
  );
}

/**
 * SkeletonTable - Table skeleton
 */
export interface SkeletonTableProps {
  /** Number of rows (default: 5) */
  rows?: number;
  /** Number of columns (default: 4) */
  columns?: number;
  /** Row height (default: 48) */
  rowHeight?: number;
  /** Additional CSS classes */
  className?: string;
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  rowHeight = 48,
  className = '',
}: SkeletonTableProps): React.ReactElement {
  return (
    <div className={className}>
      {/* Header */}
      <div
        className="flex gap-4 pb-3 border-b border-slate-800 mb-2"
        style={{ height: 32 }}
      >
        {Array.from({ length: columns }).map((_, index) => (
          <SkeletonText
            key={`header-${index}`}
            width={index === 0 ? '30%' : '20%'}
            height={12}
          />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className="flex items-center gap-4 border-b border-slate-800/50"
          style={{ height: rowHeight }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <SkeletonText
              key={`cell-${rowIndex}-${colIndex}`}
              width={colIndex === 0 ? '30%' : '20%'}
              height={14}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default ShimmerOverlay;
