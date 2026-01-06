"use client";

import React from "react";

/**
 * FieldModeSkeleton
 * 
 * Loading skeleton for Field Mode View.
 * Matches the layout structure so content doesn't jump on load.
 * 
 * Principles Applied:
 * - Gestalt (Closure): Skeleton shapes match final layout
 * - Perceived Performance: Shimmer feels faster than spinner
 */
export function FieldModeSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 animate-pulse">
      {/* Verdict Hero Skeleton */}
      <div className="rounded-xl bg-surface-secondary/50 p-6">
        <div className="flex flex-col items-center gap-3">
          {/* Verdict badge */}
          <div className="h-10 w-32 rounded-lg bg-surface-tertiary/50 shimmer" />
          {/* Net clearance */}
          <div className="h-5 w-48 rounded bg-surface-tertiary/40 shimmer" />
        </div>
      </div>

      {/* Price Geometry Skeleton - 2x2 grid */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-lg bg-surface-secondary/50 p-4 min-h-[60px]"
          >
            <div className="h-3 w-12 rounded bg-surface-tertiary/40 mb-2 shimmer" />
            <div className="h-6 w-20 rounded bg-surface-tertiary/50 shimmer" />
          </div>
        ))}
      </div>

      {/* Risk Summary Skeleton */}
      <div className="rounded-xl bg-surface-secondary/50 p-4">
        <div className="h-4 w-28 rounded bg-surface-tertiary/40 mb-3 shimmer" />
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 rounded-lg bg-surface-tertiary/30 shimmer"
            />
          ))}
        </div>
      </div>

      {/* Net Clearance Skeleton */}
      <div className="rounded-xl bg-surface-secondary/50 p-4">
        <div className="h-4 w-24 rounded bg-surface-tertiary/40 mb-3 shimmer" />
        <div className="flex gap-2 overflow-x-auto">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex-shrink-0 w-28 h-16 rounded-lg bg-surface-tertiary/30 shimmer"
            />
          ))}
        </div>
      </div>

      {/* CTA Skeleton */}
      <div className="h-12 rounded-xl bg-surface-tertiary/30 shimmer" />

      {/* Shimmer animation styles */}
      <style jsx>{`
        .shimmer {
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.05) 50%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }

        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .shimmer {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
