# Slice 6 Report: Convert Property & Risk

## Completed
- [x] Located Property & Risk section (lines 1141-1282)
- [x] Added Shield icon import from lucide-react
- [x] Replaced UnderwritingSection with SectionAccordion
- [x] Wired accordion state (isExpanded, onToggle)
- [x] Wired completion props (completedFields, totalFields)
- [x] Confirmed Roof/HVAC still removed (comment at line 1200)

## Files Modified
| File | Changes |
|------|---------|
| `components/underwrite/UnderwriteTab.tsx` | Converted Property & Risk to accordion |

## Icon Import Updated
```typescript
import { Clock, Sliders, CreditCard, Shield } from 'lucide-react';
```

## Conversion Details

### Before
```typescript
<UnderwritingSection title="Property & Risk" icon={Icons.shield}>
  {/* content */}
</UnderwritingSection>
```

### After
```typescript
<SectionAccordion
  id="property-risk"
  title="Property & Risk"
  icon={<Shield className="w-5 h-5" />}
  isExpanded={accordion.isExpanded('property-risk')}
  onToggle={() => accordion.toggle('property-risk')}
  completedFields={sectionCompletion['property-risk'].filled}
  totalFields={sectionCompletion['property-risk'].total}
>
  {/* content unchanged */}
  {/* Note: Roof Age and HVAC Year moved to Property Systems section */}
</SectionAccordion>
```

## Props Wired
| Prop | Value | Purpose |
|------|-------|---------|
| id | 'property-risk' | Section identifier |
| icon | `<Shield className="w-5 h-5" />` | lucide-react icon |
| isExpanded | `accordion.isExpanded('property-risk')` | Collapse state |
| onToggle | `accordion.toggle('property-risk')` | Toggle handler |
| completedFields | `sectionCompletion['property-risk'].filled` | Progress numerator |
| totalFields | `sectionCompletion['property-risk'].total` | Progress denominator (6 fields) |

## Section Count Progress
| Type | Count | Sections |
|------|-------|----------|
| SectionAccordion (wrapper components) | 4 | seller, foreclosure, lien-risk, property-systems |
| SectionAccordion (direct in UnderwriteTab) | 4 | timeline-legal, policy-fees, debt-liens, property-risk |
| **Total with accordion** | **8** | |
| UnderwritingSection (remaining) | 3 | market-valuation, scenario-modeler, calculator |

## Verification Results
- TypeScript: PASS
- Build: PASS
- Roof/HVAC still removed: YES (comment at line 1200)

## Visual Check Required
- [ ] Property & Risk shows as collapsible accordion
- [ ] Progress badge shows X/6 (6 total fields)
- [ ] Click header to expand/collapse
- [ ] Content inside unchanged
- [ ] Toggle switches work correctly

## Ready for Slice 7
- [ ] Confirmed by reviewer

## Rollback Command (if needed)
```bash
git checkout e2dd57b -- apps/hps-dealengine/components/underwrite/UnderwriteTab.tsx
```
