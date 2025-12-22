import React from 'react';
import type { Deal, EngineCalculations } from "../../types";
import type { Flags } from '../../types';
import { fmt$, roundHeadline, getDealHealth } from '../../utils/helpers';
import { GlassCard, Badge, Icon, Button } from '../ui';
import StatCard from './StatCard';
import MarketTempGauge from './MarketTempGauge';
import DealStructureChart from './DealStructureChart';
import { Icons } from '../../constants';
import {
  getDealAnalysisView,
  getDealStructureView,
  getMarketTempView,
  getWholesaleFeeView,
  type DealAnalysisView,
  type DealStructureView,
  type MarketTempView,
  type WholesaleFeeView,
} from "../../lib/overviewExtras";
import { useDealSession } from "@/lib/dealSessionContext";
import { askDealNegotiatorGeneratePlaybook } from "@/lib/aiBridge";
import type { AiChatMessage } from "@/lib/ai/types";
import { useAiWindows } from "@/lib/ai/aiWindowsContext";
import DealNegotiatorPanel from "../ai/DealNegotiatorPanel";

interface OverviewTabProps {
  deal: Deal;
  calc: EngineCalculations;
  flags: Flags;
  hasUserInput: boolean;
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  deal,
  calc,
  flags,
  hasUserInput,
}) => {
  const effectiveHasInput = hasUserInput;
  const {
    dbDeal,
    lastRunId,
    negotiationPlaybook,
    negotiatorLogicRowIds,
    setNegotiationPlaybook,
  setNegotiatorMessages,
  setNegotiatorLogicRowIds,
  appendNegotiatorMessage,
  clearNegotiatorThread,
  posture,
  } = useDealSession();
  const { state: aiWindowState, dispatch: aiWindowDispatch } = useAiWindows();
  const negotiatorWindow = aiWindowState.windows.dealNegotiator;
  const [isGeneratingPlaybook, setIsGeneratingPlaybook] = React.useState(false);
  const [negotiatorError, setNegotiatorError] = React.useState<string | null>(null);
  const dealId = dbDeal?.id ?? null;
  const latestRunId = lastRunId;
  const wholesaleFeeView: WholesaleFeeView = getWholesaleFeeView(calc as any, deal);
  const dealAnalysisView: DealAnalysisView = getDealAnalysisView(calc as any, deal);
  const marketTempView: MarketTempView = getMarketTempView(calc as any);
  const dealStructureView: DealStructureView = getDealStructureView(calc as any, deal);
  const minSpread = Number(deal.policy?.min_spread ?? NaN);
  const isCashShortfall =
    effectiveHasInput && isFinite(calc.dealSpread) && isFinite(minSpread) && calc.dealSpread < minSpread;
  const health = getDealHealth(calc.dealSpread, minSpread);
  const urgencyColors: Record<string, 'red' | 'orange' | 'blue' | 'green'> = {
    Emergency: 'red',
    Critical: 'orange',
    High: 'blue',
    Low: 'green',
    '-': 'blue',
  };
  const numberOrNull = (val: number | null | undefined) =>
    typeof val === "number" && Number.isFinite(val) ? val : null;
  const currencyZeroDecimals = (n: number) =>
    n.toLocaleString("en-US", { maximumFractionDigits: 0 });

  const wholesaleFeeValue = effectiveHasInput
    ? numberOrNull(roundHeadline(wholesaleFeeView.wholesaleFee))
    : null;
  const wholesaleFeeWithDcValue = effectiveHasInput
    ? numberOrNull(roundHeadline(wholesaleFeeView.wholesaleFeeWithDc))
    : null;

  const createMessage = React.useCallback(
    (role: "user" | "assistant" | "system", content: string): AiChatMessage => ({
      id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      role,
      content,
      createdAt: new Date().toISOString(),
    }),
    [],
  );

  const handleGeneratePlaybook = React.useCallback(async () => {
    if (!dealId) {
      setNegotiatorError("Deal ID missing. Save the deal before generating a playbook.");
      return;
    }
    if (!latestRunId) {
      setNegotiatorError("No completed run found. Run the analysis first, then generate a playbook.");
      return;
    }
    setIsGeneratingPlaybook(true);
    setNegotiatorError(null);
    clearNegotiatorThread();

    try {
      const result = await askDealNegotiatorGeneratePlaybook({
        dealId,
        runId: latestRunId ?? null,
      });

      setNegotiationPlaybook(result);
      setNegotiatorLogicRowIds(result.logicRowIds ?? []);

      const { sections } = result;
      const lines: string[] = [];
      lines.push("Here is your negotiation playbook for this deal.\n");

      if (sections.anchor) {
        lines.push("**The Anchor**");
        lines.push(sections.anchor.triggerPhrase);
        lines.push("");
        lines.push(sections.anchor.scriptBody);
        if (sections.anchor.followupQuestion) {
          lines.push("");
          lines.push(`Follow-up: ${sections.anchor.followupQuestion}`);
        }
        lines.push("");
      }

      if (sections.script) {
        lines.push("**The Script**");
        lines.push(sections.script.triggerPhrase);
        lines.push("");
        lines.push(sections.script.scriptBody);
        if (sections.script.followupQuestion) {
          lines.push("");
          lines.push(`Follow-up: ${sections.script.followupQuestion}`);
        }
        lines.push("");
      }

      if (sections.pivot) {
        lines.push("**The Pivot**");
        lines.push(sections.pivot.triggerPhrase);
        lines.push("");
        lines.push(sections.pivot.scriptBody);
        if (sections.pivot.followupQuestion) {
          lines.push("");
          lines.push(`Follow-up: ${sections.pivot.followupQuestion}`);
        }
      }

      const firstMessage = createMessage("assistant", lines.join("\n"));
      const secondMessage = createMessage(
        "assistant",
        "If you have any questions or client objections regarding this strategy, let me know!",
      );
      setNegotiatorMessages([firstMessage, secondMessage]);
    } catch (err) {
      console.error("Negotiator playbook generation failed", err);
      setNegotiatorError("Could not generate a playbook. Ensure a run exists, then try again.");
    } finally {
      setIsGeneratingPlaybook(false);
    }
  }, [
    clearNegotiatorThread,
    createMessage,
    dealId,
    latestRunId,
    setNegotiationPlaybook,
    setNegotiatorLogicRowIds,
    setNegotiatorMessages,
  ]);

  const handleOpenNegotiatorWindow = React.useCallback(() => {
    if (!dealId || !negotiationPlaybook) return;

    if (negotiatorWindow.visibility === "closed") {
      aiWindowDispatch({
        type: "START_NEW_SESSION",
        id: "dealNegotiator",
        sessionId: crypto.randomUUID(),
        context: { dealId, orgId: dbDeal?.org_id, runId: latestRunId ?? undefined, posture },
      });
      aiWindowDispatch({ type: "OPEN_WINDOW", id: "dealNegotiator" });
    } else if (negotiatorWindow.visibility === "minimized") {
      aiWindowDispatch({ type: "OPEN_WINDOW", id: "dealNegotiator" });
    } else {
      aiWindowDispatch({ type: "MINIMIZE_WINDOW", id: "dealNegotiator" });
    }
  }, [aiWindowDispatch, dealId, negotiatorWindow.visibility]);

  return (
    <div className="flex flex-col gap-6">
      {isCashShortfall && (
        <div className="card-orange p-3 text-white text-center font-semibold flex items-center justify-center gap-2 text-sm shadow-md shadow-black/20">
          <Icon d={Icons.alert} /> Cash (Shortfall): Offer is below minimum spread of{' '}
          {fmt$(minSpread, 0)}. Deficit: {fmt$(minSpread - calc.dealSpread, 0)}.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          label="Wholesale Fee"
          value={wholesaleFeeValue}
          prefix="$"
          format={currencyZeroDecimals}
          icon={<Icon d={Icons.dollar} size={20} />}
        />
        <StatCard
          label="Wholesale Fee w/ DC"
          value={wholesaleFeeWithDcValue}
          prefix="$"
          format={currencyZeroDecimals}
          icon={<Icon d={Icons.dollar} size={20} />}
        />
      </div>

      {/* Deal Analysis - presenter-backed snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <GlassCard className="p-5 md:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              <div className="lg:col-span-3">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h2 className="text-text-primary text-2xl font-bold tracking-tight flex items-center gap-2">
                    <Icon d={Icons.shield} size={20} className="text-accent-blue" /> Deal Analysis
                  </h2>
                  {effectiveHasInput && (
                    <Badge color={health.color}>{dealAnalysisView.healthLabel}</Badge>
                  )}
                  {effectiveHasInput && dealAnalysisView.urgencyLabel && (
                    <Badge color={urgencyColors[calc.urgencyBand]}>
                      {' '}
                      {dealAnalysisView.urgencyLabel}{' '}
                      {dealAnalysisView.urgencyDays && dealAnalysisView.urgencyDays > 0
                        ? `(${dealAnalysisView.urgencyDays}d)`
                        : ''}{' '}
                    </Badge>
                  )}
                  {effectiveHasInput && !dealAnalysisView.listingAllowed && (
                    <Badge color="red">Listing Blocked</Badge>
                  )}
                </div>
                <div className="info-card border border-white/5">
                  <h4 className="label-xs uppercase mb-2 flex items-center gap-2 text-text-secondary">
                    <Icon d={Icons.lightbulb} size={16} /> Key Data
                  </h4>
                  {effectiveHasInput ? (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-text-secondary/80">
                      <p>
                        <strong>Buyer Margin:</strong>{' '}
                        <span className="text-text-primary font-mono">
                          {dealAnalysisView.buyerMarginPct != null
                            ? `${(dealAnalysisView.buyerMarginPct * 100).toFixed(1)}%`
                            : '-'}
                        </span>
                      </p>
                      <p>
                        <strong>Contingency:</strong>{' '}
                        <span className="text-text-primary font-mono">
                          {dealAnalysisView.contingencyPct != null
                            ? `${(dealAnalysisView.contingencyPct * 100).toFixed(0)}%`
                            : '-'}
                        </span>
                      </p>
                      <p>
                        <strong>Carry (calc):</strong>{' '}
                        <span className="text-text-primary font-mono">
                          {dealAnalysisView.carryMonths != null
                            ? `${dealAnalysisView.carryMonths.toFixed(2)} mos`
                            : '-'}
                        </span>
                      </p>
                      <p>
                        <strong>Assignment Fee (Observed):</strong>{' '}
                        <span className="text-text-primary font-mono">
                          {fmt$(dealAnalysisView.assignmentObserved ?? NaN, 0)}
                        </span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-text-secondary">
                      Click 'Analyze with AI' to populate key data.
                    </p>
                  )}
                </div>
              </div>
              <div className="lg:col-span-2 info-card space-y-2">
                <h4 className="label-xs uppercase text-center">Cost & Debt Snapshot</h4>
                {effectiveHasInput ? (
                  <div className="space-y-1.5 text-base">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Repairs + Cont.</span>
                      <span className="font-semibold text-text-primary">
                        {fmt$(dealAnalysisView.totalRepairs ?? NaN, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Carry Costs</span>
                      <span className="font-semibold text-text-primary">
                        {fmt$(dealAnalysisView.carryCosts ?? NaN, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Resale Costs</span>
                      <span className="font-semibold text-text-primary">
                        {fmt$(dealAnalysisView.resaleCosts ?? NaN, 0)}
                      </span>
                    </div>
                    <div className="pt-1 my-1" />
                    <div className="flex justify-between text-brand-red-light">
                      <span>Projected Payoff</span>
                      <span className="font-semibold">
                        {fmt$(dealAnalysisView.projectedPayoff ?? NaN, 0)}
                      </span>
                    </div>
                    {dealAnalysisView.showTenantBuffer && (
                      <div className="flex justify-between text-accent-orange-light">
                        <span>Tenant Buffer</span>
                        <span className="font-semibold text-text-primary">
                          {fmt$(dealAnalysisView.tenantBuffer ?? NaN, 0)}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-center text-text-secondary">Awaiting analysis...</p>
                )}
              </div>
            </div>
          </GlassCard>
        </div>
        <div>
          <MarketTempGauge view={marketTempView} />
        </div>
      </div>
      <DealStructureChart view={dealStructureView} hasUserInput={effectiveHasInput} />
      <GlassCard className="p-5 md:p-6 flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-text-primary font-semibold text-lg flex items-center gap-2">
              <Icon d={Icons.playbook} size={18} className="text-accent-blue" /> Negotiator
            </h3>
            <p className="text-sm text-text-secondary">
              Pre-emptive objection handling and talk tracks grounded in the Negotiation Matrix.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleGeneratePlaybook}
              disabled={isGeneratingPlaybook || !dealId}
            >
              {isGeneratingPlaybook ? "Generating..." : "Generate Playbook"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenNegotiatorWindow}
              disabled={!dealId || !negotiationPlaybook}
            >
              Open in window
            </Button>
          </div>
        </div>

        {negotiatorError && (
          <div className="rounded-md border border-brand-red-subtle bg-brand-red-subtle/20 px-3 py-2 text-sm text-brand-red-light">
            {negotiatorError}
          </div>
        )}
        <DealNegotiatorPanel inline />
      </GlassCard>
    </div>
  );
};

export default OverviewTab;
