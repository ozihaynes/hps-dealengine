import { describe, expect, it } from "vitest";

import {
  ALL_SANDBOX_SETTING_META,
  DEFAULT_SANDBOX_CONFIG,
} from "@/constants/sandboxSettings";
import { sandboxToAnalyzeOptions } from "@/lib/sandboxToAnalyzeOptions";
import { mergeSandboxConfig } from "@/constants/sandboxSettings";

const SKIP_KEYS: string[] = [];

describe("sandbox bridge coverage", () => {
  it("covers all non-uiOnly sandbox keys via sandboxOptions or skip list", () => {
    const sample = mergeSandboxConfig(DEFAULT_SANDBOX_CONFIG);
    const options = sandboxToAnalyzeOptions({ sandbox: sample, posture: "base" });

    const seen = new Set<string>();

    // Collect keys from structured groups
    const collect = (obj: any) => {
      if (!obj || typeof obj !== "object") return;
      for (const [k, v] of Object.entries(obj)) {
        seen.add(k);
        if (v && typeof v === "object" && !Array.isArray(v)) {
          collect(v);
        }
      }
    };
    collect(options);

    // Include raw map keys
    const raw = (options as any).raw ?? {};
    Object.keys(raw).forEach((k) => seen.add(k));

    const uncovered = ALL_SANDBOX_SETTING_META.filter((meta) => {
      if ((meta as any).fixedOrVariable === "uiOnly") return false;
      if (SKIP_KEYS.includes(meta.key)) return false;
      return !seen.has(meta.key);
    }).map((m) => m.key);

    expect(uncovered).toEqual([]);
  });
});
