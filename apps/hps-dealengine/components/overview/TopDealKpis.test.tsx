import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TopDealKpis from "./TopDealKpis";

const baseProps = {
  arv: null,
  maoFinal: null,
  offer: null,
  discountToArvPct: null,
  discountToArvDollars: null,
  assignmentFee: null,
  dtmDays: null,
};

describe("TopDealKpis", () => {
  it("shows offer tile and em dash when missing", () => {
    render(<TopDealKpis {...baseProps} />);

    const label = screen.getByText(/Offer \(Computed\)/i);
    const tile = label.parentElement as HTMLElement;
    expect(within(tile).getByText("—")).toBeTruthy();
  });

  it("formats computed offer when present", () => {
    render(<TopDealKpis {...baseProps} offer={200000} />);

    expect(screen.getByText(/Offer \(Computed\)/i)).toBeTruthy();
    expect(screen.getByText(/\$200,000/)).toBeTruthy();
  });
});
