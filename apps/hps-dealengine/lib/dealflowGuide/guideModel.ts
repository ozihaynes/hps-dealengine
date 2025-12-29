import type { OfferChecklistItemVM, OfferChecklistViewModel } from "@/lib/offerChecklist/derive";
import { OFFER_CHECKLIST_DEFS } from "@/lib/offerChecklist/schema";
import type { DealTaskOverrideStatus, DealTaskStateRow } from "@/lib/dealflowGuide/useDealTaskStates";

export type GuideEffectiveState = "PROVIDED" | "MISSING" | "NYA" | "NA" | "WARN";

export type GuideTaskVM = {
  task_key: string;

  group_id: string;
  group_label: string;

  label: string;
  why_it_matters: string;

  importance_tag: OfferChecklistItemVM["importance_tag"];

  // Canonical derived checklist state (PASS/FAIL/WARN/NA) AFTER legacy adjustments (if any).
  checklist_state: OfferChecklistItemVM["state"];

  // True when this task blocks readiness when unmet.
  is_blocking: boolean;

  // Persisted override (NYA/NA) from public.deal_task_states (may be null).
  override_status: DealTaskOverrideStatus | null;

  // Final state used by DealFlow Guide UI.
  effective_state: GuideEffectiveState;
};

export type DealFlowGuideProgressVM = {
  blockers_done: number;
  blockers_total: number;
  overall_done: number;
  overall_total: number;
};

export type DealFlowGuideVM = {
  tasks: GuideTaskVM[];
  outstanding: GuideTaskVM[];
  next_best: GuideTaskVM | null;

  progress: DealFlowGuideProgressVM;

  // Mirrors the engine-derived readiness signal for determinism.
  can_finalize: boolean;

  // Debug/compat flags (kept small; useful during rollout).
  legacy: {
    noRepairsNeededApplied: boolean;
  };
};

type BuildOptions = {
  legacyNoRepairsNeeded?: boolean;
};

const DEF_BY_ID = new Map<string, { why_it_matters?: string }>(
  OFFER_CHECKLIST_DEFS.map((d) => [d.item_id, d]),
);

// Legacy UI-only override from OfferChecklistPanel.tsx (must not be silently dropped).
const LEGACY_NO_REPAIRS_TASK_KEYS = new Set<string>(["repairs_estimated", "repairs_evidence"]);

function isMustHave(tag: OfferChecklistItemVM["importance_tag"]): boolean {
  return tag === "MUST_HAVE_FOR_READY" || tag === "MUST_HAVE_FOR_MATH";
}

function applyLegacyChecklistAdjustments(
  item: OfferChecklistItemVM,
  opts: BuildOptions | undefined,
): OfferChecklistItemVM {
  if (opts?.legacyNoRepairsNeeded && LEGACY_NO_REPAIRS_TASK_KEYS.has(item.item_id)) {
    // Preserve historical behavior: treat as DONE + non-blocking (PASS), not persisted NA.
    return { ...item, state: "PASS", isBlocking: false };
  }
  return item;
}

function computeEffectiveState(args: {
  base_state: OfferChecklistItemVM["state"];
  override_status: DealTaskOverrideStatus | null;
}): GuideEffectiveState {
  const { base_state, override_status } = args;

  // PASS and NA are canonical terminal states.
  if (base_state === "PASS") return "PROVIDED";
  if (base_state === "NA") return "NA";

  // Overrides apply only when not already PASS/NA.
  if (override_status === "NOT_APPLICABLE") return "NA";
  if (override_status === "NOT_YET_AVAILABLE") return "NYA";

  // Warnings are outstanding but non-blocking.
  if (base_state === "WARN_PLACEHOLDER" || base_state === "WARN_RECOMMENDED") return "WARN";

  return "MISSING";
}

/**
 * Build the DealFlow Guide view model.
 *
 * Deterministic ordering guarantee:
 * - We do NOT sort. We iterate checklist.itemsByGroup in the exact order produced by derive.ts.
 */
export function buildDealFlowGuideVM(
  checklist: OfferChecklistViewModel | null | undefined,
  overridesByKey: Map<string, DealTaskStateRow> | null | undefined,
  opts?: BuildOptions,
): DealFlowGuideVM {
  if (!checklist) {
    return {
      tasks: [],
      outstanding: [],
      next_best: null,
      progress: { blockers_done: 0, blockers_total: 0, overall_done: 0, overall_total: 0 },
      can_finalize: false,
      legacy: { noRepairsNeededApplied: false },
    };
  }

  const overrides = overridesByKey ?? new Map<string, DealTaskStateRow>();
  const tasks: GuideTaskVM[] = [];

  for (const group of checklist.itemsByGroup) {
    for (const rawItem of group.items) {
      const item = applyLegacyChecklistAdjustments(rawItem, opts);

      const override = overrides.get(item.item_id) ?? null;
      const override_status = override?.override_status ?? null;

      const def = DEF_BY_ID.get(item.item_id);
      const why_it_matters = typeof def?.why_it_matters === "string" ? def.why_it_matters : "";

      const effective_state = computeEffectiveState({
        base_state: item.state,
        override_status,
      });

      tasks.push({
        task_key: item.item_id,
        group_id: group.groupId,
        group_label: group.groupLabel,
        label: item.label,
        why_it_matters,
        importance_tag: item.importance_tag,
        checklist_state: item.state,
        is_blocking: item.isBlocking === true,
        override_status,
        effective_state,
      });
    }
  }

  const outstanding = tasks.filter((t) => t.effective_state !== "PROVIDED" && t.effective_state !== "NA");

  // Next best step selection:
  // - Prefer must-have blockers that are not done.
  // - Otherwise pick the first outstanding task.
  const next_best =
    tasks.find((t) => isMustHave(t.importance_tag) && t.effective_state !== "PROVIDED" && t.effective_state !== "NA") ??
    outstanding[0] ??
    null;

  const overallApplicable = tasks.filter((t) => t.effective_state !== "NA");
  const overall_done = overallApplicable.filter((t) => t.effective_state === "PROVIDED").length;
  const overall_total = overallApplicable.length;

  const blockerApplicable = tasks.filter((t) => isMustHave(t.importance_tag) && t.effective_state !== "NA");
  const blockers_done = blockerApplicable.filter((t) => t.effective_state === "PROVIDED").length;
  const blockers_total = blockerApplicable.length;

  // Determinism: do not recompute underwriting readiness here; mirror engine-derived READY.
  const can_finalize = checklist.status === "READY";

  return {
    tasks,
    outstanding,
    next_best,
    progress: { blockers_done, blockers_total, overall_done, overall_total },
    can_finalize,
    legacy: { noRepairsNeededApplied: opts?.legacyNoRepairsNeeded === true },
  };
}

/**
 * Produce an OfferChecklistViewModel with display-only adjustments applied.
 * This enables the Slice 3 "brain transplant" without duplicating legacy logic in the component.
 *
 * Today we apply:
 * - legacyNoRepairsNeeded (repairs tasks => PASS + non-blocking)
 * - NOT_APPLICABLE override => checklist state NA (NYA remains Guide-only for now)
 */
export function applyDealFlowToOfferChecklist(
  checklist: OfferChecklistViewModel,
  overridesByKey: Map<string, DealTaskStateRow> | null | undefined,
  opts?: BuildOptions,
): OfferChecklistViewModel {
  const overrides = overridesByKey ?? new Map<string, DealTaskStateRow>();

  const itemsByGroup = checklist.itemsByGroup.map((group) => {
    const items = group.items.map((raw) => {
      let item = applyLegacyChecklistAdjustments(raw, opts);

      const override = overrides.get(item.item_id) ?? null;
      if (override?.override_status === "NOT_APPLICABLE") {
        item = { ...item, state: "NA", isBlocking: false };
      }

      return item;
    });

    return { ...group, items };
  });

  return { ...checklist, itemsByGroup };
}
