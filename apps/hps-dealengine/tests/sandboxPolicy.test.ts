import { describe, expect, it } from "vitest";

import { mergePostureAwareValues } from "../lib/sandboxPolicy";
import { sandboxToAnalyzeOptions } from "../lib/sandboxToAnalyzeOptions";
import type { SandboxConfig } from "@hps-internal/contracts";

describe("sandbox posture-aware merge + mapping", () => {
  it("prefers postureConfigs values over root defaults for posture-aware keys", () => {
    const sandbox: SandboxConfig = {
      aivSafetyCapPercentage: 5,
      postureConfigs: {
        base: { aivSafetyCapPercentage: 3 },
        conservative: { aivSafetyCapPercentage: 7 },
        aggressive: { aivSafetyCapPercentage: 1 },
      } as any,
    } as any;

    const mergedBase = mergePostureAwareValues(sandbox, "base");
    const mergedAggressive = mergePostureAwareValues(sandbox, "aggressive");

    expect((mergedBase as any).aivSafetyCapPercentage).toBe(3);
    expect((mergedAggressive as any).aivSafetyCapPercentage).toBe(1);
  });

  it("maps posture-aware values into sandboxOptions", () => {
    const sandbox: SandboxConfig = {
      aivSafetyCapPercentage: 5,
      postureConfigs: {
        base: { aivSafetyCapPercentage: 3 },
      } as any,
    } as any;
    const options = sandboxToAnalyzeOptions({ sandbox, posture: "base" });
    expect(options.valuation?.aivSafetyCapPercentage).toBe(3);
    expect(options.raw?.aivSafetyCapPercentage).toBe(3);
  });
});
