'use client';
// @ts-nocheck
import React from 'react';
import type { Deal, EngineCalculations, SandboxSettings } from '../../types';
import {
  GlassCard,
  Button,
  InputField,
  SelectField,
  ToggleSwitch,
  NestedTabs,
  NestedTabsList,
  NestedTabsTrigger,
  NestedTabsContent,
} from '../ui';
import ScenarioModeler from './ScenarioModeler';
import DoubleCloseCalculator from './DoubleCloseCalculator';
import { num, fmt$ } from '../../utils/helpers';

interface UnderwriteTabProps {
  deal: Deal;
  calc: EngineCalculations;
  setDealValue: (path: string, value: any) => void;
  sandbox: SandboxSettings;
}

const FieldGroup: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div className="space-y-3 p-8 info-card">
    <h4 className="label-xs uppercase tracking-wider text-accent-blue/80 pb-2 mb-3">{title}</h4>
    {children}
  </div>
);

const UnderwriteTab: React.FC<UnderwriteTabProps> = ({ deal, calc, setDealValue, sandbox }) => {
  const addJuniorLien = () => {
    const newLien = { id: Date.now(), type: 'Judgment', balance: '', per_diem: '', good_thru: '' };
    setDealValue('debt.juniors', [...(deal.debt.juniors || []), newLien]);
  };

  const updateJuniorLien = (index: number, field: string, value: any) => {
    const updatedJuniors = [...(deal.debt.juniors || [])];
    if (!updatedJuniors[index]) updatedJuniors[index] = {};
    updatedJuniors[index][field] = value;
    setDealValue('debt.juniors', updatedJuniors);
  };

  const removeJuniorLien = (index: number) => {
    setDealValue(
      'debt.juniors',
      (deal.debt.juniors || []).filter((_: any, i: number) => i !== index)
    );
  };

  const arvWarning =
    num(deal.market.arv) > 0 &&
    num(deal.market.as_is_value) > 0 &&
    num(deal.market.arv) < num(deal.market.as_is_value)
      ? 'ARV is less than As-Is Value. This is unusual and may indicate a data entry error.'
      : null;

  const getMinSpreadPlaceholder = () => {
    const arv = num(deal.market.arv, 0);
    const bands: any[] = sandbox.minSpreadByArvBand || [];
    const applicableBand = bands.find((b) => arv <= b.maxArv) || bands[bands.length - 1];
    if (!applicableBand) return 'Policy Default';
    return `${fmt$(applicableBand.minSpread, 0)} (Policy)`;
  };

  const commissionItems: any[] = sandbox.listingCostModelSellerCostLineItems || [];
  const commissionDefault = commissionItems.find((i) => i.item === 'Commissions')?.defaultPct || 6;
  const concessionsDefault =
    commissionItems.find((i) => i.item === 'Seller Concessions')?.defaultPct || 2;
  const sellCloseDefault =
    commissionItems.find((i) => i.item === 'Title & Stamps')?.defaultPct || 1.5;

  return (
    <GlassCard>
      <h2 className="text-lg font-bold text-text-primary mb-4">Underwrite Deal</h2>
      <NestedTabs initialTab="market">
        <NestedTabsList className="pb-3 mb-3">
          <NestedTabsTrigger value="market">Market & Valuation</NestedTabsTrigger>
          <NestedTabsTrigger value="property">Property & Risk</NestedTabsTrigger>
          <NestedTabsTrigger value="debt">Debt & Liens</NestedTabsTrigger>
          <NestedTabsTrigger value="policy">Policy & Fees</NestedTabsTrigger>
          <NestedTabsTrigger value="timeline_legal">Timeline & Legal</NestedTabsTrigger>
          <NestedTabsTrigger value="scenarios">Scenarios</NestedTabsTrigger>
          <NestedTabsTrigger value="double_close">HPS Double Closing Cost</NestedTabsTrigger>
        </NestedTabsList>
        <div className="relative min-h-[700px]">
          <NestedTabsContent value="market">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              <InputField
                label="ARV"
                type="number"
                prefix="$"
                value={deal.market.arv}
                onChange={(e) => setDealValue('market.arv', e.target.value)}
                warning={arvWarning}
              />
              <InputField
                label="As-Is Value"
                type="number"
                prefix="$"
                value={deal.market.as_is_value}
                onChange={(e) => setDealValue('market.as_is_value', e.target.value)}
                warning={arvWarning}
              />
              <InputField
                label="DOM (Zip)"
                type="number"
                suffix="days"
                value={deal.market.dom_zip}
                onChange={(e) => setDealValue('market.dom_zip', e.target.value)}
              />
              <InputField
                label="MOI (Zip)"
                type="number"
                suffix="mos"
                value={deal.market.moi_zip}
                onChange={(e) => setDealValue('market.moi_zip', e.target.value)}
              />
              <InputField
                label="Price-to-List %"
                type="number"
                suffix="%"
                value={(deal.market['price-to-list-pct'] ?? 0) * 100}
                onChange={(e) => setDealValue('market.price-to-list-pct', e.target.value)}
              />
              <InputField
                label="Local Discount (20th %)"
                type="number"
                suffix="%"
                value={(deal.market.local_discount_20th_pct ?? 0) * 100}
                onChange={(e) => setDealValue('market.local_discount_20th_pct', e.target.value)}
              />
            </div>
          </NestedTabsContent>
          <NestedTabsContent value="property">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <div className="space-y-3">
                <SelectField
                  label="Occupancy"
                  value={deal.property.occupancy}
                  onChange={(e) => setDealValue('property.occupancy', e.target.value)}
                >
                  <option value="owner">Owner</option>
                  <option value="tenant">Tenant</option>
                  <option value="vacant">Vacant</option>
                </SelectField>
                <SelectField
                  label="Insurance Bindability"
                  value={deal.status.insurability}
                  onChange={(e) => setDealValue('status.insurability', e.target.value)}
                >
                  <option value="bindable">Bindable</option>
                  <option value="conditional">Conditional</option>
                  <option value="unbindable">Unbindable</option>
                </SelectField>
                <InputField
                  label="County"
                  value={deal.property.county}
                  onChange={(e) => setDealValue('property.county', e.target.value)}
                />
              </div>
              <div className="info-card space-y-3 p-4">
                <ToggleSwitch
                  label="No Interior Access"
                  checked={deal.confidence.no_access_flag}
                  onChange={() =>
                    setDealValue('confidence.no_access_flag', !deal.confidence.no_access_flag)
                  }
                />
                <ToggleSwitch
                  label="Structural/Permit/WDO Risk"
                  checked={deal.status.structural_or_permit_risk_flag}
                  onChange={() =>
                    setDealValue(
                      'status.structural_or_permit_risk_flag',
                      !deal.status.structural_or_permit_risk_flag
                    )
                  }
                />
                <ToggleSwitch
                  label="Old Roof (>20 years)"
                  checked={deal.property.old_roof_flag}
                  onChange={() =>
                    setDealValue('property.old_roof_flag', !deal.property.old_roof_flag)
                  }
                />
              </div>
              <div className="info-card space-y-3 p-4">
                <ToggleSwitch
                  label="Major System Failure"
                  checked={deal.status.major_system_failure_flag}
                  onChange={() =>
                    setDealValue(
                      'status.major_system_failure_flag',
                      !deal.status.major_system_failure_flag
                    )
                  }
                />
                <ToggleSwitch
                  label="Reinstatement Proof"
                  checked={deal.confidence.reinstatement_proof_flag}
                  onChange={() =>
                    setDealValue(
                      'confidence.reinstatement_proof_flag',
                      !deal.confidence.reinstatement_proof_flag
                    )
                  }
                />
                <ToggleSwitch
                  label="Homestead Status"
                  checked={deal.property.is_homestead}
                  onChange={() =>
                    setDealValue('property.is_homestead', !deal.property.is_homestead)
                  }
                />
              </div>
            </div>
          </NestedTabsContent>
          <NestedTabsContent value="debt">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 mt-3">
              <FieldGroup title="Senior Lien Payoff">
                <div className="grid grid-cols-2 gap-3 items-end">
                  <InputField
                    label="Senior Principal"
                    type="number"
                    prefix="$"
                    value={deal.debt.senior_principal}
                    onChange={(e) => setDealValue('debt.senior_principal', e.target.value)}
                  />
                  <InputField
                    label="Senior Per Diem"
                    type="number"
                    prefix="$"
                    min="0"
                    value={deal.debt.senior_per_diem}
                    onChange={(e) => setDealValue('debt.senior_per_diem', e.target.value)}
                  />
                  <InputField
                    label="Payoff Good-Thru"
                    type="date"
                    value={deal.debt.good_thru_date}
                    onChange={(e) => setDealValue('debt.good_thru_date', e.target.value)}
                  />
                  <ToggleSwitch
                    label="Payoff Confirmed"
                    checked={deal.debt.payoff_is_confirmed}
                    onChange={() =>
                      setDealValue('debt.payoff_is_confirmed', !deal.debt.payoff_is_confirmed)
                    }
                  />
                  <InputField
                    label="Protective Advances"
                    type="number"
                    prefix="$"
                    min="0"
                    value={deal.debt.protective_advances}
                    onChange={(e) => setDealValue('debt.protective_advances', e.target.value)}
                  />
                </div>
              </FieldGroup>
              <FieldGroup title="Other Encumbrances & Title">
                <div className="grid grid-cols-2 gap-3 items-end">
                  <InputField
                    label="Title Cure Cost"
                    type="number"
                    prefix="$"
                    min="0"
                    value={deal.title.cure_cost}
                    onChange={(e) => setDealValue('title.cure_cost', e.target.value)}
                  />
                  <InputField
                    label="Title Risk %"
                    type="number"
                    suffix="%"
                    min="0"
                    max="3"
                    value={(deal.title.risk_pct || 0) * 100}
                    onChange={(e) => setDealValue('title.risk_pct', e.target.value)}
                  />
                  <InputField
                    label="HOA Estoppel Fee"
                    type="number"
                    prefix="$"
                    min="0"
                    value={deal.debt.hoa_estoppel_fee}
                    onChange={(e) => setDealValue('debt.hoa_estoppel_fee', e.target.value)}
                  />
                </div>
              </FieldGroup>
            </div>
            <div className="mt-4 pt-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="label-xs uppercase tracking-wider text-accent-blue/80">
                  Junior Liens
                </h4>
                <Button size="sm" variant="neutral" onClick={addJuniorLien}>
                  + Add Lien
                </Button>
              </div>
              <div className="space-y-2">
                {(deal.debt.juniors || []).map((lien, index) => (
                  <div
                    key={lien.id || index}
                    className="info-card grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 items-end"
                  >
                    <InputField
                      label="Type"
                      placeholder="HELOC, etc"
                      value={lien.type || ''}
                      onChange={(e) => updateJuniorLien(index, 'type', e.target.value)}
                    />
                    <InputField
                      label="Balance"
                      type="number"
                      prefix="$"
                      value={lien.balance}
                      onChange={(e) => updateJuniorLien(index, 'balance', e.target.value)}
                    />
                    <InputField
                      label="Per Diem"
                      type="number"
                      prefix="$"
                      value={lien.per_diem}
                      onChange={(e) => updateJuniorLien(index, 'per_diem', e.target.value)}
                    />
                    <InputField
                      label="Good-Thru"
                      type="date"
                      value={lien.good_thru || ''}
                      onChange={(e) => updateJuniorLien(index, 'good_thru', e.target.value)}
                    />
                    <Button
                      size="sm"
                      variant="danger"
                      className="h-[38px] w-full"
                      onClick={() => removeJuniorLien(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </NestedTabsContent>
          <NestedTabsContent value="policy">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              <InputField
                label="Assignment Fee Target"
                type="number"
                prefix="$"
                value={deal.policy.assignment_fee_target}
                onChange={(e) => setDealValue('policy.assignment_fee_target', e.target.value)}
                placeholder="Optional"
              />
              <InputField
                label="List Commission Override %"
                type="number"
                suffix="%"
                value={
                  deal.costs.list_commission_pct != null ? deal.costs.list_commission_pct * 100 : ''
                }
                onChange={(e) =>
                  setDealValue(
                    'costs.list_commission_pct',
                    e.target.value === '' ? null : parseFloat(e.target.value) / 100
                  )
                }
                placeholder={`${commissionDefault}% (Policy)`}
              />
              <InputField
                label="Sell Close Costs %"
                type="number"
                suffix="%"
                value={(deal.costs.sell_close_pct ?? 0) * 100}
                onChange={(e) =>
                  setDealValue('costs.sell_close_pct', parseFloat(e.target.value) / 100)
                }
                min="0"
                max="30"
                step="0.1"
                placeholder={`${sellCloseDefault}% (Policy)`}
              />
              <InputField
                label="Seller Concessions %"
                type="number"
                suffix="%"
                value={(deal.costs.concessions_pct ?? 0) * 100}
                onChange={(e) =>
                  setDealValue('costs.concessions_pct', parseFloat(e.target.value) / 100)
                }
                min="0"
                max="30"
                step="0.1"
                placeholder={`${concessionsDefault}% (Policy)`}
              />
              <InputField
                label="Safety Margin on AIV %"
                type="number"
                suffix="%"
                value={(deal.policy.safety_on_aiv_pct ?? 0) * 100}
                onChange={(e) =>
                  setDealValue('policy.safety_on_aiv_pct', parseFloat(e.target.value) / 100)
                }
                min="0"
                max="10"
                step="0.1"
                placeholder={`${sandbox.aivSafetyCapPercentage || 3}% (Policy)`}
              />
              <InputField
                label="Min Spread"
                type="number"
                prefix="$"
                value={deal.policy.min_spread}
                onChange={(e) => setDealValue('policy.min_spread', e.target.value)}
                placeholder={getMinSpreadPlaceholder()}
              />
              <InputField
                label="Monthly Interest"
                type="number"
                prefix="$"
                min="0"
                value={deal.costs.monthly.interest}
                onChange={(e) => setDealValue('costs.monthly.interest', e.target.value)}
              />
              <ToggleSwitch
                label="Costs Are Annual"
                checked={deal.policy.costs_are_annual}
                onChange={() =>
                  setDealValue('policy.costs_are_annual', !deal.policy.costs_are_annual)
                }
              />
            </div>
          </NestedTabsContent>
          <NestedTabsContent value="timeline_legal">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 items-end">
              <div className="pt-4 md:col-span-2">
                <ToggleSwitch
                  label="Foreclosure Sale (Certificate of Title Issued)"
                  checked={deal.property.is_foreclosure_sale}
                  onChange={() =>
                    setDealValue('property.is_foreclosure_sale', !deal.property.is_foreclosure_sale)
                  }
                />
              </div>
              <div className="pt-4 md:col-span-2">
                <ToggleSwitch
                  label="10-Day Redemption Period Applies"
                  checked={deal.property.is_redemption_period_sale}
                  onChange={() =>
                    setDealValue(
                      'property.is_redemption_period_sale',
                      !deal.property.is_redemption_period_sale
                    )
                  }
                />
              </div>
              <InputField
                label="Case No."
                value={deal.legal.case_no}
                onChange={(e) => setDealValue('legal.case_no', e.target.value)}
              />
              <InputField
                label="Auction Date"
                type="date"
                value={deal.timeline.auction_date}
                onChange={(e) => setDealValue('timeline.auction_date', e.target.value)}
              />
              <InputField
                label="Planned Close"
                type="number"
                suffix="days"
                value={deal.policy.planned_close_days}
                onChange={(e) => setDealValue('policy.planned_close_days', e.target.value)}
              />
              <InputField
                label="Manual Days to Money"
                placeholder="Overrides auto-calc"
                type="number"
                suffix="days"
                min="0"
                value={deal.policy.manual_days_to_money ?? ''}
                onChange={(e) =>
                  setDealValue(
                    'policy.manual_days_to_money',
                    e.target.value === '' ? null : e.target.value
                  )
                }
              />
            </div>
          </NestedTabsContent>
          <NestedTabsContent value="scenarios">
            <ScenarioModeler
              deal={deal}
              setDealValue={setDealValue}
              sandbox={sandbox}
              calc={calc}
            />
          </NestedTabsContent>
          <NestedTabsContent value="double_close">
            <DoubleCloseCalculator deal={deal} calc={calc} setDealValue={setDealValue} />
          </NestedTabsContent>
        </div>
      </NestedTabs>
    </GlassCard>
  );
};

export default UnderwriteTab;
