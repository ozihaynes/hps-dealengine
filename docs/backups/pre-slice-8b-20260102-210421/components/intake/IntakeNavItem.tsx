"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui";
import { Icons } from "@/lib/ui-v2-constants";
import { fetchPendingReviewCount } from "@/lib/intakeStaff";
import { getSupabaseClient } from "@/lib/supabaseClient";
import {
  getActiveOrgMembershipRole,
  isBossRole,
  type OrgMembershipRole,
} from "@/lib/orgMembership";

const POLL_INTERVAL_MS = 60000; // Poll every 60 seconds

type IntakeNavItemProps = {
  className?: string;
};

export function IntakeNavItem({ className = "" }: IntakeNavItemProps) {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [role, setRole] = useState<OrgMembershipRole | null>(null);
  const [roleLoaded, setRoleLoaded] = useState(false);

  const isActive =
    pathname === "/intake-inbox" || pathname?.startsWith("/intake-inbox/");

  // Check user's role on mount
  useEffect(() => {
    let mounted = true;

    const loadRole = async () => {
      try {
        const supabase = getSupabaseClient();
        const userRole = await getActiveOrgMembershipRole(supabase);
        if (mounted) {
          setRole(userRole);
          setRoleLoaded(true);
        }
      } catch (err) {
        console.error("Failed to fetch role:", err);
        if (mounted) {
          setRoleLoaded(true);
        }
      }
    };

    loadRole();

    return () => {
      mounted = false;
    };
  }, []);

  // Only fetch pending count if user has boss role
  useEffect(() => {
    if (!roleLoaded || !isBossRole(role)) return;

    let mounted = true;

    const loadCount = async () => {
      try {
        const count = await fetchPendingReviewCount();
        if (mounted) {
          setPendingCount(count);
        }
      } catch (err) {
        console.error("Failed to fetch pending count:", err);
      }
    };

    // Initial load
    loadCount();

    // Poll for updates
    const interval = setInterval(loadCount, POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [roleLoaded, role]);

  // Don't render until role is loaded, and only render for boss roles
  if (!roleLoaded) return null;
  if (!isBossRole(role)) return null;

  return (
    <Link
      href="/intake-inbox"
      className={`tab-trigger relative ${isActive ? "active" : ""} ${className}`}
    >
      <Icon d={Icons.inbox} size={16} className="text-accent-blue" />
      <span>Intake</span>
      {pendingCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-black">
          {pendingCount > 99 ? "99+" : pendingCount}
        </span>
      )}
    </Link>
  );
}

export default IntakeNavItem;
