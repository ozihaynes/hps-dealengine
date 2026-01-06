"use client";

import React from "react";
import { cn } from "../ui";

export type AiWindowShellProps = {
  header: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  minBodyHeight?: number;
};

/**
 * Shared chrome for Analyst / Strategist / Negotiator windows.
 *
 * Design goals:
 * - Premium, solid (non-translucent) surface for readability.
 * - Subtle glow / depth that doesn't leak outside rounded corners.
 * - Safe overflow clipping for transcript / code blocks.
 *
 * Note: We intentionally avoid backdrop blur + translucent panels so the window
 * remains readable and calm even when content behind it changes.
 */
export function AiWindowShell({
  header,
  children,
  className,
  bodyClassName,
  minBodyHeight = 220,
}: AiWindowShellProps) {
  return (
    <div className={cn("group relative h-full w-full", className)}>
      {/* Glow behind the window */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 rounded-2xl opacity-80 blur-2xl transition duration-300 group-hover:opacity-100 group-focus-within:opacity-100"
        style={{
          background:
            "radial-gradient(circle_at_20%_10%, rgba(0,150,255,0.22), transparent 55%), radial-gradient(circle_at_80%_30%, rgba(0,255,200,0.12), transparent 50%), radial-gradient(circle_at_30%_90%, rgba(0,127,224,0.10), transparent 55%)",
        }}
      />

      <div
        className={cn(
          "relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-[color:var(--ai-window-bg)] shadow-[0_18px_65px_rgba(0,0,0,0.55)] transition duration-200",
          "border-[color:var(--ai-window-border)] group-hover:border-[color:var(--ai-window-border-strong)] group-focus-within:border-[color:var(--ai-window-border-strong)]",
        )}
      >
        {/* Subtle inner sheen */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-100"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.04), transparent 28%), radial-gradient(circle_at_50%_0%, rgba(255,255,255,0.03), transparent 60%)",
          }}
        />

        <div className="relative z-10">{header}</div>

        <div
          className={cn("relative z-10 flex min-h-0 flex-1 flex-col", bodyClassName)}
          style={{ minHeight: minBodyHeight }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default AiWindowShell;
