"use client";

import { useEffect, useState, useRef } from "react";

interface SkeletonProps {
  className?: string;
  /** Whether the skeleton is still loading (controls visibility) */
  isLoading?: boolean;
  /** Minimum display time in ms to prevent flicker (EC-4.7) */
  minDisplayTime?: number;
  /** Whether to animate the pulse */
  animate?: boolean;
}

/**
 * Skeleton loading placeholder with anti-flicker protection
 *
 * EC-4.7: Minimum 200ms display to prevent jarring flicker on fast loads
 */
export function Skeleton({
  className = "",
  isLoading = true,
  minDisplayTime = 200,
  animate = true,
}: SkeletonProps) {
  const [canHide, setCanHide] = useState(false);
  const mountTimeRef = useRef(Date.now());

  // EC-4.7: Track minimum display time
  useEffect(() => {
    if (!isLoading) {
      const elapsed = Date.now() - mountTimeRef.current;
      const remaining = Math.max(0, minDisplayTime - elapsed);

      if (remaining > 0) {
        const timer = setTimeout(() => setCanHide(true), remaining);
        return () => clearTimeout(timer);
      } else {
        setCanHide(true);
      }
    } else {
      // Reset when loading starts again
      setCanHide(false);
      mountTimeRef.current = Date.now();
    }
  }, [isLoading, minDisplayTime]);

  // Hide only when loading is done AND minimum time has passed
  if (!isLoading && canHide) return null;

  return (
    <div
      className={`bg-white/5 rounded ${animate ? "animate-pulse" : ""} ${className}`}
      aria-hidden="true"
      role="presentation"
    />
  );
}

/**
 * Pre-built skeleton variants for common UI patterns
 */
export function SkeletonText({
  lines = 1,
  className = "",
  isLoading = true,
}: {
  lines?: number;
  className?: string;
  isLoading?: boolean;
}) {
  if (!isLoading) return null;
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"}`}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
}

export function SkeletonInput({
  className = "",
  isLoading = true,
}: {
  className?: string;
  isLoading?: boolean;
}) {
  if (!isLoading) return null;
  return <Skeleton className={`h-11 w-full ${className}`} isLoading={isLoading} />;
}

export function SkeletonButton({
  className = "",
  isLoading = true,
}: {
  className?: string;
  isLoading?: boolean;
}) {
  if (!isLoading) return null;
  return <Skeleton className={`h-11 w-32 ${className}`} isLoading={isLoading} />;
}

export function SkeletonAvatar({
  size = "md",
  isLoading = true,
}: {
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}) {
  if (!isLoading) return null;
  const sizes = { sm: "w-8 h-8", md: "w-12 h-12", lg: "w-16 h-16" };
  return <Skeleton className={`${sizes[size]} rounded-full`} isLoading={isLoading} />;
}

export function SkeletonCard({
  className = "",
  isLoading = true,
}: {
  className?: string;
  isLoading?: boolean;
}) {
  if (!isLoading) return null;
  return (
    <div className={`p-5 space-y-4 ${className}`}>
      <Skeleton className="h-6 w-1/3" isLoading={isLoading} />
      <SkeletonText lines={3} isLoading={isLoading} />
      <div className="flex justify-end">
        <SkeletonButton isLoading={isLoading} />
      </div>
    </div>
  );
}
