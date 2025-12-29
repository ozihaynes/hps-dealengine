"use client";

import { useCallback, useMemo } from "react";
import { useDealSession } from "@/lib/dealSessionContext";
import { useOfferChecklist } from "@/lib/offerChecklist/useOfferChecklist";
import type { OfferChecklistItemVM, OfferChecklistViewModel } from "@/lib/offerChecklist/derive";
import { buildDealFlowGuideVM } from "@/lib/dealflowGuide/guideModel";
import { useDealTaskStates, type DealTaskOverrideStatus } from "@/lib/dealflowGuide/useDealTaskStates";

export type DealFlowGuideMergedStatus = "PROVIDED" | "MISSING" | "NOT_YET_AVAILABLE" | "NOT_APPLICABLE";

export type DealFlowGuideTaskVM = {
  task_key: string;
  groupId: string;
  groupLabel: string;
  label: string;

  // Canonical checklist derived state
  checklist_state: OfferChecklistItemVM["state"];
  isBlocking: boolean;

  // Override
  override_status: DealTaskOverrideStatus | null;

  // Policy
  na_allowed: boolean;

  // Final merged status for guide UX
  merged_status: DealFlowGuideMergedStatus;
};

export function useDealFlowGuide(dealId: string | null) {
  const { posture } = useDealSession();

  const {
    checklist,
    isLoading: checklistLoading,
    error: checklistError,
  } = useOfferChecklist(dealId);

  const taskStates = useDealTaskStates(dealId, posture);
  const {
    byKey,
    policy,
    isLoading: overridesLoading,
    isSaving,
    error: overridesError,
    list,
    upsert,
    clear,
  } = taskStates;

  // Policy tokens (from latest saved run snapshot, returned by Edge list())
  const enabled = policy?.enabled ?? true;
  const taskRulesByKey = useMemo(() => policy?.taskRulesByKey ?? {}, [policy?.taskRulesByKey]);

  const tasks: DealFlowGuideTaskVM[] = useMemo(() => {
    if (!checklist) return [];

    const vm = checklist as OfferChecklistViewModel;

    const out: DealFlowGuideTaskVM[] = [];

    // IMPORTANT: Deterministic ordering proof:
    // We do NOT sort here. We iterate derive.ts output in-order:
    // - vm.itemsByGroup[] order is canonical
    // - group.items[] order is canonical
    for (const group of vm.itemsByGroup) {
      for (const item of group.items) {
        const override = byKey.get(item.item_id) ?? null;
        const override_status = override?.override_status ?? null;

        const rule = taskRulesByKey[item.item_id] ?? {};
        const na_allowed = rule?.na_allowed === true;

        const merged_status: DealFlowGuideMergedStatus =
          item.state === "PASS"
            ? "PROVIDED"
            : item.state === "NA"
              ? "NOT_APPLICABLE"
              : override_status === "NOT_APPLICABLE"
                ? "NOT_APPLICABLE"
                : override_status === "NOT_YET_AVAILABLE"
                  ? "NOT_YET_AVAILABLE"
                  : "MISSING";

        out.push({
          task_key: item.item_id,
          groupId: group.groupId,
          groupLabel: group.groupLabel,
          label: item.label,
          checklist_state: item.state,
          isBlocking: item.isBlocking === true,
          override_status,
          na_allowed,
          merged_status,
        });
      }
    }

    return out;
  }, [checklist, byKey, taskRulesByKey]);

  const outstandingMissing = useMemo(() => tasks.filter((t) => t.merged_status === "MISSING"), [tasks]);
  const deferredNYA = useMemo(() => tasks.filter((t) => t.merged_status === "NOT_YET_AVAILABLE"), [tasks]);

  const nextBest = useMemo(() => {
    // Next best step is the first unmet blocker in canonical order; else first missing.
    // NOTE: This is selection, not sorting — we preserve canonical order.
    const firstBlocking = tasks.find((t) => t.isBlocking && t.merged_status === "MISSING") ?? null;
    if (firstBlocking) return firstBlocking;
    return tasks.find((t) => t.merged_status === "MISSING") ?? null;
  }, [tasks]);

  const vm = useMemo(
    () => buildDealFlowGuideVM(checklist, byKey),
    [checklist, byKey],
  );

  const setNYA = useCallback(
    async (task_key: string) => {
      await upsert({ task_key, override_status: "NOT_YET_AVAILABLE" });
    },
    [upsert],
  );

  const setNA = useCallback(
    async (task_key: string) => {
      await upsert({ task_key, override_status: "NOT_APPLICABLE" });
    },
    [upsert],
  );

  const clearOverride = useCallback(
    async (task_key: string) => {
      await clear(task_key);
    },
    [clear],
  );

  const onToggleNYA = useCallback(
    async (task_key: string) => {
      const existing = byKey.get(task_key);
      if (existing?.override_status === "NOT_YET_AVAILABLE") {
        await clear(task_key);
        return;
      }
      await upsert({ task_key, override_status: "NOT_YET_AVAILABLE" });
    },
    [byKey, clear, upsert],
  );

  const isLoading = checklistLoading || overridesLoading;
  const error = checklistError ?? overridesError;

  return {
    enabled,
    posture,
    policy,

    checklist,
    checklistLoading,
    checklistError,

    overridesLoading,
    overridesError,
    isLoading,
    isSaving,
    error,

    vm,
    tasks,
    outstandingMissing,
    deferredNYA,
    nextBest,
    onToggleNYA,

    actions: {
      setNYA,
      setNA,
      clearOverride,
      refresh: list,
    },
  };
}
