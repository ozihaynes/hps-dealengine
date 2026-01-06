import React from "react";
import { FieldModeSkeleton } from "@/components/field";

/**
 * Field Mode Loading State
 * 
 * Suspense fallback for the field mode route.
 * Uses the skeleton component to match the final layout structure.
 */
export default function FieldModeLoading() {
  return (
    <div className="min-h-screen bg-surface-primary">
      {/* Simplified header skeleton */}
      <header
        className={`
          sticky top-0 z-10
          bg-surface-primary/80
          backdrop-blur-md
          border-b border-white/5
          px-4 py-3
          flex items-center gap-3
        `}
      >
        <div className="w-12 h-12 rounded-lg bg-surface-secondary/50 animate-pulse" />
        <div className="flex-1">
          <div className="h-4 w-24 rounded bg-surface-secondary/50 animate-pulse mb-1" />
          <div className="h-3 w-40 rounded bg-surface-secondary/30 animate-pulse" />
        </div>
        <div className="w-12 h-12 rounded-lg bg-surface-secondary/30 animate-pulse" />
      </header>

      <FieldModeSkeleton />
    </div>
  );
}
