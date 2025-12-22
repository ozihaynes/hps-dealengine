import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CompsPanel } from "./CompsPanel";
import type { Comp, PropertySnapshot } from "@hps-internal/contracts";

describe("CompsPanel summary + rerun", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const comps: Comp[] = [
    {
      id: "1",
      address: "123 Main",
      city: "Orlando",
      state: "FL",
      postal_code: "32801",
      price: 100000,
      close_date: "2024-12-01",
      distance_miles: 0.5,
      status: "Closed",
      comp_kind: "closed_sale",
    } as any,
    {
      id: "2",
      address: "456 Pine",
      city: "Orlando",
      state: "FL",
      postal_code: "32802",
      price: 200000,
      close_date: "2024-12-15",
      distance_miles: 0.7,
      status: "Closed",
      comp_kind: "closed_sale",
    } as any,
    {
      id: "3",
      address: "789 Oak",
      city: "Orlando",
      state: "FL",
      postal_code: "32803",
      price: 300000,
      close_date: "2024-12-20",
      distance_miles: 1.2,
      status: "Active",
      comp_kind: "sale_listing",
    } as any,
  ];

  const snapshot: PropertySnapshot = {
    id: "snap-1",
    org_id: "org",
    address_fingerprint: "fp",
    source: "rentcast",
    as_of: "2024-12-16",
    comps,
    created_at: "2024-12-16",
    stub: false,
  } as any;

  it("renders summary stats and provenance badges", () => {
    render(
      <CompsPanel
        comps={comps}
        snapshot={{ ...snapshot, stub: true }}
        minClosedComps={3}
      />,
    );

    expect(screen.getByText(/Comparable closed sales/i)).toBeTruthy();
    expect(screen.getByText(/Comparable sale listings/i)).toBeTruthy();
    expect(screen.getByText(/Provider: rentcast/i)).toBeTruthy();
    const asOf = screen.getByText(/As of:/i);
    expect(asOf.textContent ?? "").toMatch(/2024/);
    expect(screen.getByText(/Stub data/i)).toBeTruthy();
    expect(screen.getByText(/Date range:/i)).toBeTruthy();
    expect(screen.getByText(/Median distance:/i)).toBeTruthy();
    expect(screen.getByText(/Price variance:/i)).toBeTruthy();
  });

  it("invokes rerun and disables during cooldown", async () => {
    const onRefresh = vi.fn();
    render(
      <CompsPanel
        comps={comps}
        snapshot={snapshot}
      minClosedComps={null}
      onRefresh={onRefresh}
      refreshing={false}
    />,
    );

    const button = screen.getAllByText("Re-run comps")[0] as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    fireEvent.click(button);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onRefresh).toHaveBeenCalledWith(true);
    await waitFor(() => expect(button.disabled).toBe(true));
  });
});
