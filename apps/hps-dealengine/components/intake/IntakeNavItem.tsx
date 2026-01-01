"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui";
import { Icons } from "@/lib/ui-v2-constants";
import { fetchPendingReviewCount } from "@/lib/intakeStaff";

const POLL_INTERVAL_MS = 60000; // Poll every 60 seconds

type IntakeNavItemProps = {
  className?: string;
};

export function IntakeNavItem({ className = "" }: IntakeNavItemProps) {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState<number>(0);

  const isActive =
    pathname === "/intake-inbox" || pathname?.startsWith("/intake-inbox/");

  useEffect(() => {
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
  }, []);

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
