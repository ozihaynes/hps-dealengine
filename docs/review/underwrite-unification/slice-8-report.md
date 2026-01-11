# Slice 8 Report: Convert Scenario/Calculator + Final

## Completed
- [x] Located Scenario Modeler section (line 1788)
- [x] Located Calculator section (line 1793)
- [x] Added Lightbulb and Calculator icons from lucide-react
- [x] Converted Scenario Modeler to SectionAccordion
- [x] Converted Calculator to SectionAccordion
- [x] Removed unused UnderwritingSection component
- [x] Verified all 11 sections converted
- [x] TypeScript: PASS
- [x] Build: PASS

## Files Modified
| File | Changes |
|------|---------|
| `components/underwrite/UnderwriteTab.tsx` | Converted final 2 sections, removed UnderwritingSection |

## Icon Import Final
```typescript
import { Clock, Sliders, CreditCard, Shield, TrendingUp, Lightbulb, Calculator } from 'lucide-react';
```

## Conversion Details

### Scenario Modeler (Before)
```typescript
<UnderwritingSection title="Scenario Modeler" icon={Icons.lightbulb}>
  <ScenarioModeler deal={deal} setDealValue={setDealValue} sandbox={sandbox} calc={calc} />
</UnderwritingSection>
```

### Scenario Modeler (After)
```typescript
<SectionAccordion
  id="scenario-modeler"
  title="Scenario Modeler"
  icon={<Lightbulb className="w-5 h-5" />}
  isExpanded={accordion.isExpanded('scenario-modeler')}
  onToggle={() => accordion.toggle('scenario-modeler')}
>
  <ScenarioModeler deal={deal} setDealValue={setDealValue} sandbox={sandbox} calc={calc} />
</SectionAccordion>
```

### Calculator (Before)
```typescript
<UnderwritingSection title="HPS Double Closing Cost Calculator" icon={Icons.calculator}>
  <DoubleCloseCalculator deal={deal} calc={calc} setDealValue={setDealValue} />
</UnderwritingSection>
```

### Calculator (After)
```typescript
<SectionAccordion
  id="calculator"
  title="HPS Double Closing Cost Calculator"
  icon={<Calculator className="w-5 h-5" />}
  isExpanded={accordion.isExpanded('calculator')}
  onToggle={() => accordion.toggle('calculator')}
>
  <DoubleCloseCalculator deal={deal} calc={calc} setDealValue={setDealValue} />
</SectionAccordion>
```

## Props Note
These two sections are tool wrappers (not form sections), so they intentionally do NOT have:
- `completedFields` - no fields to track
- `totalFields` - no field counts

They only have accordion state (expand/collapse).

## Cleanup Performed
Removed unused `UnderwritingSection` component (was lines 193-205).

## Final Section Count
| Type | Count | Sections |
|------|-------|----------|
| SectionAccordion (wrapper components) | 4 | seller, foreclosure, lien-risk, property-systems |
| SectionAccordion (direct in UnderwriteTab) | 7 | market-valuation, property-risk, debt-liens, policy-fees, timeline-legal, scenario-modeler, calculator |
| **Total with accordion** | **11** | All sections unified |
| UnderwritingSection (remaining) | **0** | Component removed |

## Verification Results
- TypeScript: PASS
- Build: PASS
- All 11 sections use SectionAccordion: YES
- UnderwritingSection removed: YES

## Visual Check Required
- [ ] Scenario Modeler shows as collapsible accordion
- [ ] Calculator shows as collapsible accordion
- [ ] Both have correct Lightbulb/Calculator icons
- [ ] Click headers to expand/collapse
- [ ] Tool content renders correctly inside accordions

## Project Complete
All 8 slices delivered successfully.
