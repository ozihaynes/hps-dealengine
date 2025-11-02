// @ts-nocheck
import React from 'react';
import type { Deal, EngineCalculations, Flags } from '../../types';
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
}

const OverviewTab: React.FC<OverviewTabProps> = ({ deal, calc, flags, hasUserInput }) => {
  const minSpread = num(deal.policy?.min_spread, 0);
  const isCashShortfall = hasUserInput && isFinite(calc.dealSpread) && calc.dealSpread < minSpread;
  const health = getDealHealth(calc.dealSpread, minSpread);
  const urgencyColors: Record<string, 'red' | 'orange' | 'blue' | 'green'> = {
    Emergency: 'red',
    Critical: 'orange',
    High: 'blue',
    Low: 'green',
    '—': 'blue',
  };

  const playbookPoints = [
    !calc.listingAllowed &&
      'Property is currently uninsurable or has system failures, blocking a retail listing.',
    Number(deal?.debt?.senior_per_diem) > 0 &&
      calc.urgencyDays <= 30 &&
      `Seller burns ${fmt$(deal.debt.senior_per_diem)}/day — emphasize speed.`,
    deal?.property?.occupancy === 'tenant' &&
      `Tenant occupancy adds risk/delay — buffer of ${fmt$(calc.tenantBuffer, 0)} applied.`,
  ].filter(Boolean);

  const dcState = deal.costs.double_close;
  const dcCalcs = DoubleClose.computeDoubleClose(dcState, { deal });
  const dcTotalCosts = num(dcCalcs.Extra_Closing_Load) + num(dcCalcs.Carry_Total);

  const wholesaleFee =
    isFinite(calc.buyerCeiling) && isFinite(calc.respectFloorPrice)
      ? calc.buyerCeiling - calc.respectFloorPrice
      : NaN;
  const wholesaleFeeWithDC = isFinite(wholesaleFee) ? wholesaleFee - dcTotalCosts : NaN;

  return (
    <div className="space-y-6">
      {isCashShortfall && (
        <div className="card-orange p-3 text-white text-center font-semibold flex items-center justify-center gap-2 text-sm">
          <Icon d={Icons.alert} /> Cash (Shortfall): Offer is below minimum spread of{' '}
          {fmt$(minSpread, 0)}. Deficit: {fmt$(minSpread - calc.dealSpread, 0)}.
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="After-Repair Value (ARV)"
          value={fmt$(roundHeadline(deal.market.arv))}
          icon={<Icon d={Icons.home} size={20} />}
        />
        <StatCard
          label="Buyer Ceiling"
          value={fmt$(roundHeadline(calc.buyerCeiling))}
          icon={<Icon d={Icons.trending} size={20} />}
        />
        <StatCard
          label="Respect Floor"
          value={fmt$(roundHeadline(calc.respectFloorPrice))}
          icon={<Icon d={Icons.shield} size={20} />}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="As-Is Value (AIV)"
          value={fmt$(roundHeadline(deal.market.as_is_value))}
          icon={<Icon d={Icons.shield} size={20} />}
        />
        <StatCard
          label="Wholesale Fee"
          value={fmt$(roundHeadline(wholesaleFee))}
          icon={<Icon d={Icons.dollar} size={20} />}
        />
        <StatCard
          label="Wholesale Fee w/ DC"
          value={fmt$(roundHeadline(wholesaleFeeWithDC))}
          icon={<Icon d={Icons.dollar} size={20} />}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <GlassCard>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              <div className="lg:col-span-3">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h2 className="text-text-primary text-2xl font-bold tracking-tight flex items-center gap-2">
                    <Icon d={Icons.shield} size={20} className="text-accent-blue" /> Deal Analysis
                  </h2>
                  {isFinite(calc.dealSpread) && <Badge color={health.color}>{health.label}</Badge>}
                  <Badge color={urgencyColors[calc.urgencyBand]}>
                    {' '}
                    {calc.urgencyBand} {calc.urgencyDays > 0 ? `(${calc.urgencyDays}d)` : ''}{' '}
                  </Badge>
                  {!calc.listingAllowed && <Badge color="red">Listing Blocked</Badge>}
                </div>
                <div className="info-card">
                  <h4 className="label-xs uppercase mb-2 flex items-center gap-2">
                    <Icon d={Icons.lightbulb} size={16} /> Key Data
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-base text-text-secondary/80">
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
                </div>
              </div>
              <div className="lg:col-span-2 info-card space-y-2">
                <h4 className="label-xs uppercase text-center">Cost & Debt Snapshot</h4>
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
              </div>
            </div>
          </GlassCard>
        </div>
        <div>
          <MarketTempGauge />
        </div>
      </div>
      <DealStructureChart calc={calc} deal={deal} hasUserInput={hasUserInput} />
      <GlassCard>
        <h3 className="text-text-primary font-semibold text-lg mb-2 flex items-center gap-2">
          <Icon d={Icons.playbook} size={18} className="text-accent-blue" /> Negotiation Playbook
        </h3>
        {playbookPoints.length > 0 && hasUserInput ? (
          <ul className="space-y-2 text-base text-text-secondary/80 list-disc pl-5">
            {playbookPoints.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        ) : (
          <p className="muted text-base">Enter deal data to generate negotiation points.</p>
        )}
      </GlassCard>
    </div>
  );
};

export default OverviewTab;
