import { describe, expect, it } from "vitest";
import { resolveCalibrationFreezeDecision } from "./calibrationFreeze.ts";

describe("calibrationFreeze", () => {
  it("returns frozen decision with explicit reason", () => {
    const res = resolveCalibrationFreezeDecision("zip_32807", {
      is_frozen: true,
      reason: "manual pause",
    });

    expect(res).toEqual({ frozen: true, reason: "frozen:manual pause" });
  });

  it("returns frozen decision with market key fallback", () => {
    const res = resolveCalibrationFreezeDecision("zip_32807", {
      is_frozen: true,
      reason: null,
    });

    expect(res).toEqual({ frozen: true, reason: "frozen:zip_32807" });
  });

  it("returns not frozen when row is missing", () => {
    const res = resolveCalibrationFreezeDecision("zip_32807", null);
    expect(res).toEqual({ frozen: false });
  });
});
