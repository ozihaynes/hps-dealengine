"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Icon } from "./ui";
import { Icons } from "../lib/ui-v2-constants";
import { usePathname } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { getOrganization, OrgError } from "@/lib/orgSettings";

/**
 * Top application header:
 * - Left: organization logo (if set) or default brand logo
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

  // Organization logo state
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState(true);
  // P1-002 FIX: Track logo load errors for fallback
  const [logoError, setLogoError] = useState(false);

  // Load organization logo on mount
  useEffect(() => {
    let isMounted = true;

    async function loadOrgLogo() {
      try {
        const supabase = getSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (isMounted) setLogoLoading(false);
          return;
        }

        // Get user's first org membership
        const { data: membership } = await supabase
          .from("memberships")
          .select("org_id")
          .eq("user_id", user.id)
          .limit(1)
          .single();

        if (!membership?.org_id) {
          if (isMounted) setLogoLoading(false);
          return;
        }

        // Fetch organization details
        const orgResponse = await getOrganization(membership.org_id);
        if (isMounted) {
          setOrgLogoUrl(orgResponse.organization.logo_url || null);
          setLogoError(false); // Reset error when URL changes
          setLogoLoading(false);
        }
      } catch (err) {
        // Silently fail - just show default logo
        if (err instanceof OrgError) {
          console.debug("[AppTopNav] Could not load org logo:", err.message);
        }
        if (isMounted) {
          setLogoLoading(false);
        }
      }
    }

    loadOrgLogo();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="flex w-full items-center justify-between gap-4 text-[color:var(--text-primary)]">
      {/* Brand logo - show org logo if available, otherwise default */}
      <div className="flex items-center">
        {logoLoading ? (
          <div className="h-[3.25rem] w-[200px] animate-pulse bg-white/5 rounded" />
        ) : orgLogoUrl && !logoError ? (
          /* eslint-disable-next-line @next/next/no-img-element -- org logo from storage */
          <img
            src={orgLogoUrl}
            alt="Organization logo"
            className="h-[3.25rem] w-auto max-w-[300px] object-contain"
            onError={() => setLogoError(true)}
          />
        ) : (
          <Image
            src="/Picsart_25-12-19_19-44-12-204.png"
            alt="HPS DealEngine logo"
            width={3464}
            height={667}
            className="h-[3.25rem] w-auto"
            priority
          />
        )}
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
      </div>
    </div>
  );
}
