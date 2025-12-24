import { describe, expect, it } from "vitest";
import { buildMarketKeyCandidates } from "./valuationBuckets.ts";

describe("valuationBuckets", () => {
  it("buildMarketKeyCandidates orders zip, county, msa, unknown", () => {
    const candidates = buildMarketKeyCandidates({
      zip: "32807-1234",
      county: "Orange County",
      msa: "Orlando-Kissimmee",
    });

    expect(candidates).toEqual([
      "zip_32807",
      "county_orange_county",
      "msa_orlando_kissimmee",
      "market_unknown",
    ]);
  });
});
