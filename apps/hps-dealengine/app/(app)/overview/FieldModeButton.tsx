/**
 * FieldModeButton Component
 *
 * Mobile-only button that links to the Field Mode view for the current deal.
 * Only visible when a deal is selected and on mobile viewports.
 *
 * @module app/overview/FieldModeButton
 * @version 1.0.0
 */

"use client";

import React from "react";
import Link from "next/link";
import { Smartphone } from "lucide-react";
import { useDealSession } from "@/lib/dealSessionContext";

export function FieldModeButton(): React.ReactElement | null {
  const { dbDeal } = useDealSession();

  // Don't render if no deal is selected
  if (!dbDeal?.id) {
    return null;
  }

  return (
    <Link
      href={`/deals/${dbDeal.id}/field`}
      className="
        sm:hidden
        inline-flex items-center gap-2
        px-4 py-2.5
        bg-emerald-600 hover:bg-emerald-500
        text-white font-medium text-sm
        rounded-lg
        transition-colors duration-200
        touch-manipulation
        min-h-[44px]
        shadow-lg shadow-emerald-900/20
      "
      aria-label="Open Field Mode for mobile view"
    >
      <Smartphone className="w-4 h-4" aria-hidden="true" />
      <span>Field Mode</span>
    </Link>
  );
}

export default FieldModeButton;
