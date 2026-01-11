# Slice 3 Report: Convert Timeline & Legal

## Completed
- [x] Located Timeline & Legal section (lines 1674-1753)
- [x] Added Clock icon import from lucide-react
- [x] Added SectionAccordion import from './accordion'
- [x] Replaced UnderwritingSection with SectionAccordion
- [x] Wired accordion state (isExpanded, onToggle)
- [x] Wired completion props (completedFields, totalFields)

## Files Modified
| File | Changes |
|------|---------|
| `components/underwrite/UnderwriteTab.tsx` | Converted Timeline & Legal to accordion |

## Imports Added
```typescript
import { useAccordionState, SectionAccordion } from './accordion';
import { Clock } from 'lucide-react';
```

## Conversion Details

### Before
```typescript
<UnderwritingSection title="Timeline & Legal" icon={Icons.alert}>
  {/* content */}
</UnderwritingSection>
```

### After
```typescript
<SectionAccordion
  id="timeline-legal"
  title="Timeline & Legal"
  icon={<Clock className="w-5 h-5" />}
  isExpanded={accordion.isExpanded('timeline-legal')}
  onToggle={() => accordion.toggle('timeline-legal')}
  completedFields={sectionCompletion['timeline-legal'].filled}
  totalFields={sectionCompletion['timeline-legal'].total}
>
  {/* content unchanged */}
</SectionAccordion>
```

## Props Wired
| Prop | Value | Purpose |
|------|-------|---------|
| id | 'timeline-legal' | Section identifier |
| icon | `<Clock className="w-5 h-5" />` | lucide-react icon |
| isExpanded | `accordion.isExpanded('timeline-legal')` | Collapse state |
| onToggle | `accordion.toggle('timeline-legal')` | Toggle handler |
| completedFields | `sectionCompletion['timeline-legal'].filled` | Progress numerator |
| totalFields | `sectionCompletion['timeline-legal'].total` | Progress denominator (3 fields) |

## Section Count
| Type | Count | Sections |
|------|-------|----------|
| SectionAccordion (wrapper components) | 4 | seller, foreclosure, lien-risk, property-systems |
| SectionAccordion (direct in UnderwriteTab) | 1 | timeline-legal |
| UnderwritingSection (old style) | 6 | market-valuation, property-risk, debt-liens, policy-fees, scenario-modeler, calculator |
| **Total with accordion** | **5** | |

## Verification Results
- TypeScript: PASS
- Build: PASS

## Visual Check Required
After build passes, manually verify:
- [ ] Timeline & Legal shows as collapsible accordion
- [ ] Progress badge shows X/3 (3 total fields)
- [ ] Click header to expand/collapse
- [ ] Content inside unchanged

## Ready for Slice 4
- [ ] Confirmed by reviewer

## Rollback Command (if needed)
```bash
git checkout e2dd57b -- apps/hps-dealengine/components/underwrite/UnderwriteTab.tsx
```
