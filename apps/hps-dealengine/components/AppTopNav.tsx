"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import { Icon } from "./ui";
import { Icons } from "../lib/ui-v2-constants";
import { usePathname } from "next/navigation";

/**
 * Top application header:
 * - Left: Haynes / DealEngineT brand lockup
 * - Right: sandbox + settings entrypoints + "Analyze with AI" CTA
 *
 * Still dispatches the global "hps:analyze-now" CustomEvent so
 * existing listeners keep working.
 */
export default function AppTopNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href ||
    (pathname?.startsWith(href + "/") ?? false) ||
    (pathname?.startsWith(href + "?") ?? false);

  return (
    <div className="flex w-full items-center justify-between gap-4 text-[color:var(--text-primary)]">
      {/* Brand lockup */}
      <div className="flex items-center gap-3">
        <Image
          src="/hps_flat_logo.png"
          alt="HPS DealEngine logo"
          width={1024}
          height={364}
          className="h-[3.25rem] w-auto"
          priority
        />
        <div className="flex flex-col leading-tight">
          <span className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--text-secondary)]">
            Haynes Property Solutions
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-[color:var(--text-primary)]">
              DealEngine<span className="align-super text-[10px]">TM</span>
            </span>
            <span className="rounded-full border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--text-secondary)]">
              v1
            </span>
          </div>
        </div>
      </div>

      {/* Right-side controls */}
      <div className="flex items-center gap-3">
        {/* Icon cluster */}
        <div className="hidden sm:flex items-center gap-2 text-[color:var(--text-secondary)]">
          <Link
            href="/sandbox"
            className={`group relative flex h-12 w-12 items-center justify-center tab-trigger ${isActive("/sandbox") ? "active" : ""}`}
            aria-label="Business Logic Sandbox"
          >
            <Icon d={Icons.sliders} size={42} className="stroke-[2.5]" />
            <span className="sr-only">Business Logic Sandbox</span>
            <span className="pointer-events-none absolute -bottom-9 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-[11px] text-white shadow-lg group-hover:block">
              Business Logic Sandbox
            </span>
          </Link>
          <Link
            href="/settings/user"
            className={`group relative flex h-12 w-12 items-center justify-center tab-trigger ${isActive("/settings") ? "active" : ""}`}
            aria-label="User & Team Settings"
          >
            <Icon d={Icons.user} size={42} className="stroke-[2.5]" />
            <span className="sr-only">User/Team Settings</span>
            <span className="pointer-events-none absolute -bottom-9 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-[11px] text-white shadow-lg group-hover:block">
              User/Team Settings
            </span>
          </Link>
        </div>
        {/* Logout button */}
        <Link
          href="/logout"
          className="rounded-lg border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] px-3 py-2 text-sm font-semibold text-[color:var(--text-primary)] shadow-sm transition hover:border-accent-blue hover:text-accent-blue"
          aria-label="Log out"
        >
          Log out
        </Link>
      </div>
    </div>
  );
}
