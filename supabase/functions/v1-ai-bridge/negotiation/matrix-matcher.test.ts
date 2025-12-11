import { describe, expect, it } from "vitest";
import {
  matchPreEmptiveScripts,
  selectPlaybookRows,
} from "./matrix-matcher";
import { NegotiationMatrix } from "./matrix-types";

const matrix: NegotiationMatrix = {
  version: "v1",
  created_at: "2025-12-07T00:00:00Z",
  rows: [
    {
      id: "competence_light_low",
      module: "competence",
      scenario_label: "Light condition, low repairs",
      deal_facts: { condition_band: "light", repairs_band: "low" },
      trigger_phrase: "Light condition opener",
      script_body: "Light script body",
    },
    {
      id: "competence_medium_medium",
      module: "competence",
      scenario_label: "Fallback competence",
      deal_facts: { condition_band: "medium", repairs_band: "medium" },
      trigger_phrase: "Medium opener",
      script_body: "Medium script body",
    },
    {
      id: "price_anchor_medium",
      module: "price_anchor",
      scenario_label: "Anchor for medium repairs",
      deal_facts: { condition_band: "medium", repairs_band: "medium" },
      trigger_phrase: "Anchor opener",
      script_body: "Anchor script body",
    },
    {
      id: "negative_reverse_generic",
      module: "negative_reverse",
      scenario_label: "Generic negative reverse",
      deal_facts: { condition_band: "medium", repairs_band: "medium" },
      trigger_phrase: "NR opener",
      script_body: "NR script body",
    },
  ],
};

describe("negotiation matrix matcher", () => {
  it("prefers the most specific row for a module", () => {
    const matches = matchPreEmptiveScripts(matrix, {
      condition_band: "light",
      repairs_band: "low",
    });
    expect(matches[0]?.id).toBe("competence_light_low");
  });

  it("selects one row per module when available", () => {
    const rows = selectPlaybookRows(matrix, {
      condition_band: "medium",
      repairs_band: "medium",
    });
    expect(rows.price_anchor?.id).toBe("price_anchor_medium");
    expect(rows.competence?.id).toBe("competence_medium_medium");
    expect(rows.negative_reverse?.id).toBe("negative_reverse_generic");
  });

  it("produces deterministic playbook sections", async () => {
    const { buildPlaybookResult } = await import("./prompts");
    const result = buildPlaybookResult({
      runId: "RUN-123",
      matrix,
      facts: { condition_band: "medium", repairs_band: "medium" },
    });

    expect(result.persona).toBe("dealNegotiator");
    expect(result.sections.anchor?.id).toBe("price_anchor_medium");
    expect(result.sections.script?.id).toBe("competence_medium_medium");
    expect(result.logicRowIds).toContain("price_anchor_medium");
  });
});
