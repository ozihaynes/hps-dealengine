# Slice 4 Report: Convert Policy & Fees

## Completed
- [x] Located Policy & Fees section (lines 1494-1680)
- [x] Added Sliders icon import from lucide-react
- [x] Replaced UnderwritingSection with SectionAccordion
- [x] Wired accordion state (isExpanded, onToggle)
- [x] Wired completion props (completedFields, totalFields)

## Files Modified
| File | Changes |
|------|---------|
| `components/underwrite/UnderwriteTab.tsx` | Converted Policy & Fees to accordion |

## Icon Import Updated
```typescript
import { Clock, Sliders } from 'lucide-react';
```

## Conversion Details

### Before
```typescript
<UnderwritingSection title="Policy & Fees" icon={Icons.sliders}>
  {/* content */}
</UnderwritingSection>
```

### After
```typescript
<SectionAccordion
  id="policy-fees"
  title="Policy & Fees"
  icon={<Sliders className="w-5 h-5" />}
  isExpanded={accordion.isExpanded('policy-fees')}
  onToggle={() => accordion.toggle('policy-fees')}
  completedFields={sectionCompletion['policy-fees'].filled}
  totalFields={sectionCompletion['policy-fees'].total}
>
  {/* content unchanged */}
</SectionAccordion>
```

## Props Wired
| Prop | Value | Purpose |
|------|-------|---------|
| id | 'policy-fees' | Section identifier |
| icon | `<Sliders className="w-5 h-5" />` | lucide-react icon |
| isExpanded | `accordion.isExpanded('policy-fees')` | Collapse state |
| onToggle | `accordion.toggle('policy-fees')` | Toggle handler |
| completedFields | `sectionCompletion['policy-fees'].filled` | Progress numerator |
| totalFields | `sectionCompletion['policy-fees'].total` | Progress denominator (4 fields) |

## Section Count Progress
| Type | Count | Sections |
|------|-------|----------|
| SectionAccordion (wrapper components) | 4 | seller, foreclosure, lien-risk, property-systems |
| SectionAccordion (direct in UnderwriteTab) | 2 | timeline-legal, policy-fees |
| **Total with accordion** | **6** | |
| UnderwritingSection (remaining) | 5 | market-valuation, property-risk, debt-liens, scenario-modeler, calculator |

## Verification Results
- TypeScript: PASS
- Build: PASS

## Visual Check Required
- [ ] Policy & Fees shows as collapsible accordion
- [ ] Progress badge shows X/4 (4 total fields)
- [ ] Click header to expand/collapse
- [ ] Content inside unchanged

## Ready for Slice 5
- [ ] Confirmed by reviewer

## Rollback Command (if needed)
```bash
git checkout e2dd57b -- apps/hps-dealengine/components/underwrite/UnderwriteTab.tsx
```
