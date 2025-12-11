import { beforeAll, describe, expect, it } from "vitest";
import {
  loadNegotiationDataset,
  matchNegotiationRow,
  type NegotiationDealFacts,
  type NegotiationMatrixRow,
} from "../src/negotiationMatrix";

let rows: NegotiationMatrixRow[] = [];

beforeAll(async () => {
  rows = await loadNegotiationDataset();
});

describe("negotiation matrix matching", () => {
  it("selects the foreclosure heavy repairs emergency row when facts align", () => {
    const facts: NegotiationDealFacts = {
      condition_band: "heavy",
      repairs_band: "high",
      repair_evidence: "estimator_only",
      has_big5_issues: true,
      status_in_foreclosure: true,
      seller_motivation_primary: "avoid_auction",
      motivation_strength: "high",
      timeline_urgency: "emergency",
      timeline_trigger: "auction",
      arrears_band: "critical",
      shortfall_vs_payoff_band: "shortfall",
      zip_speed_band: "fast",
      market_temp_label: "hot",
      confidence_grade: "B",
      risk_flags: ["uninsurable"],
      lead_channel: "inbound_call",
      trust_level: "lukewarm",
    };

    const match = matchNegotiationRow(rows, facts);
    expect(match?.row.id).toBe("competence_foreclosure_heavy_repairs_emergency");
    expect(match?.matchScore).toBeGreaterThan(5);
  });

  it("breaks ties deterministically by lowest id", () => {
    const facts: NegotiationDealFacts = {
      condition_band: "heavy",
      repairs_band: "high",
    };

    const match = matchNegotiationRow(rows, facts);
    expect(match?.row.id).toBe("competence_foreclosure_heavy_repairs_emergency");
    expect(match?.matchScore).toBe(2);
  });
});
