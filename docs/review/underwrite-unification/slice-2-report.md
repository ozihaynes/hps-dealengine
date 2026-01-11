# Slice 2 Report: Field Counting + Accordion Expansion

## Completed
- [x] Created path accessor utilities (getPath, isFilled, countFilledFields)
- [x] Defined ALL_SECTION_IDS with all 11 sections
- [x] Defined SECTION_FIELDS with field paths for progress tracking
- [x] Updated useAccordionState to use ALL_SECTION_IDS
- [x] Added sectionCompletion calculation with useMemo

## Files Modified
| File | Changes |
|------|---------|
| `components/underwrite/UnderwriteTab.tsx` | Added utilities, expanded accordion state |

## Utilities Added

### getPath(obj, path)
Safe path accessor for nested objects (lodash.get alternative).
```typescript
function getPath<T = unknown>(obj: Record<string, unknown> | null | undefined, path: string): T | undefined
```

### isFilled(value)
Check if a value counts as "filled" for progress calculation.
- null/undefined → false
- empty string → false
- any number (finite) → true
- boolean → true (always counts as filled)
- empty array → false

### countFilledFields(obj, paths)
Count how many fields are filled from a list of paths.
```typescript
function countFilledFields(obj: Record<string, unknown>, paths: string[]): number
```

## All Section IDs (11 total)
```typescript
const ALL_SECTION_IDS = [
  // New accordion sections (already have completion)
  'seller-situation',
  'foreclosure-details',
  'lien-risk',
  'property-systems',
  // Old sections (to be converted)
  'market-valuation',
  'property-risk',
  'debt-liens',
  'policy-fees',
  'timeline-legal',
  'scenario-modeler',
  'calculator',
] as const;
```

## Section Field Paths

| Section | Fields | Notes |
|---------|--------|-------|
| seller-situation | 7 | From seller.* |
| foreclosure-details | 6 | From foreclosure.* |
| lien-risk | 11 | From liens.* |
| property-systems | 8 | From property.evidence.* |
| market-valuation | 2 | market.valuation_basis, market.arv |
| property-risk | 6 | property.*, status.insurability |
| debt-liens | 8 | debt.*, title.* |
| policy-fees | 4 | policy.* |
| timeline-legal | 3 | timeline.*, legal.*, confidence.* |
| scenario-modeler | 0 | Calculator only |
| calculator | 0 | Calculator only |

## Section Completion Usage
```typescript
const sectionCompletion = React.useMemo(() => {
  const dealObj = baseDeal as Record<string, unknown>;
  const result: Record<SectionId, { filled: number; total: number }> = {} as any;

  for (const sectionId of ALL_SECTION_IDS) {
    const fields = SECTION_FIELDS[sectionId];
    result[sectionId] = {
      filled: countFilledFields(dealObj, fields),
      total: fields.length,
    };
  }

  return result;
}, [baseDeal]);
```

This can be used by sections like:
```typescript
completedFields={sectionCompletion['market-valuation'].filled}
totalFields={sectionCompletion['market-valuation'].total}
```

## Verification Results
- TypeScript: PASS
- No breaking changes to existing sections

## Ready for Slice 3
- [x] All checks pass
- [ ] Confirmed by reviewer

## Next Steps
Slice 3+ will convert each old `UnderwritingSection` to use `SectionAccordion` with:
1. lucide-react icons
2. `accordion.isExpanded(sectionId)`
3. `accordion.toggle(sectionId)`
4. `sectionCompletion[sectionId].filled / .total`
