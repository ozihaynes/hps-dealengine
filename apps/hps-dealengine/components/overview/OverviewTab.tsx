import React from 'react';
import type { Deal, EngineCalculations } from "../../types";
import type { Flags } from '../../types';
import { fmt$, roundHeadline, getDealHealth } from '../../utils/helpers';
import { GlassCard, Badge, Icon } from '../ui';
import StatCard from './StatCard';
import MarketTempGauge from './MarketTempGauge';
import DealStructureChart from './DealStructureChart';
import { Icons } from '../../constants';
import {
  getDealAnalysisView,
  getDealStructureView,
  getMarketTempView,
  getNegotiationContextView,
  getWholesaleFeeView,
  type DealAnalysisView,
  type DealStructureView,
  type MarketTempView,
  type NegotiationContextView,
  type WholesaleFeeView,
} from "../../lib/overviewExtras";

interface OverviewTabProps {
  deal: Deal;
  calc: EngineCalculations;
  flags: Flags;
  hasUserInput: boolean;
  playbookContent: string;
  isAnalyzing: boolean;
  analysisRun: boolean;
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  deal,
  calc,
  flags,
  hasUserInput,
  playbookContent,
  isAnalyzing,
  analysisRun,
}) => {
  const effectiveHasInput = hasUserInput && analysisRun;
  const wholesaleFeeView: WholesaleFeeView = getWholesaleFeeView(calc as any, deal);
  const dealAnalysisView: DealAnalysisView = getDealAnalysisView(calc as any, deal);
  const marketTempView: MarketTempView = getMarketTempView(calc as any);
  const dealStructureView: DealStructureView = getDealStructureView(calc as any, deal);
  const negotiationView: NegotiationContextView = getNegotiationContextView(calc as any, deal);
  const minSpread = Number(deal.policy?.min_spread ?? NaN);
  const isCashShortfall =
    effectiveHasInput && isFinite(calc.dealSpread) && isFinite(minSpread) && calc.dealSpread < minSpread;
  const health = getDealHealth(calc.dealSpread, minSpread);
  const urgencyColors: Record<string, 'red' | 'orange' | 'blue' | 'green'> = {
    Emergency: 'red',
    Critical: 'orange',
    High: 'blue',
    Low: 'green',
    '—': 'blue',
  };

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
          value={effectiveHasInput ? fmt$(roundHeadline(wholesaleFeeView.wholesaleFee)) : '—'}
          icon={<Icon d={Icons.dollar} size={20} />}
        />
        <StatCard
          label="Wholesale Fee w/ DC"
          value={effectiveHasInput ? fmt$(roundHeadline(wholesaleFeeView.wholesaleFeeWithDc)) : '—'}
          icon={<Icon d={Icons.dollar} size={20} />}
        />
      </div>

      {/* Deal Analysis — presenter-backed snapshot */}
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
                            : '—'}
                        </span>
                      </p>
                      <p>
                        <strong>Contingency:</strong>{' '}
                        <span className="text-text-primary font-mono">
                          {dealAnalysisView.contingencyPct != null
                            ? `${(dealAnalysisView.contingencyPct * 100).toFixed(0)}%`
                            : '—'}
                        </span>
                      </p>
                      <p>
                        <strong>Carry (calc):</strong>{' '}
                        <span className="text-text-primary font-mono">
                          {dealAnalysisView.carryMonths != null
                            ? `${dealAnalysisView.carryMonths.toFixed(2)} mos`
                            : '—'}
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
      <GlassCard className="p-5 md:p-6">
        <h3 className="text-text-primary font-semibold text-lg mb-3 flex items-center gap-2">
          <Icon d={Icons.playbook} size={18} className="text-accent-blue" /> Negotiation Playbook
        </h3>
        {isAnalyzing ? (
          <div className="text-center p-8">
            <p className="animate-pulse text-text-secondary font-semibold">
              Generating AI Playbook...
            </p>
          </div>
        ) : !analysisRun ? (
          <p className="muted text-base">
            Enter deal data and click 'Analyze with AI' to generate negotiation points.
          </p>
        ) : playbookContent ? (
          <div
            className="prose prose-invert max-w-none text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: playbookContent }}
          />
        ) : (
          <div className="prose prose-invert max-w-none text-sm leading-relaxed space-y-2">
            <p>
              Spread status: {negotiationView.spreadStatus} (policy min {fmt$(negotiationView.minSpread ?? NaN, 0)}),
              DTM {negotiationView.dtm ?? '—'} days, urgency {negotiationView.urgencyLabel}.
            </p>
            <ul className="list-disc pl-4">
              <li>Floor {fmt$(negotiationView.respectFloor ?? NaN, 0)} vs Buyer Ceiling {fmt$(negotiationView.buyerCeiling ?? NaN, 0)}</li>
              <li>MAO {fmt$(negotiationView.mao ?? NaN, 0)}; Payoff {fmt$(negotiationView.payoff ?? NaN, 0)}</li>
              <li>Risk: {String(negotiationView.riskOverall ?? 'unknown')}; Evidence: {negotiationView.evidenceStatus ?? 'unknown'}</li>
            </ul>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default OverviewTab;
