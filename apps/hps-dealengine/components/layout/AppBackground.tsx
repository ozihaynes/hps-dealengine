'use client';

import React from 'react';

interface AppBackgroundProps {
  children: React.ReactNode;
  /** Show decorative gradient shapes - default true */
  showShapes?: boolean;
  /** Show subtle grid overlay - default true */
  showGrid?: boolean;
  /** Additional classes for the container */
  className?: string;
}

/**
 * Shared app background with gradient and decorative shapes.
 * Matches the login page design for visual consistency across all pages.
 *
 * Features:
 * - Multi-layer gradient base using theme variables
 * - Organic floating gradient shapes (top-right, bottom-left, center-left)
 * - Subtle grid overlay for depth
 * - Reduced motion support
 * - Theme-aware (uses CSS variables)
 */
export function AppBackground({
  children,
  showShapes = true,
  showGrid = true,
  className = ''
}: AppBackgroundProps): React.ReactElement {
  return (
    <div className={`app-bg-container ${className}`}>
      {/* Decorative gradient shapes */}
      {showShapes && (
        <div className="app-bg-shapes" aria-hidden="true">
          <div className="app-bg-shape app-bg-shape-1" />
          <div className="app-bg-shape app-bg-shape-2" />
          <div className="app-bg-shape app-bg-shape-3" />
        </div>
      )}

      {/* Subtle grid overlay */}
      {showGrid && (
        <div className="app-bg-grid" aria-hidden="true" />
      )}

      {/* Page content */}
      <div className="app-bg-content">
        {children}
      </div>
    </div>
  );
}

export default AppBackground;
