import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
  useParams: () => ({ id: "test-deal-id" }),
}));

// Mock the deal session context
vi.mock("@/lib/dealSessionContext", () => ({
  useDealSession: () => ({
    dbDeal: null,
    lastAnalyzeResult: null,
    lastRunId: null,
    isHydratingActiveDeal: false,
  }),
}));

// Import components after mocks
import { FieldVerdictHero } from "@/components/field/FieldVerdictHero";
import { FieldPriceGeometry } from "@/components/field/FieldPriceGeometry";
import { FieldRiskSummary } from "@/components/field/FieldRiskSummary";
import { FieldNetClearance } from "@/components/field/FieldNetClearance";
import { FieldModeSkeleton } from "@/components/field/FieldModeSkeleton";
import type { FieldModePriceGeometry, FieldModeGate, FieldModeExit } from "@/lib/hooks/useFieldModeData";

// ---------------------------------------------------------------------------
// FieldVerdictHero Tests
// ---------------------------------------------------------------------------

describe("FieldVerdictHero", () => {
  it("renders PURSUE verdict with emerald theme", () => {
    const html = renderToStaticMarkup(
      <FieldVerdictHero
        verdict="PURSUE"
        verdictReason="ZOPA exists, gates pass"
        netClearance={18500}
        bestExit="double_close"
      />
    );

    expect(html).toContain("PURSUE");
    expect(html).toContain("ZOPA exists, gates pass");
    expect(html).toContain("$18.5K");
    expect(html).toContain("Double Close");
    expect(html).toContain("emerald");
  });

  it("renders NEEDS_EVIDENCE verdict with amber theme", () => {
    const html = renderToStaticMarkup(
      <FieldVerdictHero
        verdict="NEEDS_EVIDENCE"
        verdictReason="Missing 2 evidence items"
        netClearance={null}
        bestExit={null}
      />
    );

    expect(html).toContain("NEEDS EVIDENCE");
    expect(html).toContain("Missing 2 evidence items");
    expect(html).toContain("amber");
  });

  it("renders PASS verdict with muted theme", () => {
    const html = renderToStaticMarkup(
      <FieldVerdictHero
        verdict="PASS"
        verdictReason="No ZOPA detected"
        netClearance={-5000}
        bestExit="double_close"
      />
    );

    expect(html).toContain("PASS");
    expect(html).toContain("No ZOPA detected");
    expect(html).toContain("-$5.0K");
    expect(html).toContain("zinc"); // muted theme uses zinc classes
  });

  it("has proper ARIA attributes for accessibility", () => {
    const html = renderToStaticMarkup(
      <FieldVerdictHero
        verdict="PURSUE"
        verdictReason="Ready"
        netClearance={10000}
        bestExit="assignment"
      />
    );

    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-label="Verdict: PURSUE"');
  });

  it("handles null net clearance gracefully", () => {
    const html = renderToStaticMarkup(
      <FieldVerdictHero
        verdict="NEEDS_EVIDENCE"
        verdictReason="Missing data"
        netClearance={null}
        bestExit={null}
      />
    );

    expect(html).not.toContain("net via");
    expect(html).toContain("NEEDS EVIDENCE");
  });
});

// ---------------------------------------------------------------------------
// FieldPriceGeometry Tests
// ---------------------------------------------------------------------------

describe("FieldPriceGeometry", () => {
  const fullGeometry: FieldModePriceGeometry = {
    zopa: 42000,
    zopaPercent: 14.8,
    mao: 185000,
    floor: 178000,
    ceiling: 220000,
    hasZopa: true,
  };

  it("renders all four metrics in 2x2 grid", () => {
    const html = renderToStaticMarkup(<FieldPriceGeometry geometry={fullGeometry} />);

    expect(html).toContain("ZOPA");
    expect(html).toContain("$42K");
    expect(html).toContain("Spread");
    expect(html).toContain("14.8%");
    expect(html).toContain("MAO");
    expect(html).toContain("$185K");
    expect(html).toContain("Floor");
    expect(html).toContain("$178K");
  });

  it("shows 'No ZOPA' when hasZopa is false", () => {
    const noZopaGeometry: FieldModePriceGeometry = {
      zopa: null,
      zopaPercent: null,
      mao: 150000,
      floor: 145000,
      ceiling: 180000,
      hasZopa: false,
    };

    const html = renderToStaticMarkup(<FieldPriceGeometry geometry={noZopaGeometry} />);

    expect(html).toContain("No ZOPA");
  });

  it("handles all null values gracefully", () => {
    const emptyGeometry: FieldModePriceGeometry = {
      zopa: null,
      zopaPercent: null,
      mao: null,
      floor: null,
      ceiling: null,
      hasZopa: false,
    };

    const html = renderToStaticMarkup(<FieldPriceGeometry geometry={emptyGeometry} />);

    // Should show em-dashes for null values
    expect(html).toContain("—");
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("undefined");
  });

  it("has proper ARIA region for accessibility", () => {
    const html = renderToStaticMarkup(<FieldPriceGeometry geometry={fullGeometry} />);

    expect(html).toContain('aria-label="Price Geometry"');
  });
});

// ---------------------------------------------------------------------------
// FieldRiskSummary Tests
// ---------------------------------------------------------------------------

describe("FieldRiskSummary", () => {
  const mockRisks: FieldModeGate[] = [
    { id: "open_permit", label: "Open Permit", status: "blocking", reason: "Active permit on file" },
    { id: "title_commitment", label: "No Title Commitment", status: "fail" },
    { id: "evidence_stale", label: "Evidence Stale", status: "warning", reason: "Data >90 days old" },
  ];

  const mockSummary = { passed: 5, total: 8, blocking: 1 };

  it("renders top 3 risks with correct status styling", () => {
    const html = renderToStaticMarkup(<FieldRiskSummary risks={mockRisks} gatesSummary={mockSummary} />);

    expect(html).toContain("Open Permit");
    expect(html).toContain("BLOCKING");
    expect(html).toContain("No Title Commitment");
    expect(html).toContain("Evidence Stale");
  });

  it("shows gates summary in header", () => {
    const html = renderToStaticMarkup(<FieldRiskSummary risks={mockRisks} gatesSummary={mockSummary} />);

    expect(html).toContain("5/8 pass");
    expect(html).toContain("1 blocking");
  });

  it("shows 'All gates pass' when no risks", () => {
    const html = renderToStaticMarkup(
      <FieldRiskSummary
        risks={[]}
        gatesSummary={{ passed: 8, total: 8, blocking: 0 }}
      />
    );

    expect(html).toContain("All gates pass");
  });

  it("shows empty state when no data", () => {
    const html = renderToStaticMarkup(
      <FieldRiskSummary
        risks={[]}
        gatesSummary={{ passed: 0, total: 0, blocking: 0 }}
      />
    );

    expect(html).toContain("No risk data available");
  });

  it("has proper ARIA list structure", () => {
    const html = renderToStaticMarkup(<FieldRiskSummary risks={mockRisks} gatesSummary={mockSummary} />);

    expect(html).toContain('aria-label="Top risks"');
  });
});

// ---------------------------------------------------------------------------
// FieldNetClearance Tests
// ---------------------------------------------------------------------------

describe("FieldNetClearance", () => {
  const mockExits: FieldModeExit[] = [
    { strategy: "double_close", label: "Double Close", netClearance: 18500, isRecommended: true },
    { strategy: "assignment", label: "Assignment", netClearance: 12200, isRecommended: false },
    { strategy: "flip", label: "Flip", netClearance: 32000, isRecommended: false },
  ];

  it("renders all exit strategies with net clearance", () => {
    const html = renderToStaticMarkup(<FieldNetClearance exits={mockExits} />);

    expect(html).toContain("Double Close");
    expect(html).toContain("$18.5K");
    expect(html).toContain("Assignment");
    expect(html).toContain("$12.2K");
    expect(html).toContain("Flip");
    expect(html).toContain("$32.0K");
  });

  it("highlights recommended exit with star icon", () => {
    const html = renderToStaticMarkup(<FieldNetClearance exits={mockExits} />);

    // The recommended exit should have a star indicator
    expect(html).toContain('aria-label="Recommended"');
  });

  it("shows empty state when no exits", () => {
    const html = renderToStaticMarkup(<FieldNetClearance exits={[]} />);

    expect(html).toContain("No exit strategies calculated");
  });

  it("handles negative net clearance with red styling", () => {
    const negativeExits: FieldModeExit[] = [
      { strategy: "flip", label: "Flip", netClearance: -5000, isRecommended: false },
    ];

    const html = renderToStaticMarkup(<FieldNetClearance exits={negativeExits} />);

    expect(html).toContain("-$5.0K");
    expect(html).toContain("red");
  });

  it("has proper ARIA list structure", () => {
    const html = renderToStaticMarkup(<FieldNetClearance exits={mockExits} />);

    expect(html).toContain('aria-label="Exit strategies"');
  });
});

// ---------------------------------------------------------------------------
// FieldModeSkeleton Tests
// ---------------------------------------------------------------------------

describe("FieldModeSkeleton", () => {
  it("renders without crashing", () => {
    const html = renderToStaticMarkup(<FieldModeSkeleton />);

    // Should have skeleton animation class
    expect(html).toContain("animate-pulse");
  });

  it("matches layout structure of real components", () => {
    const html = renderToStaticMarkup(<FieldModeSkeleton />);

    // Should have rounded containers for skeleton zones
    expect(html).toContain("rounded");
  });
});

// ---------------------------------------------------------------------------
// Touch Target Size Tests (48px minimum)
// ---------------------------------------------------------------------------

describe("Touch Target Accessibility", () => {
  it("FieldVerdictHero has adequate touch area", () => {
    const html = renderToStaticMarkup(
      <FieldVerdictHero
        verdict="PURSUE"
        verdictReason="Ready"
        netClearance={10000}
        bestExit="double_close"
      />
    );

    // The whole card should have padding for touch targets
    expect(html).toContain("p-6");
  });

  it("FieldRiskSummary rows meet 48px height", () => {
    const risks: FieldModeGate[] = [
      { id: "test", label: "Test Risk", status: "warning" },
    ];

    const html = renderToStaticMarkup(
      <FieldRiskSummary
        risks={risks}
        gatesSummary={{ passed: 7, total: 8, blocking: 0 }}
      />
    );

    expect(html).toContain("min-h-[48px]");
  });

  it("FieldNetClearance cards meet 48px height", () => {
    const exits: FieldModeExit[] = [
      { strategy: "test", label: "Test", netClearance: 1000, isRecommended: false },
    ];

    const html = renderToStaticMarkup(<FieldNetClearance exits={exits} />);

    expect(html).toContain("min-h-[72px]");
  });
});

// ---------------------------------------------------------------------------
// Edge Case Tests
// ---------------------------------------------------------------------------

describe("Edge Cases", () => {
  it("handles NaN in currency formatting", () => {
    const html = renderToStaticMarkup(
      <FieldVerdictHero
        verdict="PURSUE"
        verdictReason="Test"
        netClearance={NaN}
        bestExit="test"
      />
    );

    // Should show em-dash for NaN
    expect(html).not.toContain("NaN");
  });

  it("handles Infinity in currency formatting", () => {
    const html = renderToStaticMarkup(
      <FieldVerdictHero
        verdict="PURSUE"
        verdictReason="Test"
        netClearance={Infinity}
        bestExit="test"
      />
    );

    // Should show em-dash for Infinity
    expect(html).not.toContain("Infinity");
  });

  it("handles empty strings gracefully", () => {
    const html = renderToStaticMarkup(
      <FieldVerdictHero
        verdict="PASS"
        verdictReason=""
        netClearance={null}
        bestExit=""
      />
    );

    // Should still render without crashing
    expect(html).toContain("PASS");
  });

  it("handles very large numbers in currency", () => {
    const html = renderToStaticMarkup(
      <FieldVerdictHero
        verdict="PURSUE"
        verdictReason="Big deal"
        netClearance={2500000}
        bestExit="flip"
      />
    );

    // Component formats large numbers as K, not M
    expect(html).toContain("$2500.0K");
  });
});
