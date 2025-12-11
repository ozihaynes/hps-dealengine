"use client";

import React, { useMemo, useState } from "react";
import { X, CheckCircle, Circle, AlertCircle, Minus, AlertTriangle } from "lucide-react";
import { useOfferChecklist } from "../../lib/offerChecklist/useOfferChecklist";
import type { OfferChecklistItemVM } from "../../lib/offerChecklist/derive";
import { Button } from "../ui";

type OfferChecklistPanelProps = {
  dealId: string;
  onClose: () => void;
};

export const OfferChecklistPanel: React.FC<OfferChecklistPanelProps> = ({ dealId, onClose }) => {
  const { checklist, isLoading, error, deal, editedFields } = useOfferChecklist(dealId);
  const hasEditedFields = editedFields.size > 0;

  const noRepairsNeeded = Boolean((deal as any)?.meta?.noRepairsNeeded);

  const adjustedGroups = useMemo(() => {
    if (!noRepairsNeeded) return checklist.itemsByGroup;
    return checklist.itemsByGroup.map((group) => ({
      ...group,
      items: group.items.map((item) => {
        if (item.item_id === "repairs_estimated" || item.item_id === "repairs_evidence") {
          return { ...item, state: "PASS" as const, isBlocking: false };
        }
        return item;
      }),
    }));
  }, [checklist.itemsByGroup, noRepairsNeeded]);

  const allItems = adjustedGroups.flatMap((g) => g.items);
  const applicableItems = allItems.filter((i) => i.state !== "NA");
  const completedItems = applicableItems.filter((i) => i.state === "PASS");
  const progress =
    applicableItems.length === 0 ? 0 : (completedItems.length / applicableItems.length) * 100;

  const statusPill =
    checklist.status === "READY"
      ? {
          label: "Offer Ready",
          bg: "#00bf63",
          animate: true,
        }
      : {
          label: "Not Ready",
          bg: "#990000",
          animate: false,
        };

  const dealSubtitle =
    (deal as any)?.address ??
    (deal as any)?.address_line_1 ??
    (deal as any)?.name ??
    "Current deal";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-hidden rounded-2xl bg-[#000f22] shadow-2xl flex flex-col border border-[color:var(--glass-border)]">
        <div className="relative px-6 pt-5 pb-4 border-b border-[color:var(--glass-border)]">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--glass-border)] text-[color:var(--text-secondary)] hover:bg-[color:var(--glass-bg)]"
            aria-label="Close offer checklist"
          >
            <X size={16} />
          </button>

          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-semibold text-white">Offer</h1>
            <div className="text-[12px] uppercase tracking-[0.12em] text-[color:var(--text-secondary)]">
              Checklist • {dealSubtitle}
            </div>
            <span
              className="relative mt-2 inline-flex items-center justify-center rounded-full px-4 py-1 text-[12px] font-semibold text-white"
              style={{
                backgroundColor: statusPill.bg,
                animation: statusPill.animate ? "badge-pulse 2s ease-in-out infinite" : "none",
              }}
            >
              {statusPill.label}
              {statusPill.animate && (
                <span
                  className="absolute inset-0 rounded-full"
                  style={{
                    backgroundColor: statusPill.bg,
                    animation: "badge-ring-pulse 2s ease-in-out infinite",
                  }}
                />
              )}
            </span>
            {checklist.workflowReason && (
              <p className="text-[11px] text-amber-200 mt-1">{checklist.workflowReason}</p>
            )}
          </div>

          {/* Progress */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="font-semibold text-white">Completion Progress</span>
              <span className="font-bold text-xl" style={{ color: "#0096ff" }}>
                {Math.round(progress)}%
              </span>
            </div>
            <div className="relative w-full h-4 rounded-full overflow-hidden" style={{ backgroundColor: "#001a3d" }}>
              <div
                className="h-full transition-all duration-700 ease-out relative"
                style={{
                  width: `${progress}%`,
                  background:
                    progress === 100
                      ? "linear-gradient(90deg, #00bf63 0%, #00ff7f 100%)"
                      : "linear-gradient(90deg, #0096FF 0%, #00d4ff 100%)",
                  boxShadow:
                    progress < 100
                      ? "0 0 20px rgba(0, 150, 255, 0.5)"
                      : "0 0 20px rgba(0, 191, 99, 0.5)",
                }}
              >
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)",
                    animation: "shine 2s infinite",
                  }}
                />
              </div>

              {progress > 0 && progress < 100 && (
                <div
                  className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2"
                  style={{
                    left: `${progress}%`,
                  }}
                >
                  <div
                    className="absolute w-6 h-6 rounded-full -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2"
                    style={{
                      backgroundColor: "#0096FF",
                      opacity: 0.4,
                      animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                    }}
                  />
                  <div
                    className="absolute w-4 h-4 rounded-full -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2"
                    style={{
                      backgroundColor: "#0096FF",
                      opacity: 0.6,
                      animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.5s",
                    }}
                  />
                  <div
                    className="relative w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: "#FFFFFF",
                      boxShadow: "0 0 10px rgba(0, 150, 255, 0.8), 0 0 20px rgba(0, 150, 255, 0.4)",
                    }}
                  />
                </div>
              )}

              {progress === 100 && (
                <div
                  className="absolute top-1/2 right-2 transform -translate-y-1/2"
                  style={{
                    animation: "bounce 1s infinite",
                  }}
                >
                  <CheckCircle className="w-5 h-5" style={{ color: "#FFFFFF" }} />
                </div>
              )}
            </div>

            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        <div className="space-y-2 border-b border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] px-4 py-3">
          {checklist.status === "NOT_COMPUTABLE" && (
            <div className="flex items-start gap-2 rounded-md border border-[color:var(--glass-border)] bg-[#ff4500]/10 px-3 py-2 text-[12px] text-[color:var(--text-primary)]">
              <AlertCircle size={14} className="mt-0.5" style={{ color: "#ff4500" }} />
              <span className="text-[color:var(--text-secondary)]">
                No completed analysis run yet. Run <strong>Analyze</strong> from Underwrite to generate an offer-ready
                checklist.
              </span>
            </div>
          )}

          {hasEditedFields && <StaleRunBanner dealId={dealId} />}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {isLoading && <div className="text-sm text-[color:var(--text-secondary)]">Loading checklist…</div>}

          {error && !isLoading && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
              Failed to load checklist. Please refresh and try again.
            </div>
          )}

          {!isLoading &&
            !error &&
            adjustedGroups.map((group) => {
              if (!group.items.length) return null;
              return (
                <section key={group.groupId} className="space-y-3">
                  <h3 className="text-[13px] font-semibold text-white">{group.groupLabel}</h3>
                  <ul className="space-y-2">
                    {group.items.map((item) => (
                      <ChecklistItemRow key={item.item_id} item={item} />
                    ))}
                  </ul>
                </section>
              );
            })}
        </div>

        <div className="border-t border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] px-6 py-4 space-y-3">
          <div className="flex flex-wrap gap-4 text-[12px] text-gray-300">
            <LegendDot color="#990000" label="Blocking - Required" />
            <LegendDot color="#FF4500" label="Recommended" />
            <LegendDot color="#6B7280" label="N/A - Not Applicable" />
            <LegendDot color="#00bf63" label="Complete" />
          </div>

          {checklist.status === "READY" && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
              <p className="text-[12px] text-emerald-100">This deal is Offer Ready. You can proceed to present.</p>
              <Button size="sm" variant="primary" className="px-4">
                Continue to Offer
              </Button>
            </div>
          )}
        </div>

        <style jsx>{`
          @keyframes pulse {
            0%,
            100% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 0.6;
            }
            50% {
              transform: translate(-50%, -50%) scale(1.8);
              opacity: 0;
            }
          }
          @keyframes shine {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(200%);
            }
          }
          @keyframes bounce {
            0%,
            100% {
              transform: translateY(-50%) scale(1);
            }
            50% {
              transform: translateY(-50%) scale(1.2);
            }
          }
          @keyframes badge-pulse {
            0%,
            100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.05);
            }
          }
          @keyframes badge-ring-pulse {
            0% {
              transform: scale(1);
              opacity: 0.6;
            }
            50% {
              transform: scale(1.3);
              opacity: 0;
            }
            100% {
              transform: scale(1);
              opacity: 0;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

type StaleRunBannerProps = {
  dealId: string;
};

const StaleRunBanner: React.FC<StaleRunBannerProps> = ({ dealId }) => {
  const [dismissed, setDismissed] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  if (dismissed) return null;

  const handleReRun = async () => {
    try {
      setIsRunning(true);
      window.dispatchEvent(new CustomEvent("hps:analyze-now" as any, { detail: { dealId } }));
    } finally {
      setIsRunning(false);
      setDismissed(true);
    }
  };

  const handleDismiss = () => setDismissed(true);

  return (
    <div className="rounded-md border border-[#ff4500]/60 bg-[#ff4500]/10 px-3 py-2 text-[12px]" style={{ color: "#ff4500" }}>
      <div className="flex items-start gap-2">
        <AlertTriangle size={14} className="mt-0.5" style={{ color: "#ff4500" }} />
        <div className="space-y-2">
          <p>
            You&apos;ve changed numbers since your last Analyze run. Checklist status reflects the last completed run,
            not your current edits.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={handleReRun}
              disabled={isRunning}
              className="text-white"
            >
              {isRunning ? "Re-running..." : "Re-run Analyze to refresh checklist"}
            </Button>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-[11px] font-semibold underline-offset-2 hover:underline"
            >
              Review using last run anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

type ChecklistItemRowProps = {
  item: OfferChecklistItemVM;
};

const ChecklistItemRow: React.FC<ChecklistItemRowProps> = ({ item }) => {
  const { state, label, importance_tag, isBlocking, isEditedSinceRun } = item;

  const statusText =
    state === "NA"
      ? "N/A"
      : importance_tag === "MUST_HAVE_FOR_MATH" || importance_tag === "MUST_HAVE_FOR_READY"
        ? "Blocking"
        : "Recommended";

  const { icon, iconClass, textClass, badgeColor } = (() => {
    switch (state) {
      case "PASS":
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          iconClass: "text-emerald-400",
          textClass: "text-gray-400 line-through",
          badgeColor: "#00bf63",
        };
      case "FAIL":
        return {
          icon: isBlocking ? <AlertCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />,
          iconClass: isBlocking ? "text-[#990000]" : "text-gray-400",
          textClass: "text-white",
          badgeColor: isBlocking ? "#990000" : "#6B7280",
        };
      case "WARN_PLACEHOLDER":
      case "WARN_RECOMMENDED":
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          iconClass: "text-[#FF4500]",
          textClass: "text-white",
          badgeColor: "#FF4500",
        };
      case "NA":
      default:
        return {
          icon: <Minus className="w-5 h-5" />,
          iconClass: "text-gray-400",
          textClass: "text-gray-400",
          badgeColor: "#6B7280",
        };
    }
  })();

  const showBadge = state !== "PASS";

  return (
    <li className="flex items-start gap-3 rounded-lg bg-[#00142c] px-3 py-2 text-[12px]">
      <span
        className={`mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--glass-bg)] ${iconClass}`}
      >
        {icon}
      </span>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <span className={`${textClass} text-[13px] font-medium`}>{label}</span>
          <div className="flex items-center gap-2">
            {showBadge && (
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: `${badgeColor}20`, color: badgeColor }}
              >
                {statusText}
              </span>
            )}
            {isEditedSinceRun && (
              <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-100">
                Edited since last run
              </span>
            )}
          </div>
        </div>
      </div>
    </li>
  );
};

export default OfferChecklistPanel;

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}
