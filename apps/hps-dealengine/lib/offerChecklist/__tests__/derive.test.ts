import { describe, it, expect } from "vitest";
import { deriveOfferChecklist, type OfferChecklistContext } from "../../offerChecklist/derive";

// NOTE: Adjust this to the real AnalyzeRun type when wiring to engine types.
type TestAnalyzeRun = any;

function makeContext(
  run: TestAnalyzeRun | null,
  overrides?: Partial<OfferChecklistContext<TestAnalyzeRun>>,
): OfferChecklistContext<TestAnalyzeRun> {
  return {
    run,
    scenario: "flip",
    editedFieldsSinceRun: new Set<string>(),
    ...(overrides ?? {}),
  };
}

describe("deriveOfferChecklist", () => {
  it("marks status NOT_COMPUTABLE when run is null", () => {
    const vm = deriveOfferChecklist(makeContext(null));
    expect(vm.status).toBe("NOT_COMPUTABLE");
  });

  it("derives NOT_READY when workflow_state is NeedsInfo / NeedsReview", () => {
    const run: TestAnalyzeRun = {
      workflow_state: "NeedsInfo",
      output: {},
      policy_snapshot: {},
    };
    const vm = deriveOfferChecklist(makeContext(run));
    expect(vm.status).toBe("NOT_READY");
  });

  it("derives READY when workflow_state is ReadyForOffer", () => {
    const run: TestAnalyzeRun = {
      workflow_state: "ReadyForOffer",
      output: {},
      policy_snapshot: {},
    };
    const vm = deriveOfferChecklist(makeContext(run));
    expect(vm.status).toBe("READY");
  });

  it("flags valuation_arv_provided as FAIL when ARV is missing", () => {
    const run: TestAnalyzeRun = {
      workflow_state: "NotComputable",
      output: {},
      policy_snapshot: {},
    };
    const vm = deriveOfferChecklist(makeContext(run));
    const arvItem = vm.itemsByGroup
      .flatMap((g) => g.items)
      .find((i) => i.item_id === "valuation_arv_provided");

    expect(arvItem).toBeDefined();
    expect(arvItem?.state).toBe("FAIL");
  });

  it("sets isEditedSinceRun when edited fields contain an item field", () => {
    const run: TestAnalyzeRun = {
      workflow_state: "ReadyForOffer",
      output: {
        arvEstimate: 250000,
      },
      policy_snapshot: {},
    };

    const ctx = makeContext(run, {
      editedFieldsSinceRun: new Set<string>(["arvEstimate"]),
    });

    const vm = deriveOfferChecklist(ctx);
    const arvItem = vm.itemsByGroup
      .flatMap((g) => g.items)
      .find((i) => i.item_id === "valuation_arv_provided");

    expect(arvItem).toBeDefined();
    expect(arvItem?.isEditedSinceRun).toBe(true);
  });
});
