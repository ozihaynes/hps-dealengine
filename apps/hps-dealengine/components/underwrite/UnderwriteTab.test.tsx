import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import UnderwriteTab from "./UnderwriteTab";

vi.mock("../../lib/analyzeBus", () => ({
  getLastAnalyzeResult: () => null,
  subscribeAnalyzeResult: () => () => {},
}));

const baseCalc: any = {
  instantCashOffer: 0,
  netToSeller: 0,
  urgencyDays: 0,
  buyerCeiling: 0,
  carryCosts: 0,
  carryMonths: 0,
  dealSpread: 0,
  displayCont: 0,
  displayMargin: 0,
  listingAllowed: true,
  maoFinal: 0,
  projectedPayoffClose: 0,
  repairs_with_contingency: 0,
  resaleCosts: 0,
  respectFloorPrice: 0,
  tenantBuffer: 0,
  totalRepairs: 0,
  urgencyBand: "",
};

const baseDeal: any = {
  market: {},
  property: {},
  status: {},
  debt: { juniors: [] },
  title: {},
  policy: {},
  costs: { monthly: {} },
  legal: {},
  timeline: {},
  confidence: {},
};

const defaultProps = {
  deal: baseDeal,
  calc: baseCalc,
  setDealValue: vi.fn(),
  sandbox: {} as any,
  canEditPolicy: true,
  onRequestOverride: vi.fn(),
  valuationRun: null,
  valuationSnapshot: null,
  minClosedComps: null,
  onRefreshValuation: vi.fn(),
  refreshingValuation: false,
  valuationError: null,
  valuationStatus: null,
  onApplySuggestedArv: vi.fn(),
  applyingSuggestedArv: false,
};

describe("UnderwriteTab Slice 5 UX", () => {
  it("shows contract/offer price required banner when missing", () => {
    render(
      <UnderwriteTab
        {...defaultProps}
        deal={{ ...baseDeal, market: { contract_price: "" } }}
        autosaveStatus={{ state: "idle", lastSavedAt: null, error: null }}
      />,
    );

    expect(
      screen.getByText(/Contract\/Offer Price is required for this slice/i),
    ).toBeTruthy();
  });

  it("prevents override submit without a long enough reason", async () => {
    const onOverrideMarketValue = vi.fn();
    render(
      <UnderwriteTab
        {...defaultProps}
        deal={{ ...baseDeal, market: { arv: 100000, as_is_value: 80000 } }}
        onOverrideMarketValue={onOverrideMarketValue}
        autosaveStatus={{ state: "idle", lastSavedAt: null, error: null }}
      />,
    );

    fireEvent.click(screen.getByText("Override ARV"));
    const valueInput = screen.getByDisplayValue("100000");
    fireEvent.change(valueInput, { target: { value: "110000" } });
    fireEvent.click(screen.getByText("Save Override"));

    expect(
      screen.getByText(/Reason must be at least 10 characters/i),
    ).toBeTruthy();
    expect(onOverrideMarketValue).not.toHaveBeenCalled();
  });

  it("shows Applied when suggested ARV is already persisted from valuation run", () => {
    const valuationRun: any = {
      id: "run-1",
      output: { suggested_arv: 150000 },
      provenance: { provider_name: "rentcast", as_of: "2025-01-01" },
    };
    render(
      <UnderwriteTab
        {...defaultProps}
        deal={{
          ...baseDeal,
          market: {
            arv_source: "valuation_run",
            arv_valuation_run_id: "run-1",
          },
        }}
        valuationRun={valuationRun}
        valuationSnapshot={{ comps: [], source: "rentcast", as_of: "2025-01-01" } as any}
        autosaveStatus={{ state: "idle", lastSavedAt: null, error: null }}
      />,
    );

    expect(screen.getByText("Applied")).toBeTruthy();
  });
});
