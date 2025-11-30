"use client";

import Link from "next/link";
import React from "react";
import { Icon } from "./ui";
import { Icons } from "../../../.tmp/ui-v2/constants";

/**
 * Top application header:
 * - Left: Haynes / DealEngineT brand lockup
 * - Right: sandbox + settings entrypoints + "Analyze with AI" CTA
 *
 * Still dispatches the global "hps:analyze-now" CustomEvent so
 * existing listeners keep working.
 */
export default function AppTopNav() {
  const onAnalyze = () => {
    window.dispatchEvent(new CustomEvent("hps:analyze-now"));
  };

  return (
    <div className="flex w-full items-center justify-between gap-4">
      {/* Brand lockup */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5">
          <Icon d={Icons.calculator} size={22} className="text-accent-blue" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[11px] uppercase tracking-[0.22em] text-text-secondary">
            Haynes Property Solutions
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-text-primary">
              DealEngine<span className="align-super text-[10px]">TM</span>
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
              v1
            </span>
          </div>
        </div>
      </div>

      {/* Right-side controls */}
      <div className="flex items-center gap-3">
        {/* Icon cluster */}
        <div className="hidden sm:flex items-center gap-2 text-text-secondary/80">
          <Link
            href="/sandbox"
            className="group relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-surface-elevated/40 hover:bg-surface-elevated/80"
            aria-label="Business Logic Sandbox"
          >
            <Icon d={Icons.sliders} size={22} />
            <span className="sr-only">Business Logic Sandbox</span>
            <span className="pointer-events-none absolute -bottom-9 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-[11px] text-white shadow-lg group-hover:block">
              Business Logic Sandbox
            </span>
          </Link>
          <Link
            href="/settings/user"
            className="group relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-surface-elevated/40 hover:bg-surface-elevated/80"
            aria-label="User & Team Settings"
          >
            <Icon d={Icons.user} size={22} />
            <span className="sr-only">User/Team Settings</span>
            <span className="pointer-events-none absolute -bottom-9 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-[11px] text-white shadow-lg group-hover:block">
              User/Team Settings
            </span>
          </Link>
        </div>

        {/* Analyze CTA */}
        <button
          type="button"
          onClick={onAnalyze}
          className="inline-flex items-center gap-2 rounded-lg border border-accent-blue/70 bg-accent-blue/15 px-4 py-2 text-xs font-semibold text-accent-blue shadow-sm hover:bg-accent-blue/25"
          aria-label="Analyze with AI"
        >
          <Icon d={Icons.playbook} size={16} />
          Analyze with AI
        </button>
      </div>
    </div>
  );
}
