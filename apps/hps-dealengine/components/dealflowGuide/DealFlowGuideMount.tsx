"use client";

import { useMemo, useState } from "react";
import { ListTodo } from "lucide-react";
import { Button } from "@/components/ui";
import DealFlowGuideSheet from "@/components/dealflowGuide/DealFlowGuideSheet";
import { useDealFlowGuide } from "@/lib/dealflowGuide/useDealFlowGuide";

export default function DealFlowGuideMount(props: { dealId: string | null }) {
  const { dealId } = props;
  const [open, setOpen] = useState(false);
  const [detent, setDetent] = useState<"medium" | "large">("medium");

  const guide = useDealFlowGuide(dealId);

  const isEnabled = useMemo(() => {
    // Default true for backward-compat with Slice 1 if policy token is absent.
    // When policy explicitly disables it, hide.
    return guide.enabled === true;
  }, [guide.enabled]);

  if (!dealId || !isEnabled) return null;

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
        vm={guide.vm}
        isLoading={guide.isLoading}
        isSaving={guide.isSaving}
        error={guide.error ?? null}
        onToggleNYA={guide.onToggleNYA}
      />
    </>
  );
}
