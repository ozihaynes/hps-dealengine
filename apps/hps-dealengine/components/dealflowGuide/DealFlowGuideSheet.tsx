"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useDragControls } from "framer-motion";
import type { PanInfo } from "framer-motion";
import { ChevronDown, ChevronUp, ListTodo, X } from "lucide-react";
import { Button } from "@/components/ui";
import type { DealFlowGuideVM, GuideTaskVM } from "@/lib/dealflowGuide/guideModel";

type Detent = "medium" | "large";

export interface DealFlowGuideSheetProps {
  open: boolean;
  detent: Detent;
  onOpenChange: (open: boolean) => void;
  onDetentChange: (detent: Detent) => void;

  vm: DealFlowGuideVM;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  onToggleNYA: (taskKey: string) => void;
}

type SheetPositions = {
  sheetHeightPx: number;
  yLarge: number;
  yMedium: number;
  yHidden: number;
  closeOffset: number;
  expandOffset: number;
  flingVelocity: number;
};

function computePositions(): SheetPositions {
  const h = typeof window === "undefined" ? 800 : window.innerHeight;
  const sheetHeightPx = Math.round(h * 0.9);
  const yLarge = 0;
  const yMedium = Math.round(sheetHeightPx - h * 0.4);
  const yHidden = sheetHeightPx + 24;

  const closeOffset = Math.round(h * 0.14);
  const expandOffset = Math.round(h * 0.12);
  const flingVelocity = 900;

  return { sheetHeightPx, yLarge, yMedium, yHidden, closeOffset, expandOffset, flingVelocity };
}

function taskBadge(t: GuideTaskVM): { text: string; className: string } {
  if (t.effective_state === "PROVIDED") return { text: "Done", className: "bg-emerald-500/15 text-emerald-200" };
  if (t.effective_state === "NA") return { text: "N/A", className: "bg-slate-500/15 text-slate-200" };
  if (t.effective_state === "NYA") return { text: "NYA", className: "bg-amber-500/15 text-amber-200" };
  if (t.effective_state === "WARN") return { text: "Warn", className: "bg-yellow-500/15 text-yellow-100" };
  return { text: "Missing", className: "bg-rose-500/15 text-rose-200" };
}

export default function DealFlowGuideSheet(props: DealFlowGuideSheetProps) {
  const { open, detent, onOpenChange, onDetentChange, vm, isLoading, isSaving, error, onToggleNYA } = props;

  const dragControls = useDragControls();
  const [pos, setPos] = useState<SheetPositions>(() => computePositions());

  useEffect(() => {
    const onResize = () => setPos(computePositions());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const animateKey: "hidden" | "medium" | "large" = !open ? "hidden" : detent;

  const variants = useMemo(
    () => ({
      hidden: { y: pos.yHidden },
      medium: { y: pos.yMedium },
      large: { y: pos.yLarge },
    }),
    [pos.yHidden, pos.yMedium, pos.yLarge],
  );

  const transition = useMemo(
    () => ({
      type: "spring" as const,
      damping: 45,
      stiffness: 520,
      mass: 1,
    }),
    [],
  );

  const onDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!open) return;

    const offsetY = info.offset.y;
    const velocityY = info.velocity.y;

    if (velocityY > pos.flingVelocity) {
      onOpenChange(false);
      onDetentChange("medium");
      return;
    }

    if (velocityY < -pos.flingVelocity) {
      onDetentChange("large");
      return;
    }

    if (detent === "large") {
      if (offsetY > pos.closeOffset) {
        onDetentChange("medium");
      }
      return;
    }

    if (offsetY < -pos.expandOffset) {
      onDetentChange("large");
      return;
    }
    if (offsetY > pos.closeOffset) {
      onOpenChange(false);
      onDetentChange("medium");
    }
  };

  const next = vm.next_best;

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none">
      <motion.div
        role="dialog"
        aria-label="DealFlow Guide"
        aria-modal="false"
        className="pointer-events-auto mx-auto w-full max-w-[720px] rounded-t-2xl border border-white/10 bg-[#0B1220]/85 backdrop-blur-xl shadow-2xl"
        style={{
          height: pos.sheetHeightPx,
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
        }}
        variants={variants}
        animate={animateKey}
        initial={false}
        transition={transition}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: pos.yLarge, bottom: pos.yHidden }}
        dragElastic={0.06}
        onDragEnd={onDragEnd}
      >
        <div
          className="px-4 pt-3 pb-2"
          style={{ touchAction: "none" }}
          onPointerDown={(e) => dragControls.start(e)}
        >
          <div className="mx-auto h-1.5 w-12 rounded-full bg-white/20" />
        </div>

        <div className="flex items-start justify-between gap-3 px-4 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <ListTodo className="h-4 w-4 text-white/80" />
              <h2 className="text-sm font-semibold text-white">DealFlow Guide</h2>
            </div>
            <div className="mt-1 text-xs text-white/60">
              {vm.can_finalize ? "Underwriting ready (no blockers)" : "Not ready - blockers remain"}
              {" · "}
              {vm.progress.blockers_done}/{vm.progress.blockers_total} blockers
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSaving ? (
              <span className="text-xs text-white/60">Saving...</span>
            ) : (
              <span className="text-xs text-white/40"> </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              aria-label="Close DealFlow Guide"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 pb-3">
          <div className="text-xs text-white/60">
            {open ? (detent === "large" ? "Expanded" : "Peek") : "Closed"}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDetentChange(detent === "large" ? "medium" : "large")}
            aria-label={detent === "large" ? "Collapse guide" : "Expand guide"}
          >
            {detent === "large" ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
            <span className="ml-1 text-xs">
              {detent === "large" ? "Collapse" : "Expand"}
            </span>
          </Button>
        </div>

        <div className="h-[calc(100%-136px)] overflow-y-auto px-4 pb-6">
          {error ? (
            <div className="mb-3 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          <div className="mb-3 rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs font-semibold text-white/80">Next best step</div>

            <div className="mt-2 min-h-[64px]">
              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-4 w-2/3 rounded bg-white/10" />
                  <div className="h-3 w-1/2 rounded bg-white/10" />
                </div>
              ) : next ? (
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">{next.label}</div>
                      <div className="mt-1 text-xs text-white/60">{next.why_it_matters}</div>
                    </div>

                    <span className={"shrink-0 rounded-full px-2 py-1 text-[11px] " + taskBadge(next).className}>
                      {taskBadge(next).text}
                    </span>
                  </div>

                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant={next.effective_state === "NYA" ? "secondary" : "ghost"}
                      onClick={() => onToggleNYA(next.task_key)}
                    >
                      {next.effective_state === "NYA" ? "Clear NYA" : "Mark NYA"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-white/70">No outstanding tasks.</div>
              )}
            </div>
          </div>

          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold text-white/80">Outstanding</div>
            <div className="text-xs text-white/60">{vm.outstanding.length} tasks</div>
          </div>

          <motion.ul layout className="space-y-2">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="h-4 w-2/3 rounded bg-white/10" />
                  <div className="mt-2 h-3 w-1/2 rounded bg-white/10" />
                </li>
              ))
            ) : (
              vm.outstanding.map((t) => {
                const badge = taskBadge(t);
                return (
                  <motion.li
                    layout
                    key={t.task_key}
                    className="rounded-xl border border-white/10 bg-white/5 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-white">{t.label}</div>
                          {t.is_blocking ? (
                            <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] text-rose-200">
                              Blocker
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-xs text-white/60">{t.why_it_matters}</div>
                      </div>

                      <span className={"shrink-0 rounded-full px-2 py-1 text-[11px] " + badge.className}>
                        {badge.text}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={t.effective_state === "NYA" ? "secondary" : "ghost"}
                        onClick={() => onToggleNYA(t.task_key)}
                      >
                        {t.effective_state === "NYA" ? "Clear NYA" : "Mark NYA"}
                      </Button>

                      <div className="text-xs text-white/50">
                        key: <span className="font-mono">{t.task_key}</span>
                      </div>
                    </div>
                  </motion.li>
                );
              })
            )}
          </motion.ul>

          <div className="mt-4 text-xs text-white/50">
            Slice 2 note: NOT_APPLICABLE is policy-gated; NYA is persisted and auditable.
          </div>
        </div>
      </motion.div>
    </div>
  );
}
