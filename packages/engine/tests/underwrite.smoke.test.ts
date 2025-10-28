import { describe, it, expect } from "vitest";
import { computeUnderwriting } from "@hps-internal/engine";

describe("engine: computeUnderwriting smoke", () => {
  it("returns the core shape with sane values", () => {
    const deal = {
      market: { aiv: 300000, arv: 360000, dom_zip: 45, moi_zip: 2.3 },
      costs: {
        repairs_base: 40000,
        contingency_pct: 0.15,
        monthly: { taxes: 3600, insurance: 2400, hoa: 0, utilities: 250 },
        essentials_moveout_cash: 2000,
      },
      debt: { senior_principal: 180000 },
      timeline: { days_to_ready_list: 0, days_to_sale_manual: 28 },
    };

    const res = computeUnderwriting(deal as any);

    expect(res).toBeTruthy();
    expect(res.inputs?.deal).toBeTruthy();

    // Headlines
    expect(res.headlines).toBeTruthy();
    expect(res.headlines.instant_cash_offer).toBeDefined();

    // Floors/Ceilings
    expect(res.floors).toBeTruthy();
    expect(res.ceilings).toBeTruthy();

    // DTM/Carry present
    expect(res.dtm?.days).toBeGreaterThan(0);
    expect(res.carry?.total).toBeGreaterThanOrEqual(0);
  });
});
