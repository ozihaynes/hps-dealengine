import React, { useMemo } from 'react';
import type { Deal, EngineCalculations, EstimatorItem, EstimatorState } from '../../types';
import { fmt$, num } from '../../utils/helpers';
import { estimatorSections, Icons } from '../../constants';
import { GlassCard, Button, Icon, SelectField } from '../ui';

// Sub-component: RatesMetaBar
const RatesMetaBar = ({ asOf = '2025-10-18' }) => (
  <div className="info-card flex items-center justify-between mb-2">
    <div className="label-xs">
      Repair unit rates — last update: <strong className="text-text-primary/90">{asOf}</strong>
    </div>
    <div className="text-xs text-text-secondary/80">
      Sources: Homewyse (Oct 2025), plus current national guides.
    </div>
  </div>
);

// Sub-component: QuickEstimate
const QuickEstimate = ({
  deal,
  setDealValue,
}: {
  deal: Deal;
  setDealValue: (path: string, value: any) => void;
}) => {
  const [rehabLevel, setRehabLevel] = React.useState('none');
  const [big5, setBig5] = React.useState({
    roof: false,
    hvac: false,
    repipe: false,
    electrical: false,
    foundation: false,
  });

  const quickEstimateTotal = useMemo(() => {
    const sqft = Math.max(0, num(deal.cma.subject.sqft));
    const psfRates = { none: 0, light: 25, medium: 40, heavy: 60 };
    const big5Rates = { roof: 6, hvac: 6, repipe: 5, electrical: 5.5, foundation: 15 };

    let total = sqft * (psfRates[rehabLevel as keyof typeof psfRates] ?? 0);
    for (const item in big5) {
      if (big5[item as keyof typeof big5]) {
        total += (big5Rates[item as keyof typeof big5] || 0) * sqft;
      }
    }
    return total;
  }, [rehabLevel, big5, deal.cma.subject.sqft]);

  const toggle = (k: keyof typeof big5) => setBig5((prev) => ({ ...prev, [k]: !prev[k] }));

  return (
    <GlassCard>
      <h3 className="text-lg font-bold text-text-primary mb-2">Quick Estimate Calculator</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectField
          label="Rehab Level (PSF Tiers)"
          value={rehabLevel}
          onChange={(e) => setRehabLevel(e.target.value)}
        >
          <option value="none">None ($0/sqft)</option>
          <option value="light">Light Cosmetic ($25/sqft)</option>
          <option value="medium">Medium / Full Rehab ($40/sqft)</option>
          <option value="heavy">Heavy Rehab ($60+/sqft)</option>
        </SelectField>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            "Big 5" Budget Killers
          </label>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 info-card p-2">
            {Object.keys(big5).map((item) => (
              <label
                key={item}
                className="flex items-center gap-2 text-sm capitalize text-text-secondary"
              >
                <input
                  type="checkbox"
                  checked={big5[item as keyof typeof big5]}
                  onChange={() => toggle(item as keyof typeof big5)}
                  className="h-4 w-4 rounded bg-accent-blue/40 border-accent-blue/50 text-accent-blue focus:ring-accent-blue"
                />
                {item}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 p-3 info-card flex items-center justify-between">
        <div>
          <div className="label-xs">Quick Estimate Total</div>
          <div className="text-xl font-bold">{fmt$(quickEstimateTotal, 0)}</div>
        </div>
        <Button size="sm" onClick={() => setDealValue('costs.repairs_base', quickEstimateTotal)}>
          Apply as Repair Budget
        </Button>
      </div>
    </GlassCard>
  );
};

// Sub-component: EstimatorRow
interface EstimatorRowProps {
  itemKey: string;
  item: EstimatorItem;
  value: any;
  quantity: number;
  onValueChange: (itemKey: string, field: string, value: any) => void;
  onQuantityChange: (itemKey: string, value: number) => void;
}
const EstimatorRow: React.FC<EstimatorRowProps> = ({
  itemKey,
  item,
  value,
  quantity,
  onValueChange,
  onQuantityChange,
}) => {
  const currentCondition = value?.condition || Object.keys(item.options)[0];
  const currentCost = value?.cost ?? item.options[currentCondition] ?? 0;
  const currentNotes = value?.notes || '';

  const handleOptionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    const cost = item.options[selected];
    onValueChange(itemKey, 'condition', selected);
    onValueChange(itemKey, 'cost', cost);
  };

  return (
    <tr>
      <td className="p-2 font-semibold">{item.label}</td>
      <td className="p-2">
        <select value={currentCondition} onChange={handleOptionChange} className="dark-select">
          {Object.keys(item.options).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </td>
      <td className="p-2">
        <input
          type="text"
          value={currentNotes}
          onChange={(e) => onValueChange(itemKey, 'notes', e.target.value)}
          placeholder="Specifics..."
          className="dark-input"
        />
      </td>
      <td className="p-2">
        <div className="flex items-center justify-end gap-2">
          {item.isPerUnit ? (
            <input
              type="number"
              min="0"
              value={quantity ?? 0}
              onChange={(e) => onQuantityChange(itemKey, num(e.target.value))}
              className="w-16 text-right dark-input"
              placeholder="0"
            />
          ) : (
            <span className="muted text-right w-full block pr-2">—</span>
          )}
          {item.unitName ? (
            <span className="text-xs muted w-14 text-left">{item.unitName}</span>
          ) : null}
        </div>
      </td>
      <td className="p-2">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-sm text-text-primary/40">
            $
          </span>
          <input
            type="number"
            value={currentCost}
            onChange={(e) => onValueChange(itemKey, 'cost', Math.max(0, num(e.target.value)))}
            className="dark-input prefixed text-right font-semibold"
            placeholder={item.isPerUnit ? 'Unit $' : 'Total $'}
          />
        </div>
      </td>
    </tr>
  );
};

// Sub-component: EstimatorSection
interface EstimatorSectionProps {
  sectionKey: string;
  section: any;
  costs: any;
  quantities: any;
  onCostChange: (sectionKey: string, itemKey: string, field: string, value: any) => void;
  onQuantityChange: (itemKey: string, value: number) => void;
}
const EstimatorSection: React.FC<EstimatorSectionProps> = ({
  sectionKey,
  section,
  costs,
  quantities,
  onCostChange,
  onQuantityChange,
}) => {
  return (
    <GlassCard>
      <h3 className="text-base font-bold text-text-primary mb-2">{section.title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left p-2 label-xs">Item</th>
              <th className="text-left p-2 label-xs w-1/4">Condition / Tier</th>
              <th className="text-left p-2 label-xs w-1/5">Notes</th>
              <th className="text-right p-2 label-xs w-[120px]">Qty</th>
              <th className="text-right p-2 label-xs w-1/5">Unit Cost</th>
            </tr>
          </thead>
          <tbody>
            {costs &&
              Object.keys(section.items).map((itemKey) => (
                <EstimatorRow
                  key={itemKey}
                  itemKey={itemKey}
                  item={section.items[itemKey]}
                  value={costs[itemKey]}
                  quantity={quantities[itemKey]}
                  onValueChange={(...args) => onCostChange(sectionKey, ...args)}
                  onQuantityChange={onQuantityChange}
                />
              ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
};

interface RepairsTabProps {
  deal: Deal;
  setDealValue: (path: string, value: any) => void;
  calc: EngineCalculations;
  estimatorState: EstimatorState;
  onCostChange: (sectionKey: string, itemKey: string, field: string, value: any) => void;
  onQuantityChange: (itemKey: string, value: number) => void;
  onReset: () => void;
}

const RepairsTab: React.FC<RepairsTabProps> = ({
  deal,
  setDealValue,
  calc,
  estimatorState,
  onCostChange,
  onQuantityChange,
  onReset,
}) => {
  const { costs, quantities } = estimatorState;
  const ratesAsOf = '2025-10-18';

  const sectionTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    Object.keys(estimatorSections).forEach((sectionKey) => {
      // FIX: Changed reduce function to avoid destructuring in arguments, fixing type inference.
      // FIX: Explicitly typed `value` to `any` to resolve incorrect `unknown` type inference from Object.entries.
      totals[sectionKey] = Object.entries(costs[sectionKey] || {}).reduce((acc, entry) => {
        const itemKey = entry[0];
        const value: any = entry[1];
        const item =
          estimatorSections[sectionKey as keyof typeof estimatorSections].items[
            itemKey as keyof (typeof estimatorSections)[keyof typeof estimatorSections]['items']
          ];
        const q = item.isPerUnit ? (quantities[itemKey] ?? 0) : 1;
        return acc + num(value.cost) * q;
      }, 0);
    });
    return totals;
  }, [costs, quantities]);

  // FIX: Explicitly typing the accumulator and value in the reduce function ensures correct type inference, preventing the "Operator '+' cannot be applied to types 'unknown' and 'number'" error.
  const totalRepairCost = useMemo(
    () => Object.values(sectionTotals).reduce((acc: number, n: unknown) => acc + num(n), 0),
    [sectionTotals]
  );

  return (
    <div className="space-y-4 repairs-scope">
      <RatesMetaBar asOf={ratesAsOf} />
      <QuickEstimate deal={deal} setDealValue={setDealValue} />
      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <Icon d={Icons.wrench} size={18} className="text-accent-blue" /> Detailed Repairs
            Estimator
          </h2>
          <Button size="sm" variant="ghost" onClick={onReset}>
            Reset Detailed
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.keys(estimatorSections).map((key) => (
            <div key={key} className="info-card">
              <div className="flex items-center gap-2 label-xs mb-0.5">
                <Icon
                  d={
                    Icons[
                      estimatorSections[key as keyof typeof estimatorSections]
                        .icon as keyof typeof Icons
                    ]
                  }
                  size={14}
                  className="text-accent-blue"
                />
                <span>{estimatorSections[key as keyof typeof estimatorSections].title}</span>
              </div>
              <div className="text-base font-semibold">{fmt$(sectionTotals[key], 0)}</div>
            </div>
          ))}
          <div className="highlight-card col-span-2 md:col-span-4 flex justify-between items-center">
            <div className="text-sm text-text-secondary font-bold">DETAILED REPAIR SUBTOTAL</div>
            <div className="text-lg font-extrabold">{fmt$(totalRepairCost, 0)}</div>
          </div>
        </div>
        <div className="mt-3 text-xs text-text-secondary/80">
          Contingency auto-sets from risk. Final Repairs w/ Contingency:{' '}
          <span className="font-bold text-text-primary">
            {fmt$(calc.repairs_with_contingency, 0)}
          </span>
        </div>
      </GlassCard>
      {Object.keys(estimatorSections).map((sectionKey) => (
        <EstimatorSection
          key={sectionKey}
          sectionKey={sectionKey}
          section={estimatorSections[sectionKey as keyof typeof estimatorSections]}
          costs={estimatorState.costs[sectionKey]}
          quantities={quantities}
          onCostChange={onCostChange}
          onQuantityChange={onQuantityChange}
        />
      ))}
    </div>
  );
};

export default RepairsTab;
