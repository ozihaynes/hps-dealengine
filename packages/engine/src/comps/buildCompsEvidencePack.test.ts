import { describe, it, expect } from "vitest";
import { buildCompsEvidencePack } from "./buildCompsEvidencePack";
import { CompsEvidencePackSchema } from "@hps-internal/contracts";

// =============================================================================
// TEST HELPERS
// =============================================================================

/** Default input with all nulls for cleaner test cases */
const DEFAULT_INPUT = {
  selection_version: null,
  comp_kind_used: null,
  outliers_removed_count: null,
  candidates_before_filters: null,
  candidates_after_filters: null,
  snapshot_id: null,
  snapshot_as_of: null,
  provider: null,
  valuation_run_id: null,
} as const;

/** Create input with selected_comps and defaults */
function input(comps: unknown[], overrides = {}) {
  return { selected_comps: comps, ...DEFAULT_INPUT, ...overrides };
}

/** Minimal valid comp for testing */
function minimalComp(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-comp",
    source: "TestSource",
    as_of: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("buildCompsEvidencePack", () => {
  // ===========================================================================
  // SCHEMA COMPLIANCE
  // ===========================================================================

  describe("schema compliance", () => {
    it("output passes Zod schema validation for empty pack", () => {
      const result = buildCompsEvidencePack({
        ...DEFAULT_INPUT,
        selected_comps: [],
      });
      expect(() => CompsEvidencePackSchema.parse(result)).not.toThrow();
    });

    it("output passes Zod schema validation for populated pack", () => {
      const result = buildCompsEvidencePack(
        input([
          minimalComp({ price: 300000, sqft: 1500, score: 0.85 }),
          minimalComp({ id: "comp-2", price: 320000, sqft: 1600, score: 0.80 }),
        ])
      );
      expect(() => CompsEvidencePackSchema.parse(result)).not.toThrow();
    });
  });

  // ===========================================================================
  // EDGE CASES: Empty/Null/Undefined
  // ===========================================================================

  describe("empty/null inputs", () => {
    it("returns empty pack when selected_comps is null", () => {
      const result = buildCompsEvidencePack({
        selected_comps: null,
        selection_version: "v1.1",
        comp_kind_used: null,
        outliers_removed_count: null,
        candidates_before_filters: null,
        candidates_after_filters: null,
        snapshot_id: null,
        snapshot_as_of: null,
        provider: null,
        valuation_run_id: null,
      });

      expect(result.comp_count).toBe(0);
      expect(result.comps).toEqual([]);
      expect(result.avg_similarity_score).toBeNull();
      expect(result.avg_distance_miles).toBeNull();
      expect(result.avg_days_old).toBeNull();
      expect(result.price_range_low).toBeNull();
      expect(result.price_range_high).toBeNull();
      expect(result.selection_version).toBe("v1.1");
    });

    it("returns empty pack when selected_comps is undefined", () => {
      const result = buildCompsEvidencePack({
        ...DEFAULT_INPUT,
        selected_comps: undefined,
      });

      expect(result.comp_count).toBe(0);
      expect(result.comps).toEqual([]);
    });

    it("returns empty pack when selected_comps is empty array", () => {
      const result = buildCompsEvidencePack({
        selected_comps: [],
        selection_version: "v1.2",
        comp_kind_used: "closed_sale",
        outliers_removed_count: 2,
        candidates_before_filters: 15,
        candidates_after_filters: 8,
        snapshot_id: "snap-123",
        snapshot_as_of: "2025-01-01T00:00:00Z",
        provider: "RentCast",
        valuation_run_id: "run-456",
      });

      expect(result.comp_count).toBe(0);
      expect(result.comps).toEqual([]);
      expect(result.outliers_removed_count).toBe(2);
      expect(result.provider).toBe("RentCast");
      expect(result.valuation_run_id).toBe("run-456");
    });

    it("preserves all metadata even when comps are empty", () => {
      const result = buildCompsEvidencePack({
        selected_comps: [],
        selection_version: "v1.3",
        comp_kind_used: "sale_listing",
        outliers_removed_count: 5,
        candidates_before_filters: 20,
        candidates_after_filters: 10,
        snapshot_id: "snap-abc",
        snapshot_as_of: "2025-06-15T12:00:00Z",
        provider: "ATTOM",
        valuation_run_id: "run-xyz",
      });

      expect(result.selection_version).toBe("v1.3");
      expect(result.comp_kind_used).toBe("sale_listing");
      expect(result.outliers_removed_count).toBe(5);
      expect(result.candidates_before_filters).toBe(20);
      expect(result.candidates_after_filters).toBe(10);
      expect(result.snapshot_id).toBe("snap-abc");
      expect(result.snapshot_as_of).toBe("2025-06-15T12:00:00Z");
      expect(result.provider).toBe("ATTOM");
      expect(result.valuation_run_id).toBe("run-xyz");
    });
  });

  // ===========================================================================
  // EDGE CASES: NaN/Infinity
  // ===========================================================================

  describe("NaN/Infinity handling", () => {
    it("converts NaN price to null", () => {
      const result = buildCompsEvidencePack(
        input([minimalComp({ price: NaN, sqft: 1500 })])
      );

      expect(result.comps[0].price).toBeNull();
      expect(result.comps[0].price_per_sqft).toBeNull();
      expect(result.price_range_low).toBeNull();
      expect(result.price_range_high).toBeNull();
    });

    it("converts Infinity price to null", () => {
      const result = buildCompsEvidencePack(
        input([minimalComp({ price: Infinity, sqft: 1500 })])
      );

      expect(result.comps[0].price).toBeNull();
    });

    it("converts -Infinity to null", () => {
      const result = buildCompsEvidencePack(
        input([minimalComp({ price: -Infinity, sqft: 1500 })])
      );

      expect(result.comps[0].price).toBeNull();
    });

    it("handles NaN in sqft (prevents division by zero)", () => {
      const result = buildCompsEvidencePack(
        input([minimalComp({ price: 300000, sqft: NaN })])
      );

      expect(result.comps[0].price).toBe(300000);
      expect(result.comps[0].sqft).toBeNull();
      expect(result.comps[0].price_per_sqft).toBeNull();
    });

    it("handles zero sqft (prevents division by zero)", () => {
      const result = buildCompsEvidencePack(
        input([minimalComp({ price: 300000, sqft: 0 })])
      );

      expect(result.comps[0].price).toBe(300000);
      expect(result.comps[0].sqft).toBe(0); // 0 is valid nonnegative
      expect(result.comps[0].price_per_sqft).toBeNull(); // Division by zero prevented
    });
  });

  // ===========================================================================
  // EDGE CASES: Negative Values (Schema requires .nonnegative())
  // ===========================================================================

  describe("negative value handling", () => {
    it("converts negative price to null", () => {
      const result = buildCompsEvidencePack(
        input([minimalComp({ price: -5000 })])
      );

      expect(result.comps[0].price).toBeNull();
    });

    it("converts negative sqft to null", () => {
      const result = buildCompsEvidencePack(
        input([minimalComp({ sqft: -100 })])
      );

      expect(result.comps[0].sqft).toBeNull();
    });

    it("converts negative distance_miles to null", () => {
      const result = buildCompsEvidencePack(
        input([minimalComp({ distance_miles: -0.5 })])
      );

      expect(result.comps[0].distance_miles).toBeNull();
    });

    it("converts negative days_old to null", () => {
      const result = buildCompsEvidencePack(
        input([minimalComp({ days_old: -10 })])
      );

      expect(result.comps[0].days_old).toBeNull();
    });

    it("converts negative beds to null", () => {
      const result = buildCompsEvidencePack(
        input([minimalComp({ beds: -2 })])
      );

      expect(result.comps[0].beds).toBeNull();
    });

    it("converts negative dom to null", () => {
      const result = buildCompsEvidencePack(
        input([minimalComp({ dom: -5 })])
      );

      expect(result.comps[0].dom).toBeNull();
    });
  });

  // ===========================================================================
  // EDGE CASES: Integer Constraints (Schema requires .int())
  // ===========================================================================

  describe("integer constraint handling", () => {
    it("rounds beds to integer", () => {
      const result = buildCompsEvidencePack(
        input([minimalComp({ beds: 3.7 })])
      );

      expect(result.comps[0].beds).toBe(4);
    });

    it("rounds days_old to integer", () => {
      const result = buildCompsEvidencePack(
        input([minimalComp({ days_old: 15.3 })])
      );

      expect(result.comps[0].days_old).toBe(15);
    });

    it("rounds dom to integer", () => {
      const result = buildCompsEvidencePack(
        input([minimalComp({ dom: 28.9 })])
      );

      expect(result.comps[0].dom).toBe(29);
    });

    it("rounds year_built to integer", () => {
      const result = buildCompsEvidencePack(
        input([minimalComp({ year_built: 1985.5 })])
      );

      expect(result.comps[0].year_built).toBe(1986);
    });

    it("preserves baths as float (can be 1.5, 2.5)", () => {
      const result = buildCompsEvidencePack(
        input([minimalComp({ baths: 2.5 })])
      );

      expect(result.comps[0].baths).toBe(2.5);
    });
  });

  // ===========================================================================
  // EDGE CASES: Empty String Provenance (Schema requires .min(1))
  // ===========================================================================

  describe("empty string provenance handling", () => {
    it("uses fallback when source is empty string", () => {
      const result = buildCompsEvidencePack(
        input([{ id: "test", source: "", as_of: "2025-01-01" }])
      );

      expect(result.comps[0].source).toBe("unknown");
    });

    it("uses fallback when as_of is empty string", () => {
      const result = buildCompsEvidencePack(
        input(
          [{ id: "test", source: "RentCast", as_of: "" }],
          { snapshot_as_of: "2025-06-01T00:00:00Z" }
        )
      );

      expect(result.comps[0].as_of).toBe("2025-06-01T00:00:00Z");
    });

    it("uses unknown when as_of and snapshot_as_of both missing", () => {
      const result = buildCompsEvidencePack(
        input([{ id: "test", source: "RentCast", as_of: "" }])
      );

      expect(result.comps[0].as_of).toBe("unknown");
    });

    it("uses fallback when id is empty string", () => {
      const result = buildCompsEvidencePack(
        input([{ id: "", source: "RentCast", as_of: "2025-01-01" }])
      );

      expect(result.comps[0].id).toBe("comp-0");
    });
  });

  // ===========================================================================
  // NORMAL CASES: Price Per Sqft
  // ===========================================================================

  describe("price_per_sqft calculation", () => {
    it("calculates price_per_sqft correctly", () => {
      const result = buildCompsEvidencePack(
        input([minimalComp({ price: 300000, sqft: 1500 })])
      );

      expect(result.comps[0].price_per_sqft).toBe(200); // 300000/1500 = 200
    });

    it("rounds price_per_sqft to whole number", () => {
      const result = buildCompsEvidencePack(
        input([minimalComp({ price: 315000, sqft: 1500 })])
      );

      expect(result.comps[0].price_per_sqft).toBe(210); // 315000/1500 = 210
    });
  });

  // ===========================================================================
  // NORMAL CASES: Net Adjustment Percentage
  // ===========================================================================

  describe("net_adjustment_pct calculation", () => {
    it("calculates positive adjustment percentage", () => {
      const result = buildCompsEvidencePack(
        input([minimalComp({ price: 300000, adjusted_value: 315000 })])
      );

      expect(result.comps[0].net_adjustment_pct).toBe(5);
    });

    it("calculates negative adjustment percentage", () => {
      const result = buildCompsEvidencePack(
        input([minimalComp({ price: 300000, adjusted_value: 270000 })])
      );

      expect(result.comps[0].net_adjustment_pct).toBe(-10);
    });

    it("returns null when price is zero (prevents division)", () => {
      const result = buildCompsEvidencePack(
        input([minimalComp({ price: 0, adjusted_value: 300000 })])
      );

      expect(result.comps[0].net_adjustment_pct).toBeNull();
    });
  });

  // ===========================================================================
  // NORMAL CASES: Adjustments Array
  // ===========================================================================

  describe("adjustments transformation", () => {
    it("transforms adjustments with correct direction", () => {
      const result = buildCompsEvidencePack(
        input([
          minimalComp({
            adjustments: [
              { type: "sqft", label: "Square Footage", amount: 5000 },
              { type: "condition", label: "Condition", amount: -3000 },
              { type: "pool", label: "Pool", amount: 0 },
            ],
          }),
        ])
      );

      expect(result.comps[0].adjustments).toHaveLength(3);
      expect(result.comps[0].adjustments![0]).toEqual({
        type: "sqft",
        label: "Square Footage",
        amount: 5000,
        direction: "up",
      });
      expect(result.comps[0].adjustments![1]).toEqual({
        type: "condition",
        label: "Condition",
        amount: -3000,
        direction: "down",
      });
      expect(result.comps[0].adjustments![2]).toEqual({
        type: "pool",
        label: "Pool",
        amount: 0,
        direction: "neutral",
      });
    });

    it("uses type as label fallback when label missing", () => {
      const result = buildCompsEvidencePack(
        input([minimalComp({ adjustments: [{ type: "sqft", amount: 5000 }] })])
      );

      expect(result.comps[0].adjustments![0].label).toBe("sqft");
    });

    it("returns null adjustments when not an array", () => {
      const result = buildCompsEvidencePack(
        input([minimalComp({ adjustments: "invalid" })])
      );

      expect(result.comps[0].adjustments).toBeNull();
    });
  });

  // ===========================================================================
  // NORMAL CASES: Aggregate Calculations
  // ===========================================================================

  describe("aggregate calculations", () => {
    it("calculates price range correctly", () => {
      const result = buildCompsEvidencePack(
        input([
          minimalComp({ id: "1", price: 280000 }),
          minimalComp({ id: "2", price: 300000 }),
          minimalComp({ id: "3", price: 320000 }),
        ])
      );

      expect(result.price_range_low).toBe(280000);
      expect(result.price_range_high).toBe(320000);
    });

    it("calculates price variance percentage", () => {
      const result = buildCompsEvidencePack(
        input([
          minimalComp({ id: "1", price: 280000 }),
          minimalComp({ id: "2", price: 300000 }),
          minimalComp({ id: "3", price: 320000 }),
        ])
      );

      // median = 300000
      // variance = 320000 - 280000 = 40000
      // variance % = 40000 / 300000 * 100 = 13.33%
      expect(result.price_variance_pct).toBe(13.3);
    });

    it("calculates averages correctly", () => {
      const result = buildCompsEvidencePack(
        input([
          minimalComp({
            id: "1",
            price: 280000,
            distance_miles: 0.5,
            days_old: 30,
            score: 0.85,
          }),
          minimalComp({
            id: "2",
            price: 320000,
            distance_miles: 0.8,
            days_old: 45,
            score: 0.75,
          }),
        ])
      );

      expect(result.comp_count).toBe(2);
      expect(result.avg_distance_miles).toBe(0.7); // (0.5 + 0.8) / 2 = 0.65, rounded
      expect(result.avg_days_old).toBe(38); // Math.round((30 + 45) / 2) = 38
      expect(result.avg_similarity_score).toBe(80); // ((85 + 75) / 2) = 80
    });

    it("returns null for variance with single comp", () => {
      const result = buildCompsEvidencePack(
        input([minimalComp({ price: 300000 })])
      );

      expect(result.price_variance_pct).toBeNull();
    });
  });

  // ===========================================================================
  // SIMILARITY SCORE NORMALIZATION
  // ===========================================================================

  describe("similarity score normalization", () => {
    it("normalizes score (0-1) to percentage (0-100)", () => {
      const result = buildCompsEvidencePack(
        input([minimalComp({ score: 0.85 })])
      );

      expect(result.comps[0].similarity_score).toBe(85);
    });

    it("falls back to correlation when score missing", () => {
      const result = buildCompsEvidencePack(
        input([minimalComp({ correlation: 0.72 })])
      );

      expect(result.comps[0].similarity_score).toBe(72);
    });

    it("prefers score over correlation when both present", () => {
      const result = buildCompsEvidencePack(
        input([minimalComp({ score: 0.90, correlation: 0.72 })])
      );

      expect(result.comps[0].similarity_score).toBe(90);
      expect(result.comps[0].correlation).toBe(0.72); // Still preserved
    });

    it("clamps similarity score above 100 to 100", () => {
      const result = buildCompsEvidencePack(
        input([minimalComp({ score: 1.5 })])
      );

      expect(result.comps[0].similarity_score).toBe(100); // Not 150
    });

    it("clamps similarity score below 0 to 0", () => {
      const result = buildCompsEvidencePack(
        input([minimalComp({ score: -0.1 })])
      );

      expect(result.comps[0].similarity_score).toBe(0); // Not -10
    });

    it("clamps avg_similarity_score to 0-100", () => {
      const result = buildCompsEvidencePack(
        input([
          minimalComp({ id: "1", score: 1.2 }),
          minimalComp({ id: "2", score: 1.3 }),
        ])
      );

      // Both would be 100 after clamping, so average is 100
      expect(result.avg_similarity_score).toBe(100);
    });
  });

  // ===========================================================================
  // DETERMINISM
  // ===========================================================================

  describe("determinism", () => {
    it("produces identical output for identical input (run twice)", () => {
      const testInput = {
        selected_comps: [
          minimalComp({ id: "comp-1", price: 300000, sqft: 1500 }),
          minimalComp({ id: "comp-2", price: 310000, sqft: 1600 }),
        ],
        selection_version: "v1.1",
        comp_kind_used: "closed_sale" as const,
        outliers_removed_count: 2,
        candidates_before_filters: 15,
        candidates_after_filters: 8,
        snapshot_id: "snap-123",
        snapshot_as_of: "2025-01-01T00:00:00Z",
        provider: "RentCast",
        valuation_run_id: "run-456",
      };

      const result1 = buildCompsEvidencePack(testInput);
      const result2 = buildCompsEvidencePack(testInput);

      // Stringify comparison ensures deep equality
      expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
    });

    it("produces identical output when called multiple times", () => {
      const testInput = {
        selected_comps: [
          minimalComp({ id: "c1", price: 250000, distance_miles: 0.3, days_old: 15, score: 0.92 }),
          minimalComp({ id: "c2", price: 275000, distance_miles: 0.5, days_old: 28, score: 0.88 }),
          minimalComp({ id: "c3", price: 290000, distance_miles: 0.7, days_old: 42, score: 0.78 }),
        ],
        selection_version: "v1.2",
        comp_kind_used: "closed_sale" as const,
        outliers_removed_count: 1,
        candidates_before_filters: 20,
        candidates_after_filters: 12,
        snapshot_id: "snap-xyz",
        snapshot_as_of: "2025-06-01T00:00:00Z",
        provider: "ATTOM",
        valuation_run_id: "run-abc",
      };

      const results = Array.from({ length: 5 }, () =>
        buildCompsEvidencePack(testInput)
      );

      const firstResult = JSON.stringify(results[0]);
      for (const result of results) {
        expect(JSON.stringify(result)).toBe(firstResult);
      }
    });
  });

  // ===========================================================================
  // COMP_KIND VALIDATION
  // ===========================================================================

  describe("comp_kind validation", () => {
    it("accepts valid closed_sale", () => {
      const result = buildCompsEvidencePack(
        input([minimalComp({ comp_kind: "closed_sale" })])
      );

      expect(result.comps[0].comp_kind).toBe("closed_sale");
    });

    it("accepts valid sale_listing", () => {
      const result = buildCompsEvidencePack(
        input([minimalComp({ comp_kind: "sale_listing" })])
      );

      expect(result.comps[0].comp_kind).toBe("sale_listing");
    });

    it("returns null for invalid comp_kind", () => {
      const result = buildCompsEvidencePack(
        input([minimalComp({ comp_kind: "invalid_kind" })])
      );

      expect(result.comps[0].comp_kind).toBeNull();
    });
  });

  // ===========================================================================
  // ID GENERATION FALLBACK
  // ===========================================================================

  describe("ID generation fallback", () => {
    it("uses deterministic index-based IDs when id missing", () => {
      const result = buildCompsEvidencePack(
        input([
          { price: 300000, source: "R", as_of: "2025-01-01" },
          { price: 310000, source: "R", as_of: "2025-01-01" },
          { price: 320000, source: "R", as_of: "2025-01-01" },
        ])
      );

      expect(result.comps[0].id).toBe("comp-0");
      expect(result.comps[1].id).toBe("comp-1");
      expect(result.comps[2].id).toBe("comp-2");
    });

    it("preserves existing IDs when present", () => {
      const result = buildCompsEvidencePack(
        input([
          { id: "custom-id-1", price: 300000, source: "R", as_of: "2025-01-01" },
          { price: 310000, source: "R", as_of: "2025-01-01" }, // no id
          { id: "custom-id-3", price: 320000, source: "R", as_of: "2025-01-01" },
        ])
      );

      expect(result.comps[0].id).toBe("custom-id-1");
      expect(result.comps[1].id).toBe("comp-1"); // Uses array index 1
      expect(result.comps[2].id).toBe("custom-id-3");
    });
  });

  // ===========================================================================
  // PHOTO/MLS EXTRACTION
  // ===========================================================================

  describe("photo and MLS extraction", () => {
    it("extracts photo_url from raw.photo_url", () => {
      const result = buildCompsEvidencePack(
        input([
          minimalComp({
            raw: { photo_url: "https://example.com/photo.jpg" },
          }),
        ])
      );

      expect(result.comps[0].photo_url).toBe("https://example.com/photo.jpg");
    });

    it("falls back to raw.photos[0] when photo_url missing", () => {
      const result = buildCompsEvidencePack(
        input([
          minimalComp({
            raw: { photos: ["https://example.com/first.jpg", "https://example.com/second.jpg"] },
          }),
        ])
      );

      expect(result.comps[0].photo_url).toBe("https://example.com/first.jpg");
    });

    it("extracts mls_number from raw", () => {
      const result = buildCompsEvidencePack(
        input([
          minimalComp({
            raw: { mls_number: "MLS12345" },
          }),
        ])
      );

      expect(result.comps[0].mls_number).toBe("MLS12345");
    });

    it("falls back to raw.listing_id when mls_number missing", () => {
      const result = buildCompsEvidencePack(
        input([
          minimalComp({
            raw: { listing_id: "LISTING-99" },
          }),
        ])
      );

      expect(result.comps[0].mls_number).toBe("LISTING-99");
    });

    it("extracts dom from raw.dom when top-level dom missing", () => {
      const result = buildCompsEvidencePack(
        input([
          minimalComp({
            raw: { dom: 45 },
          }),
        ])
      );

      expect(result.comps[0].dom).toBe(45);
    });
  });
});
