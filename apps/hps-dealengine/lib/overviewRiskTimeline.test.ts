import { describe, expect, it } from "vitest";

import {
  buildEvidenceView,
  buildRiskView,
  buildTimelineView,
} from "./overviewRiskTimeline";

describe("overviewRiskTimeline presenters", () => {
  it("handles missing outputs gracefully", () => {
    const risk = buildRiskView(null);
    const timeline = buildTimelineView(null, null as any);
    const evidence = buildEvidenceView(undefined);

    expect(risk.overallStatus).toBe("unknown");
    expect(risk.gates.every((g) => g.status === "unknown")).toBe(true);
    expect(timeline.urgencyLabel).toBe("Unknown");
    expect(evidence.confidenceGrade).toBe("Unknown");
    expect(evidence.isComplete).toBe(false);
  });

  it("maps risk gates and reasons", () => {
    const risk = buildRiskView({
      risk_summary: {
        overall: "watch",
        insurability: "pass",
        payoff: "fail",
        reasons: ["payoff: fail - missing payoff letter"],
      },
    } as any);

    expect(risk.overallStatus).toBe("watch");
    const payoffGate = risk.gates.find((g) => g.key === "payoff");
    expect(payoffGate?.status).toBe("fail");
    expect(payoffGate?.reason).toContain("payoff");
  });

  it("builds timeline with urgency and carry fallbacks", () => {
    const timeline = buildTimelineView(
      {
        timeline_summary: {
          days_to_money: 10,
          carry_months: 2.5,
          speed_band: "fast",
          urgency: "critical",
          auction_date_iso: "2025-12-15",
        },
      } as any,
      { carryCosts: 5000, carryMonths: 2.5 } as any,
    );

    expect(timeline.daysToMoney).toBe(10);
    expect(timeline.carryMonths).toBe(2.5);
    expect(timeline.urgencyLabel).toBe("Critical");
    expect(timeline.carryMonthly).toBeCloseTo(2000, 2);
  });

  it("derives evidence completeness and freshness labels", () => {
    const evidence = buildEvidenceView({
      evidence_summary: {
        confidence_grade: "B",
        confidence_reasons: ["thin comps"],
        freshness_by_kind: {
          payoff_letter: "fresh",
          title_quote: "missing",
          comps: "stale",
          insurance: "fresh",
        },
      },
    } as any);

    expect(evidence.confidenceGrade).toBe("B");
    expect(evidence.missingKinds.some((k) => k.toLowerCase().includes("title"))).toBe(
      true,
    );
    expect(evidence.staleKinds.some((k) => k.toLowerCase().includes("comps"))).toBe(
      true,
    );
    expect(evidence.isComplete).toBe(false);
  });
});
