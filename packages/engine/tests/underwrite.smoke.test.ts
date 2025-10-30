import { describe, it, expect } from "vitest";
import { computeUnderwriting } from "@hps-internal/engine";

describe("computeUnderwriting smoke", () => {
  it("returns a result object with expected top-level keys", () => {
    const deal = {
      market: { aiv: 300000, arv: 360000, dom_zip: 45, moi_zip: 2.3 },
      costs: {
        repairs_base: 40000,
        contingency_pct: 0.15,
        monthly: { taxes: 3600, insurance: 2400, hoa: 0, utilities: 250 },
      },
      debt: { senior_principal: 180000, juniors: [{ label: "HELOC", amount: 10000 }] },
      timeline: { days_to_ready_list: 0, days_to_sale_manual: 28 },
      status: { insurance_bindable: true },
    };

    const out: any = computeUnderwriting(deal as any);
    expect(out).toBeTruthy();
    for (const key of ["inputs", "policy", "dtm", "carry", "floors", "ceilings", "headlines"]) {
      expect(out).toHaveProperty(key);
    }
  });
});
