"use client";

import React, { Suspense, useEffect } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

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
import DualAgentLauncher from "@/components/ai/DualAgentLauncher";
import { AiWindowsProvider } from "@/lib/ai/aiWindowsContext";
import OfferChecklistPanel from "@/components/offerChecklist/OfferChecklistPanel";

const NAV_ITEMS = [
  { href: "/overview", label: "Dashboard", icon: Icons.barChart, requireDeal: true, cluster: "left" as const },
  { href: "/repairs", label: "Repairs", icon: Icons.wrench, requireDeal: true, cluster: "right" as const },
  { href: "/underwrite", label: "Underwrite", icon: Icons.calculator, requireDeal: true, cluster: "right" as const },
  { href: "/deals", label: "Deals", icon: Icons.briefcase, requireDeal: false, cluster: "right" as const },
];

const MOBILE_NAV_ITEMS = NAV_ITEMS;

const DEAL_REQUIRED_PREFIXES = [
  "/overview",
  "/underwrite",
  "/repairs",
  "/trace",
  "/runs",
  "/sources",
];

const isDealRequiredPath = (pathname?: string | null) =>
  !!pathname &&
  DEAL_REQUIRED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );

/**
 * If a protected route is visited without an active deal selection,
 * bounce the user to `/deals` to pick/create one before continuing.
 */
function DealGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dealIdFromUrl = searchParams?.get("dealId");
  const { dbDeal, isHydratingActiveDeal } = useDealSession();

  useEffect(() => {
    const needsDeal = isDealRequiredPath(pathname);

    if (!needsDeal) return;

    if (dbDeal) return;

    // If a deep-link dealId is present and hydration is in flight, delay redirect
    if (dealIdFromUrl && isHydratingActiveDeal) return;

    // No active deal; bounce to /startup hub
    if (!dbDeal) {
      router.replace("/startup");
    }
  }, [dbDeal, pathname, router, dealIdFromUrl, isHydratingActiveDeal]);

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

function AppTabNav({ onOpenOffer }: { onOpenOffer?: () => void }) {
  const pathname = usePathname();
  const { dbDeal } = useDealSession();

  const buildHref = (item: (typeof NAV_ITEMS)[number]) => {
    if (item.requireDeal) {
      if (dbDeal?.id) return `${item.href}?dealId=${dbDeal.id}`;
      return "/startup";
    }
    return item.href;
  };

  const isActive = (href: string) =>
    pathname === href || (pathname?.startsWith(href + "/") ?? false);

  const left = NAV_ITEMS.filter((i) => i.cluster === "left");
  const right = NAV_ITEMS.filter((i) => i.cluster === "right");

  return (
    <nav className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] px-2 py-1 text-sm text-[color:var(--text-primary)] backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        {left.map((item) => (
          <Link
            key={item.href}
            href={buildHref(item)}
            className={`tab-trigger ${isActive(item.href) ? "active" : ""}`}
          >
            <Icon d={item.icon} size={16} className="text-accent-blue" />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
        <div className="flex flex-wrap items-center gap-2">
          {right.map((item) => (
            <Link
              key={item.href}
              href={buildHref(item)}
              className={`tab-trigger ${isActive(item.href) ? "active" : ""}`}
            >
              <Icon d={item.icon} size={16} className="text-accent-blue" />
              <span>{item.label}</span>
            </Link>
          ))}
        {dbDeal?.id ? (
          <button
            type="button"
            onClick={onOpenOffer}
            className="tab-trigger"
          >
            <Icon d={Icons.check} size={16} className="text-[color:var(--accent-contrast)]" />
            <span>Offer</span>
          </button>
        ) : (
          <Link
            href="/startup"
            className="tab-trigger"
          >
            <Icon d={Icons.check} size={16} className="text-[color:var(--text-secondary)]" />
            <span>Offer</span>
          </Link>
        )}
      </div>
    </nav>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { dbDeal } = useDealSession();
  const pathname = usePathname();
  const [showOffer, setShowOffer] = React.useState(false);
  const mobileItems = React.useMemo(
    () =>
      MOBILE_NAV_ITEMS.map((item) => {
        if (item.requireDeal) {
          if (dbDeal?.id) return { ...item, href: `${item.href}?dealId=${dbDeal.id}` };
          return { ...item, href: "/startup" };
        }
        return item;
      }),
    [dbDeal],
  );

  return (
    <AuthGate>
      <DealGuard>
        <AiWindowsProvider>
          <div className="flex min-h-screen flex-col">
            <header className="border-b border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] backdrop-blur">
              <div className="mx-auto flex max-w-6xl lg:max-w-[96rem] xl:max-w-[104rem] 2xl:max-w-[112rem] items-center justify-between px-6 lg:px-8 xl:px-10 py-4">
                <AppTopNav />
              </div>
            </header>

            <main className="flex-1 bg-[color:var(--bg-primary)]">
              <div className="mx-auto flex max-w-6xl lg:max-w-[96rem] xl:max-w-[104rem] 2xl:max-w-[112rem] flex-col gap-4 px-6 lg:px-8 xl:px-10 py-6">
                {/* Desktop-only route tabs */}
                <div className="hidden md:flex items-center justify-between gap-4">
                  <AppTabNav onOpenOffer={() => setShowOffer(true)} />
                </div>

                {/* Wrap route children in Suspense so any useSearchParams usage is safe for prerender */}
                <Suspense
                  key={pathname ?? "app-shell"}
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
            <MobileBottomNav items={mobileItems} />
            <DualAgentLauncher />
            {showOffer && dbDeal?.id ? (
              <OfferChecklistPanel dealId={dbDeal.id} onClose={() => setShowOffer(false)} />
            ) : null}
          </div>
        </AiWindowsProvider>
      </DealGuard>
    </AuthGate>
  );
}
