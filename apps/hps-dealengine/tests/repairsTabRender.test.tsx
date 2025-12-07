import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RepairsTab from "../components/repairs/RepairsTab";
import type { Deal, EngineCalculations } from "../types";
import type { RepairRates } from "@hps-internal/contracts";
import { createInitialEstimatorState } from "../lib/repairsEstimator";

describe("RepairsTab renders live repair rates", () => {
  const deal = {} as Deal;
  const calc = {} as EngineCalculations;
  const estimatorState = createInitialEstimatorState();
  const baseProps = {
    deal,
    setDealValue: () => {},
    calc,
    estimatorState,
    onCostChange: () => {},
    onQuantityChange: () => {},
    onReset: () => {},
    marketCode: "ORL",
    posture: "base",
    ratesStatus: "loaded" as const,
  };

  const defaultRates: RepairRates = {
    profileId: "default",
    profileName: "Default Profile",
    orgId: "org-1",
    posture: "base",
    marketCode: "ORL",
    asOf: "2024-01-01",
    source: "seed",
    version: "v1",
    isDefault: true,
    psfTiers: { none: 10, light: 20, medium: 30, heavy: 40 },
    big5: { roof: 1, hvac: 2, repipe: 3, electrical: 4, foundation: 5 },
    lineItemRates: {},
  };

  const updatedRates: RepairRates = {
    ...defaultRates,
    profileId: "99",
    profileName: "Profile 99",
    asOf: "2024-02-02",
    psfTiers: { none: 11, light: 22, medium: 33, heavy: 44 },
    big5: { roof: 9, hvac: 8, repipe: 7, electrical: 6, foundation: 5 },
  };

  it("reflects the active profile meta and rates when repairRates change", () => {
    const first = renderToStaticMarkup(
      <RepairsTab
        {...baseProps}
        repairRates={defaultRates}
        activeProfileName={defaultRates.profileName ?? undefined}
        meta={{
          profileId: defaultRates.profileId,
          profileName: defaultRates.profileName,
          marketCode: defaultRates.marketCode,
          posture: defaultRates.posture,
          asOf: defaultRates.asOf,
          source: defaultRates.source,
          version: defaultRates.version,
        }}
      />,
    );

    expect(first).toContain("Default Profile");
    expect(first).toContain("2024-01-01");
    expect(first).toContain("&quot;roof&quot;:1");

    const second = renderToStaticMarkup(
      <RepairsTab
        {...baseProps}
        repairRates={updatedRates}
        activeProfileName={updatedRates.profileName ?? undefined}
        meta={{
          profileId: updatedRates.profileId,
          profileName: updatedRates.profileName,
          marketCode: updatedRates.marketCode,
          posture: updatedRates.posture,
          asOf: updatedRates.asOf,
          source: updatedRates.source,
          version: updatedRates.version,
        }}
      />,
    );

    expect(second).toContain("Profile 99");
    expect(second).toContain("2024-02-02");
    expect(second).toContain("&quot;roof&quot;:9");
    expect(second).not.toContain("Default Profile");
  });
});
