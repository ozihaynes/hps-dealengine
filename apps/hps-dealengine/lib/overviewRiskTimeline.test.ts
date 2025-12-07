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
    const evidence = buildEvidenceView(undefined, null);

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
        per_gate: {
          insurability: { status: "pass" },
          payoff: { status: "fail", reasons: ["missing payoff"] },
        },
        reasons: ["payoff: fail - missing payoff letter"],
      },
    } as any);

    expect(risk.overallStatus).toBe("watch");
    const payoffGate = risk.gates.find((g) => g.key === "payoff");
    expect(payoffGate?.status).toBe("fail");
    expect(payoffGate?.reasons[0]).toContain("payoff");
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
          payoff_letter: { status: "fresh" },
          title_quote: { status: "missing", blocking_for_ready: true },
          comps: { status: "stale", age_days: 120 },
          insurance: { status: "fresh" },
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

  it("pulls placeholder policy from trace when present", () => {
    const trace = [
      {
        rule: "EVIDENCE_FRESHNESS_POLICY",
        details: {
          allow_placeholders_when_evidence_missing: true,
          placeholders_used: true,
          placeholder_kinds: ["payoff_letter"],
        },
      },
    ];
    const evidence = buildEvidenceView(
      {
        evidence_summary: {
          freshness_by_kind: {
            payoff_letter: { status: "missing", blocking_for_ready: true },
          },
        },
      } as any,
      trace,
    );

    expect(evidence.placeholdersAllowed).toBe(true);
    expect(evidence.placeholdersUsed).toBe(true);
    expect(evidence.placeholderKinds).toContain("payoff_letter");
  });
});
