import React from 'react';
import type { Deal, EngineCalculations } from "@ui-v2/types";
import type { Flags } from '../../types';
import { fmt$, num, roundHeadline, getDealHealth } from '../../utils/helpers';
import { GlassCard, Badge, Icon } from '../ui';
import StatCard from './StatCard';
import MarketTempGauge from './MarketTempGauge';
import DealStructureChart from './DealStructureChart';
import { Icons } from '../../constants';
import { DoubleClose } from '../../services/engine';

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
  const minSpread = num(deal.policy?.min_spread, 0);
  const isCashShortfall =
    effectiveHasInput && isFinite(calc.dealSpread) && calc.dealSpread < minSpread;
  const health = getDealHealth(calc.dealSpread, minSpread);
  const urgencyColors: Record<string, 'red' | 'orange' | 'blue' | 'green'> = {
    Emergency: 'red',
    Critical: 'orange',
    High: 'blue',
    Low: 'green',
    '—': 'blue',
  };

  const dcState = deal.costs.double_close;
  const dcCalcs = DoubleClose.computeDoubleClose(dcState, { deal });
  const dcTotalCosts = num(dcCalcs.Extra_Closing_Load) + num(dcCalcs.Carry_Total);

  const wholesaleFee =
    effectiveHasInput && isFinite(calc.buyerCeiling) && isFinite(calc.respectFloorPrice)
      ? calc.buyerCeiling - calc.respectFloorPrice
      : NaN;
  const wholesaleFeeWithDC = isFinite(wholesaleFee) ? wholesaleFee - dcTotalCosts : NaN;

  return (
    <div className="flex flex-col gap-6">
      {isCashShortfall && (
        <div className="card-orange p-3 text-white text-center font-semibold flex items-center justify-center gap-2 text-sm shadow-md shadow-black/20">
          <Icon d={Icons.alert} /> Cash (Shortfall): Offer is below minimum spread of{' '}
          {fmt$(minSpread, 0)}. Deficit: {fmt$(minSpread - calc.dealSpread, 0)}.
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="After-Repair Value (ARV)"
          value={effectiveHasInput ? fmt$(roundHeadline(deal.market.arv)) : '—'}
          icon={<Icon d={Icons.home} size={20} />}
        />
        <StatCard
          label="Buyer Ceiling"
          value={effectiveHasInput ? fmt$(roundHeadline(calc.buyerCeiling)) : '—'}
          icon={<Icon d={Icons.trending} size={20} />}
        />
        <StatCard
          label="Respect Floor"
          value={effectiveHasInput ? fmt$(roundHeadline(calc.respectFloorPrice)) : '—'}
          icon={<Icon d={Icons.shield} size={20} />}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="As-Is Value (AIV)"
          value={effectiveHasInput ? fmt$(roundHeadline(deal.market.as_is_value)) : '—'}
          icon={<Icon d={Icons.shield} size={20} />}
        />
        <StatCard
          label="Wholesale Fee"
          value={effectiveHasInput ? fmt$(roundHeadline(wholesaleFee)) : '—'}
          icon={<Icon d={Icons.dollar} size={20} />}
        />
        <StatCard
          label="Wholesale Fee w/ DC"
          value={effectiveHasInput ? fmt$(roundHeadline(wholesaleFeeWithDC)) : '—'}
          icon={<Icon d={Icons.dollar} size={20} />}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <GlassCard className="p-5 md:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              <div className="lg:col-span-3">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h2 className="text-text-primary text-2xl font-bold tracking-tight flex items-center gap-2">
                    <Icon d={Icons.shield} size={20} className="text-accent-blue" /> Deal Analysis
                  </h2>
                  {effectiveHasInput && isFinite(calc.dealSpread) && (
                    <Badge color={health.color}>{health.label}</Badge>
                  )}
                  {effectiveHasInput && (
                    <Badge color={urgencyColors[calc.urgencyBand]}>
                      {' '}
                      {calc.urgencyBand} {calc.urgencyDays > 0 ? `(${calc.urgencyDays}d)` : ''}{' '}
                    </Badge>
                  )}
                  {effectiveHasInput && !calc.listingAllowed && (
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
                          {isFinite(calc.displayMargin)
                            ? `${(calc.displayMargin * 100).toFixed(1)}%`
                            : '—'}
                        </span>
                      </p>
                      <p>
                        <strong>Contingency:</strong>{' '}
                        <span className="text-text-primary font-mono">
                          {isFinite(calc.displayCont)
                            ? `${(calc.displayCont * 100).toFixed(0)}%`
                            : '—'}
                        </span>
                      </p>
                      <p>
                        <strong>Carry (calc):</strong>{' '}
                        <span className="text-text-primary font-mono">
                          {calc.carryMonths > 0 ? `${calc.carryMonths.toFixed(2)} mos` : '—'}
                        </span>
                      </p>
                      <p>
                        <strong>Assignment Fee (Observed):</strong>{' '}
                        <span className="text-text-primary font-mono">
                          {fmt$(calc.maoFinal - calc.instantCashOffer, 0)}
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
                        {fmt$(calc.totalRepairs, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Carry Costs</span>
                      <span className="font-semibold text-text-primary">
                        {fmt$(calc.carryCosts, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Resale Costs</span>
                      <span className="font-semibold text-text-primary">
                        {fmt$(calc.resaleCosts, 0)}
                      </span>
                    </div>
                    <div className="pt-1 my-1" />
                    <div className="flex justify-between text-brand-red-light">
                      <span>Projected Payoff</span>
                      <span className="font-semibold">{fmt$(calc.projectedPayoffClose, 0)}</span>
                    </div>
                    {deal.property?.occupancy === 'tenant' && (
                      <div className="flex justify-between text-accent-orange-light">
                        <span>Tenant Buffer</span>
                        <span className="font-semibold text-text-primary">
                          {fmt$(calc.tenantBuffer, 0)}
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
          <MarketTempGauge />
        </div>
      </div>
      <DealStructureChart calc={calc} deal={deal} hasUserInput={effectiveHasInput} />
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
        ) : (
          <div
            className="prose prose-invert max-w-none text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: playbookContent }}
          />
        )}
      </GlassCard>
    </div>
  );
};

export default OverviewTab;
