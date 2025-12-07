import React, { useCallback, useState } from "react";
import type { DealStructureView } from "../../lib/overviewExtras";
import { fmt$, num } from "../../utils/helpers";
import { Icons } from "../../constants";
import { GlassCard, Button, Icon } from "../ui";

interface DealStructureChartProps {
  view: DealStructureView;
  hasUserInput: boolean;
}

const DealStructureChart: React.FC<DealStructureChartProps> = ({
  view,
  hasUserInput,
}) => {
  const [copied, setCopied] = useState(false);

  const payoff = num(view.payoff);
  const floor = num(view.respectFloor);
  const offer = num(view.offer);
  const ceiling = num(view.buyerCeiling);
  const asIs = num(view.aiv);
  const arv = num(view.arv);

  const allValues = [payoff, floor, offer, asIs, ceiling, arv].filter((v) =>
    isFinite(v)
  ) as number[];

  const domainMin = allValues.length ? Math.min(...allValues) : 0;
  const domainMax = allValues.length ? Math.max(...allValues) : 1;
  const span =
    isFinite(domainMin) && isFinite(domainMax) && domainMax > domainMin
      ? domainMax - domainMin
      : 1;

  const toPct = (value: number) => {
    if (!isFinite(value) || !allValues.length) return 0;
    return ((value - domainMin) / span) * 100;
  };

  const showBelowFloor =
    isFinite(offer) && isFinite(floor) && offer < floor;
  const belowFloor = showBelowFloor ? floor - offer : 0;

  const negotiationLeft = toPct(floor);
  const negotiationRight = toPct(offer);
  const negotiationWidth = Math.max(0, negotiationRight - negotiationLeft);

  const headroomLeft = toPct(offer);
  const headroomRight = toPct(ceiling);
  const headroomWidth = Math.max(0, headroomRight - headroomLeft);

  const gapToPayoff =
    isFinite(payoff) && isFinite(offer) ? payoff - offer : NaN;
  const window$ =
    isFinite(offer) && isFinite(floor)
      ? Math.max(0, offer - floor)
      : NaN;
  const headroom$ =
    isFinite(ceiling) && isFinite(offer)
      ? Math.max(0, ceiling - offer)
      : NaN;

  const markers = [
    { label: "Payoff", value: payoff, color: "text-brand-red" },
    { label: "Floor", value: floor, color: "text-accent-orange" },
    { label: "Offer", value: offer, color: "text-yellow-300" },
    { label: "As-Is", value: asIs, color: "text-cyan-300" },
    { label: "Ceiling", value: ceiling, color: "text-blue-400" },
    { label: "ARV", value: arv, color: "text-green-400" },
  ]
    .filter((m) => isFinite(m.value))
    .map((m) => ({ ...m, pos: toPct(m.value) }))
    .sort((a, b) => a.pos - b.pos);

  const getStaggerLevel = (index: number) => {
    const level = index % 3;
    return level === 0 ? "-top-20" : level === 1 ? "-top-28" : "-top-12";
  };

  const buildSellerScript = () => {
    const parts: string[] = [];
    parts.push(`Based on today’s data, your payoff is ${fmt$(payoff, 0)}.`);
    parts.push(`Our cash offer pencils at ${fmt$(offer, 0)}.`);

    if (showBelowFloor) {
      parts.push(
        `That’s ${fmt$(belowFloor, 0)} below the respect floor from as-is and local discounts.`
      );
    } else if (isFinite(window$) && isFinite(headroom$)) {
      parts.push(
        `There’s ${fmt$(window$, 0)} of room to the floor and ${fmt$(
          headroom$,
          0
        )} of buyer headroom above our offer.`
      );
    }

    if (isFinite(gapToPayoff) && gapToPayoff > 0) {
      parts.push(
        `We’re short of payoff by ${fmt$(
          gapToPayoff,
          0
        )}; moving the closing earlier (per-diem) or trimming credits/scope helps.`
      );
    } else if (isFinite(gapToPayoff)) {
      parts.push(
        `This clears payoff with ${fmt$(-gapToPayoff, 0)} cushion at close.`
      );
    }

    if (
      (view.urgencyDays ?? Infinity) <= 14 &&
      Number((view as any).seniorPerDiem) > 0 &&
      isFinite(Number((view as any).seniorPerDiem))
    ) {
      parts.push(
        `With the auction so close, every day matters. Closing quickly provides significant per-diem relief for you.`
      );
    }

    return parts.join(" ");
  };

  const sellerScript = buildSellerScript();

  const copyScript = useCallback(async () => {
    if (!sellerScript) return;
    try {
      await navigator.clipboard.writeText(sellerScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  }, [sellerScript]);

  return (
    <GlassCard>
      {copied && (
        <div className="fixed bottom-5 right-5 bg-green-600 text-white px-3 py-2 rounded-md shadow-lg z-50">
          Seller script copied
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-text-primary font-semibold text-lg">
          Deal Structure
        </h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={copyScript}
          className="flex items-center gap-2"
        >
          <Icon d={copied ? Icons.check : Icons.dollar} size={16} />
          {copied ? "Copied!" : "Copy Seller Script"}
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-end gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-brand-red-zone rounded" />
            <span className="text-text-secondary/60">Below Floor</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: "rgba(255, 69, 0, 0.35)" }}
            />
            <span className="text-text-secondary/60">
              Negotiation Window
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-blue-500/30 rounded" />
            <span className="text-text-secondary/60">
              Buyer Headroom
            </span>
          </div>
        </div>

        <div className="relative w-full h-12 rounded-full bg-gradient-to-r from-text-primary/5 via-text-primary/10 to-text-primary/5 shadow-inner overflow-hidden mb-32">
          {/* Below-floor zone */}
          <div
            tabIndex={0}
            className="absolute inset-y-0 left-0 bg-brand-red-zone group cursor-help transition-all duration-300 ease-in-out outline-none"
            style={{ width: `${toPct(floor)}%` }}
          >
            <div className="invisible group-hover:visible group-focus:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-gray-100 text-xs rounded whitespace-nowrap z-50">
              Below Floor
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
            </div>
          </div>

          {/* Negotiation window (Floor → Offer) */}
          <div
            tabIndex={0}
            className="absolute inset-y-0 group cursor-help transition-all duration-300 ease-in-out outline-none"
            style={{
              left: `${negotiationLeft}%`,
              width: `${negotiationWidth}%`,
              backgroundColor: "rgba(255, 69, 0, 0.35)",
            }}
          >
            <div className="invisible group-hover:visible group-focus:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-gray-100 text-xs rounded whitespace-nowrap z-50">
              Negotiation Window: {fmt$(window$, 0)}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
            </div>
          </div>

          {/* Buyer headroom (Offer → Ceiling) */}
          <div
            tabIndex={0}
            className="absolute inset-y-0 bg-blue-500/30 group cursor-help transition-all duration-300 ease-in-out outline-none"
            style={{ left: `${headroomLeft}%`, width: `${headroomWidth}%` }}
          >
            <div className="invisible group-hover:visible group-focus:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-gray-100 text-xs rounded whitespace-nowrap z-50">
              Buyer Headroom: {fmt$(headroom$, 0)}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
            </div>
          </div>

          {/* Markers */}
          {markers.map((m, i) => {
            const isOfferMarker = m.label.toLowerCase().includes("offer");
            const baseChip = "backdrop-blur rounded";
            const chipClass = isOfferMarker
              ? `${baseChip} text-lg font-extrabold px-3 py-1.5 bg-yellow-500/20 border-2 border-yellow-400`
              : `${baseChip} text-sm font-semibold px-2 py-1 bg-gray-900/60`;

            return (
              <div
                key={m.label}
                className={`absolute ${getStaggerLevel(
                  i
                )} -translate-x-1/2 flex flex-col items-center ${m.color} transition-all duration-300 ease-in-out`}
                style={{ left: `${m.pos}%` }}
              >
                <div className={chipClass}>
                  {m.label} · {fmt$(m.value, 0)}
                </div>
                <div className="mt-1 h-10 w-[2px] bg-current rounded-full" />
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="info-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent-orange-subtle flex items-center justify-center flex-shrink-0">
            <Icon d={Icons.trending} size={20} className="text-accent-orange" />
          </div>
          <div className="flex-1">
            <span className="label-xs block mb-0.5">
              Window (Floor→Offer)
            </span>
            <span className="font-semibold text-xl text-text-primary">
              {fmt$(window$, 0)}
            </span>
          </div>
        </div>
        <div className="info-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Icon d={Icons.dollar} size={20} className="text-blue-400" />
          </div>
          <div className="flex-1">
            <span className="label-xs block mb-0.5">
              Headroom (Offer→Ceiling)
            </span>
            <span className="font-semibold text-xl text-text-primary">
              {fmt$(headroom$, 0)}
            </span>
          </div>
        </div>
        <div
          className={`info-card flex items-center gap-3 ${
            isFinite(gapToPayoff) && gapToPayoff > 0 ? "animate-pulse" : ""
          }`}
        >
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              isFinite(gapToPayoff) && gapToPayoff > 0
                ? "bg-accent-orange-subtle"
                : "bg-green-500/20"
            }`}
          >
            <Icon
              d={
                isFinite(gapToPayoff) && gapToPayoff > 0
                  ? Icons.alert
                  : Icons.check
              }
              size={20}
              className={
                isFinite(gapToPayoff) && gapToPayoff > 0
                  ? "text-accent-orange-light"
                  : "text-green-400"
              }
            />
          </div>
          <div className="flex-1">
            <span className="label-xs block mb-0.5">
              {isFinite(gapToPayoff) && gapToPayoff > 0
                ? "Shortfall vs Payoff"
                : "Cushion vs Payoff"}
            </span>
            <span className="font-semibold text-xl text-text-primary">
              {fmt$(
                isFinite(gapToPayoff) ? Math.abs(gapToPayoff) : NaN,
                0
              )}
            </span>
          </div>
        </div>
      </div>

      {hasUserInput && showBelowFloor && (
        <div className="mt-3 card-orange p-2 text-xs text-text-primary text-center font-semibold">
          Offer is {fmt$(belowFloor, 0)} below Respect Floor — use the
          Scenario Modeler to move closing forward or trim credits/scope.
        </div>
      )}
      {!hasUserInput && (
        <p className="muted text-xs text-center mt-3">
          Enter deal data to populate the structure chart.
        </p>
      )}

      <div className="mt-4 pt-4">
        <h4 className="label-xs uppercase mb-2">
          Seller Script (Cash Offer)
        </h4>
        <p className="text-base text-text-secondary/80 bg-black/30 p-3 rounded-md italic">
          "{sellerScript}"
        </p>
      </div>
    </GlassCard>
  );
};

export default DealStructureChart;
