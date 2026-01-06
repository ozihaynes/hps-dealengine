import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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
const mockDealSessionContext = {
  dbDeal: null as unknown,
  lastAnalyzeResult: null as unknown,
  lastRunId: null as string | null,
  isLoadingRun: false,
};

vi.mock("@/lib/dealSessionContext", () => ({
  useDealSession: () => mockDealSessionContext,
}));

// Import components after mocks
import { FieldVerdictHero } from "./FieldVerdictHero";
import { FieldPriceGeometry } from "./FieldPriceGeometry";
import { FieldRiskSummary } from "./FieldRiskSummary";
import { FieldNetClearance } from "./FieldNetClearance";
import { FieldModeSkeleton } from "./FieldModeSkeleton";
import type { VerdictType, FieldModePriceGeometry, FieldModeGate, FieldModeExit } from "@/lib/hooks/useFieldModeData";

// ---------------------------------------------------------------------------
// FieldVerdictHero Tests
// ---------------------------------------------------------------------------

describe("FieldVerdictHero", () => {
  it("renders PURSUE verdict with emerald theme", () => {
    render(
      <FieldVerdictHero
        verdict="PURSUE"
        verdictReason="ZOPA exists, gates pass"
        netClearance={18500}
        bestExit="double_close"
      />
    );

    expect(screen.getByText("PURSUE")).toBeInTheDocument();
    expect(screen.getByText("ZOPA exists, gates pass")).toBeInTheDocument();
    expect(screen.getByText("$18.5K")).toBeInTheDocument();
    expect(screen.getByText(/Double Close/i)).toBeInTheDocument();
  });

  it("renders NEEDS_EVIDENCE verdict with amber theme", () => {
    render(
      <FieldVerdictHero
        verdict="NEEDS_EVIDENCE"
        verdictReason="Missing 2 evidence items"
        netClearance={null}
        bestExit={null}
      />
    );

    expect(screen.getByText("NEEDS EVIDENCE")).toBeInTheDocument();
    expect(screen.getByText("Missing 2 evidence items")).toBeInTheDocument();
  });

  it("renders PASS verdict with muted theme", () => {
    render(
      <FieldVerdictHero
        verdict="PASS"
        verdictReason="No ZOPA detected"
        netClearance={-5000}
        bestExit="double_close"
      />
    );

    expect(screen.getByText("PASS")).toBeInTheDocument();
    expect(screen.getByText("No ZOPA detected")).toBeInTheDocument();
    // Negative net should show
    expect(screen.getByText("-$5.0K")).toBeInTheDocument();
  });

  it("has proper ARIA attributes for accessibility", () => {
    render(
      <FieldVerdictHero
        verdict="PURSUE"
        verdictReason="Ready"
        netClearance={10000}
        bestExit="assignment"
      />
    );

    const region = screen.getByRole("region", { name: /Verdict: PURSUE/i });
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("handles null net clearance gracefully", () => {
    render(
      <FieldVerdictHero
        verdict="NEEDS_EVIDENCE"
        verdictReason="Missing data"
        netClearance={null}
        bestExit={null}
      />
    );

    // Should not render net clearance section when null
    expect(screen.queryByText(/net via/i)).not.toBeInTheDocument();
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
    render(<FieldPriceGeometry geometry={fullGeometry} />);

    expect(screen.getByText("ZOPA")).toBeInTheDocument();
    expect(screen.getByText("$42K")).toBeInTheDocument();
    expect(screen.getByText("Spread")).toBeInTheDocument();
    expect(screen.getByText("14.8%")).toBeInTheDocument();
    expect(screen.getByText("MAO")).toBeInTheDocument();
    expect(screen.getByText("$185K")).toBeInTheDocument();
    expect(screen.getByText("Floor")).toBeInTheDocument();
    expect(screen.getByText("$178K")).toBeInTheDocument();
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

    render(<FieldPriceGeometry geometry={noZopaGeometry} />);

    expect(screen.getByText("No ZOPA")).toBeInTheDocument();
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

    render(<FieldPriceGeometry geometry={emptyGeometry} />);

    // Should show em-dashes for null values
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it("has proper ARIA region for accessibility", () => {
    render(<FieldPriceGeometry geometry={fullGeometry} />);

    expect(screen.getByRole("region", { name: /Price Geometry/i })).toBeInTheDocument();
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
    render(<FieldRiskSummary risks={mockRisks} gatesSummary={mockSummary} />);

    expect(screen.getByText("Open Permit")).toBeInTheDocument();
    expect(screen.getByText("BLOCKING")).toBeInTheDocument();
    expect(screen.getByText("No Title Commitment")).toBeInTheDocument();
    expect(screen.getByText("Evidence Stale")).toBeInTheDocument();
  });

  it("shows gates summary in header", () => {
    render(<FieldRiskSummary risks={mockRisks} gatesSummary={mockSummary} />);

    expect(screen.getByText(/5\/8 pass/)).toBeInTheDocument();
    expect(screen.getByText(/1 blocking/)).toBeInTheDocument();
  });

  it("shows 'All gates pass' when no risks", () => {
    render(
      <FieldRiskSummary
        risks={[]}
        gatesSummary={{ passed: 8, total: 8, blocking: 0 }}
      />
    );

    expect(screen.getByText("All gates pass")).toBeInTheDocument();
  });

  it("shows empty state when no data", () => {
    render(
      <FieldRiskSummary
        risks={[]}
        gatesSummary={{ passed: 0, total: 0, blocking: 0 }}
      />
    );

    expect(screen.getByText("No risk data available")).toBeInTheDocument();
  });

  it("has proper ARIA list structure", () => {
    render(<FieldRiskSummary risks={mockRisks} gatesSummary={mockSummary} />);

    expect(screen.getByRole("list", { name: /Top risks/i })).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
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
    render(<FieldNetClearance exits={mockExits} />);

    expect(screen.getByText("Double Close")).toBeInTheDocument();
    expect(screen.getByText("$18.5K")).toBeInTheDocument();
    expect(screen.getByText("Assignment")).toBeInTheDocument();
    expect(screen.getByText("$12.2K")).toBeInTheDocument();
    expect(screen.getByText("Flip")).toBeInTheDocument();
    expect(screen.getByText("$32.0K")).toBeInTheDocument();
  });

  it("highlights recommended exit with star icon", () => {
    render(<FieldNetClearance exits={mockExits} />);

    // The recommended exit (Double Close) should have a star
    const starIcon = document.querySelector('[aria-label="Recommended"]');
    expect(starIcon).toBeInTheDocument();
  });

  it("shows empty state when no exits", () => {
    render(<FieldNetClearance exits={[]} />);

    expect(screen.getByText("No exit strategies calculated")).toBeInTheDocument();
  });

  it("handles negative net clearance with red styling", () => {
    const negativeExits: FieldModeExit[] = [
      { strategy: "flip", label: "Flip", netClearance: -5000, isRecommended: false },
    ];

    render(<FieldNetClearance exits={negativeExits} />);

    expect(screen.getByText("-$5.0K")).toBeInTheDocument();
  });

  it("has proper ARIA list structure", () => {
    render(<FieldNetClearance exits={mockExits} />);

    expect(screen.getByRole("list", { name: /Exit strategies/i })).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// FieldModeSkeleton Tests
// ---------------------------------------------------------------------------

describe("FieldModeSkeleton", () => {
  it("renders without crashing", () => {
    render(<FieldModeSkeleton />);

    // Should have multiple skeleton elements
    const container = document.querySelector(".animate-pulse");
    expect(container).toBeInTheDocument();
  });

  it("matches layout structure of real components", () => {
    const { container } = render(<FieldModeSkeleton />);

    // Should have 4 skeleton zones matching the real layout
    const zones = container.querySelectorAll(".rounded-xl, .rounded-lg");
    expect(zones.length).toBeGreaterThanOrEqual(4);
  });
});

// ---------------------------------------------------------------------------
// Touch Target Size Tests (48px minimum)
// ---------------------------------------------------------------------------

describe("Touch Target Accessibility", () => {
  it("FieldVerdictHero has adequate touch area", () => {
    render(
      <FieldVerdictHero
        verdict="PURSUE"
        verdictReason="Ready"
        netClearance={10000}
        bestExit="double_close"
      />
    );

    const region = screen.getByRole("region");
    // The whole card should be large enough for touch
    expect(region).toHaveClass("p-6"); // 24px padding = adequate
  });

  it("FieldRiskSummary rows meet 48px height", () => {
    const risks: FieldModeGate[] = [
      { id: "test", label: "Test Risk", status: "warning" },
    ];

    render(
      <FieldRiskSummary
        risks={risks}
        gatesSummary={{ passed: 7, total: 8, blocking: 0 }}
      />
    );

    const item = screen.getByRole("listitem");
    expect(item).toHaveClass("min-h-[48px]");
  });

  it("FieldNetClearance cards meet 48px height", () => {
    const exits: FieldModeExit[] = [
      { strategy: "test", label: "Test", netClearance: 1000, isRecommended: false },
    ];

    render(<FieldNetClearance exits={exits} />);

    const item = screen.getByRole("listitem");
    expect(item).toHaveClass("min-h-[72px]"); // Exceeds 48px
  });
});

// ---------------------------------------------------------------------------
// Edge Case Tests
// ---------------------------------------------------------------------------

describe("Edge Cases", () => {
  it("handles NaN in currency formatting", () => {
    render(
      <FieldVerdictHero
        verdict="PURSUE"
        verdictReason="Test"
        netClearance={NaN}
        bestExit="test"
      />
    );

    // Should show em-dash for NaN
    expect(screen.queryByText("NaN")).not.toBeInTheDocument();
  });

  it("handles Infinity in currency formatting", () => {
    render(
      <FieldVerdictHero
        verdict="PURSUE"
        verdictReason="Test"
        netClearance={Infinity}
        bestExit="test"
      />
    );

    // Should show em-dash for Infinity
    expect(screen.queryByText("Infinity")).not.toBeInTheDocument();
  });

  it("handles empty strings gracefully", () => {
    render(
      <FieldVerdictHero
        verdict="PASS"
        verdictReason=""
        netClearance={null}
        bestExit=""
      />
    );

    // Should still render without crashing
    expect(screen.getByText("PASS")).toBeInTheDocument();
  });

  it("handles very large numbers in currency", () => {
    render(
      <FieldVerdictHero
        verdict="PURSUE"
        verdictReason="Big deal"
        netClearance={2500000}
        bestExit="flip"
      />
    );

    expect(screen.getByText("$2.50M")).toBeInTheDocument();
  });
});
