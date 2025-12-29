import type { OfferChecklistViewModel, OfferChecklistItemVM } from "@/lib/offerChecklist/derive";
import type { ImportanceTag } from "@/lib/offerChecklist/schema";

export type DealTaskOverrideStatus = "NOT_YET_AVAILABLE" | "NOT_APPLICABLE";

export interface DealTaskStateRow {
  deal_id: string;
  task_key: string;
  override_status: DealTaskOverrideStatus;
  note: string | null;
  expected_by: string | null;
  created_at: string;
  updated_at: string;
}

export type GuideEffectiveState = "PROVIDED" | "NA" | "NYA" | "MISSING" | "WARN";

export interface GuideTaskVM {
  task_key: string;
  group_id: string;
  label: string;
  why_it_matters: string;
  importance_tag: ImportanceTag;
  checklist_state: OfferChecklistItemVM["state"];
  effective_state: GuideEffectiveState;
  is_blocking: boolean;
  is_deferred: boolean;
}

export interface DealFlowGuideVM {
  next_best: GuideTaskVM | null;
  outstanding: GuideTaskVM[];
  progress: {
    blockers_done: number;
    blockers_total: number;
    overall_done: number;
    overall_total: number;
  };
  can_finalize: boolean;
}

const MUST_TAGS: ReadonlySet<ImportanceTag> = new Set([
  "MUST_HAVE_FOR_MATH",
  "MUST_HAVE_FOR_READY",
]);

function baseEffectiveState(item: OfferChecklistItemVM): GuideEffectiveState {
  if (item.state === "PASS") return "PROVIDED";
  if (item.state === "NA") return "NA";
  if (item.state.startsWith("WARN")) return "WARN";
  return "MISSING";
}

function applyOverride(
  base: GuideEffectiveState,
  override: DealTaskStateRow | undefined,
): GuideEffectiveState {
  if (!override) return base;
  if (override.override_status === "NOT_YET_AVAILABLE") return "NYA";
  if (override.override_status === "NOT_APPLICABLE") return "NA";
  return base;
}

export function buildDealFlowGuideVM(
  checklist: OfferChecklistViewModel | null | undefined,
  overridesByKey: Map<string, DealTaskStateRow> | null | undefined,
): DealFlowGuideVM {
  if (!checklist) {
    return {
      next_best: null,
      outstanding: [],
      progress: { blockers_done: 0, blockers_total: 0, overall_done: 0, overall_total: 0 },
      can_finalize: false,
    };
  }

  const overrides = overridesByKey ?? new Map<string, DealTaskStateRow>();
  const flattened: GuideTaskVM[] = [];

  for (const group of checklist.itemsByGroup) {
    for (const item of group.items) {
      const base = baseEffectiveState(item);
      const override = overrides.get(item.item_id);
      const effective = applyOverride(base, override);

      const isMust = MUST_TAGS.has(item.importance_tag);
      const isDone = effective === "PROVIDED" || effective === "NA";
      const isBlocking = isMust && !isDone;

      flattened.push({
        task_key: item.item_id,
        group_id: group.groupId,
        label: item.label,
        why_it_matters: item.why_it_matters,
        importance_tag: item.importance_tag,
        checklist_state: item.state,
        effective_state: effective,
        is_blocking: isBlocking,
        is_deferred: effective === "NYA",
      });
    }
  }

  const outstanding = flattened.filter(
    (t) => t.effective_state === "MISSING" || t.effective_state === "WARN" || t.effective_state === "NYA",
  );

  const blockers_total = flattened.filter(
    (t) => MUST_TAGS.has(t.importance_tag) && t.effective_state !== "NA",
  ).length;
  const blockers_done = flattened.filter(
    (t) => MUST_TAGS.has(t.importance_tag) && (t.effective_state === "PROVIDED" || t.effective_state === "NA"),
  ).length;

  const overall_total = flattened.filter((t) => t.effective_state !== "NA").length;
  const overall_done = flattened.filter(
    (t) => t.effective_state === "PROVIDED" || t.effective_state === "NA",
  ).length;

  const next_best = outstanding.find((t) => t.is_blocking) ?? outstanding[0] ?? null;

  const can_finalize =
    checklist.status === "READY" && outstanding.every((t) => !t.is_blocking);

  return {
    next_best,
    outstanding,
    progress: { blockers_done, blockers_total, overall_done, overall_total },
    can_finalize,
  };
}
