"use client";

import React, { Suspense, useEffect } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import AuthGate from "@/components/AuthGate";
import AppTopNav from "@/components/AppTopNav";
import MobileBottomNav from "@/components/shared/MobileBottomNav";
import { Icon } from "@/components/ui";
import { useDealSession } from "../../lib/dealSessionContext";
import { getSupabaseClient } from "@/lib/supabaseClient";
import {
  clearLastSession,
  loadLastSession,
  saveLastSession,
} from "@/lib/sessionPersistence";
import { Icons } from "../../lib/ui-v2-constants";

const APP_TABS = [
  { href: "/overview", label: "Overview", icon: Icons.barChart },
  { href: "/repairs", label: "Repairs", icon: Icons.wrench },
  { href: "/underwrite", label: "Underwrite", icon: Icons.calculator },
];

const MOBILE_NAV_ITEMS = [
  ...APP_TABS,
  { href: "/settings", label: "Settings", icon: Icons.settings },
];

/**
 * If a protected route is visited without an active deal selection,
 * bounce the user to `/deals` to pick/create one before continuing.
 */
function DealGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { dbDeal } = useDealSession();

  useEffect(() => {
    const requiresDealPrefixes = [
      "/overview",
      "/underwrite",
      "/repairs",
      "/trace",
      "/runs",
      "/sandbox",
      "/sources",
    ];

    const needsDeal =
      pathname &&
      requiresDealPrefixes.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
      );

    if (needsDeal && !dbDeal) {
      router.replace("/deals");
    }
  }, [dbDeal, pathname, router]);

  return <>{children}</>;
}

function SessionPersistenceSync() {
  const { dbDeal } = useDealSession();
  const pathname = usePathname();
  const router = useRouter();
  const supabase = getSupabaseClient();
  const attemptedRef = React.useRef(false);

  // Save last session when deal + route are known
  React.useEffect(() => {
    if (dbDeal?.id && pathname) {
      saveLastSession({ dealId: dbDeal.id, pathname });
      return;
    }
    clearLastSession();
  }, [dbDeal?.id, pathname]);

  // Attempt restore on first mount if authenticated and no active deal
  React.useEffect(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    const restore = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        if (!session) return;
        if (dbDeal?.id) return;

        const last = loadLastSession();
        if (!last?.dealId) return;

        // Seed the existing DealSession bootstrap key
        localStorage.setItem("hps-active-deal-id", last.dealId);

        if (last.pathname && pathname !== last.pathname) {
          router.replace(last.pathname);
        }
      } catch {
        // best-effort; ignore errors
      }
    };

    void restore();
  }, [dbDeal?.id, pathname, router, supabase]);

  return null;
}

function AppTabNav() {
  const pathname = usePathname();

  // Do not show the top tab strip on /settings routes
  if (pathname === "/settings" || pathname?.startsWith("/settings/")) {
    return null;
  }

  return (
    <nav className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-sm">
      {APP_TABS.map((tab) => {
        const isActive =
          pathname === tab.href ||
          (pathname?.startsWith(tab.href + "/") ?? false);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              "tab-trigger rounded-lg px-3 py-2 transition-colors",
              "flex-1 items-center justify-center",
              isActive ? "active" : "",
            ].join(" ")}
          >
            <Icon d={tab.icon} size={16} className="text-accent-blue" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <DealGuard>
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-white/5 bg-gradient-to-r from-[#020617] via-[#020617] to-[#020617]">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <AppTopNav />
            </div>
          </header>

          <main className="flex-1 bg-[#020617]">
            <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6">
              {/* Desktop-only route tabs */}
              <div className="hidden md:flex items-center justify-between gap-4">
                <AppTabNav />
              </div>

              {/* Wrap route children in Suspense so any useSearchParams usage is safe for prerender */}
              <Suspense
                fallback={
                  <div className="py-8 text-sm text-text-secondary">
                    Loading dashboard.
                  </div>
                }
              >
                {children}
              </Suspense>
              <SessionPersistenceSync />
            </div>
          </main>

          {/* Mobile bottom navigation (visible on mobile/tablet only) */}
          <MobileBottomNav items={MOBILE_NAV_ITEMS} />
        </div>
      </DealGuard>
    </AuthGate>
  );
}
