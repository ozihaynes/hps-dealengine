import { describe, expect, it } from "vitest";

import {
  ALL_GLOSSARY_KEYS,
  GLOSSARY,
  type GlossaryEntry,
  type GlossaryKey,
} from "./glossary";

describe("glossary keys and entries", () => {
  it("every GlossaryKey has a corresponding entry in GLOSSARY", () => {
    const keys: readonly GlossaryKey[] = ALL_GLOSSARY_KEYS;

    for (const key of keys) {
      const entry = GLOSSARY[key];
      expect(entry).toBeDefined();
    }
  });

  it("every glossary entry has a non-empty, reasonably short description", () => {
    const entries: [GlossaryKey, GlossaryEntry][] = Object.entries(
      GLOSSARY,
    ) as [GlossaryKey, GlossaryEntry][];

    for (const [, entry] of entries) {
      const desc = entry.description ?? "";
      const trimmed = desc.trim();

      expect(trimmed.length).toBeGreaterThan(10);
      expect(trimmed.length).toBeLessThanOrEqual(280);
    }
  });

  it("common helpKey values used in UI resolve to glossary entries", () => {
    const referencedKeys: GlossaryKey[] = [
      "arv",
      "aiv",
      "respect_floor",
      "buyer_ceiling",
      "dtm",
      "carry_months",
      "aiv_safety_cap",
      "risk_gate",
      "evidence_freshness",
      "quick_estimate",
      "big5_repairs",
      "sandbox_posture",
    ];

    for (const key of referencedKeys) {
      expect(ALL_GLOSSARY_KEYS).toContain(key);
      expect(GLOSSARY[key]).toBeDefined();
    }
  });
});

