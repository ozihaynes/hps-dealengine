"use client";

import { useCallback, useMemo, useState } from "react";
import { ListTodo } from "lucide-react";
import { Button } from "@/components/ui";
import { useOfferChecklist } from "@/lib/offerChecklist/useOfferChecklist";
import { buildDealFlowGuideVM } from "@/lib/dealflowGuide/guideModel";
import { useDealTaskStates } from "@/lib/dealflowGuide/useDealTaskStates";
import DealFlowGuideSheet from "@/components/dealflowGuide/DealFlowGuideSheet";

export default function DealFlowGuideMount({ dealId }: { dealId: string | null }) {
  const [open, setOpen] = useState(false);
  const [detent, setDetent] = useState<"medium" | "large">("medium");

  const {
    checklist,
    isLoading: checklistLoading,
    error: checklistError,
  } = useOfferChecklist(dealId);

  const {
    byKey,
    isLoading: overridesLoading,
    isSaving,
    error: overridesError,
    setNYA,
    clear,
  } = useDealTaskStates(dealId);

  const vm = useMemo(() => buildDealFlowGuideVM(checklist, byKey), [checklist, byKey]);
  const error = checklistError ? String(checklistError) : overridesError;

  const onToggleNYA = useCallback(
    (taskKey: string) => {
      const existing = byKey.get(taskKey);
      if (existing && existing.override_status === "NOT_YET_AVAILABLE") {
        void clear(taskKey);
        return;
      }
      void setNYA(taskKey);
    },
    [byKey, clear, setNYA],
  );

  return (
    <>
      <div
        className="fixed right-4 z-[55]"
        style={{ bottom: "calc(1rem + env(safe-area-inset-bottom) + 3.5rem)" }}
      >
        <Button
          onClick={() => setOpen((v) => !v)}
          size="sm"
          variant={open ? "secondary" : "primary"}
          disabled={!dealId}
        >
          <ListTodo className="mr-2 h-4 w-4" />
          Guide
        </Button>
      </div>

      <DealFlowGuideSheet
        open={open}
        detent={detent}
        onOpenChange={setOpen}
        onDetentChange={setDetent}
        vm={vm}
        isLoading={checklistLoading || overridesLoading}
        isSaving={isSaving}
        error={error ?? null}
        onToggleNYA={onToggleNYA}
      />
    </>
  );
}
