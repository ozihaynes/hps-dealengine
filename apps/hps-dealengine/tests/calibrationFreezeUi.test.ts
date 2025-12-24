import { describe, expect, it } from "vitest";
import { normalizeMarketKeyInput } from "@/lib/calibrationFreezeUi";

describe("normalizeMarketKeyInput", () => {
  it("normalizes 5-digit ZIP to zip_ prefix", () => {
    expect(normalizeMarketKeyInput("32807")).toEqual({
      ok: true,
      marketKey: "zip_32807",
    });
  });

  it("trims and preserves zip_ inputs", () => {
    expect(normalizeMarketKeyInput(" zip_32807 ")).toEqual({
      ok: true,
      marketKey: "zip_32807",
    });
  });

  it("accepts county market keys", () => {
    expect(normalizeMarketKeyInput("county_orange_county")).toEqual({
      ok: true,
      marketKey: "county_orange_county",
    });
  });

  it("rejects unknown inputs", () => {
    expect(normalizeMarketKeyInput("bad value")).toEqual({
      ok: false,
      reason: "invalid_market_key",
    });
  });
});
