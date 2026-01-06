"use client";

import React from "react";
import { useParams } from "next/navigation";
import { FieldModeView } from "@/components/field";

/**
 * Field Mode Page
 * 
 * Route: /deals/[id]/field
 * 
 * Mobile-optimized view showing only critical decision data:
 * - Verdict (PURSUE / NEEDS_EVIDENCE / PASS)
 * - Price Geometry (ZOPA, MAO, Floor)
 * - Top 3 Risks
 * - Net Clearance by Exit Strategy
 * 
 * Design goal: 60-second decision with one thumb.
 */
export default function FieldModePage() {
  const params = useParams();
  const dealId = params?.id as string;

  if (!dealId) {
    return (
      <div className="min-h-screen bg-surface-primary flex items-center justify-center">
        <p className="text-text-secondary">No deal ID provided</p>
      </div>
    );
  }

  return <FieldModeView dealId={dealId} />;
}
