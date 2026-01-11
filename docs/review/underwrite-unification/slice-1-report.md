# Slice 1 Report: Safety + Imports + Roof/HVAC Removal

## Completed
- [x] Created review folder structure
- [x] Git checkpoint created (hash: e2dd57b)
- [x] Import audit completed
- [x] Roof Age removed from Property & Risk
- [x] HVAC Year removed from Property & Risk

## Files Modified
| File | Changes |
|------|---------|
| `components/underwrite/UnderwriteTab.tsx` | Removed Roof/HVAC inputs from Property & Risk |

## Import Audit Summary

### Current Icon System
- Old sections use `Icons` object (SVG path strings from `constants.ts`)
- Old sections use custom `<Icon d={path} />` component
- New sections (Seller, Foreclosure, LienRisk, Systems) use lucide-react directly
- `SectionAccordion` accepts React nodes as `icon` prop

### For Future Slices (Converting to Accordion)
When converting old sections to accordion, we'll import lucide-react icons:
- Market & Valuation: `BarChart3` (or similar)
- Property & Risk: `Shield`
- Debt & Liens: `CreditCard` or `Banknote`
- Policy & Fees: `Sliders`
- Timeline & Legal: `Clock` or `AlertTriangle`
- Scenario Modeler: `Lightbulb`
- Calculator: `Calculator`

### Utility Status
- `lodash`: NOT installed (will use inline path access or simple getter if needed)
- `framer-motion`: Installed (v12.23.26)
- `cn()`: Available from `./utils/tokens.ts`
- Design tokens: Full system available

## Roof/HVAC Removal Details

### Removed from Property & Risk (lines ~1028-1070)
```diff
- <div id="property.evidence.roof_age">
-   <InputField
-     label="Roof Age (years)"
-     type="number"
-     value={property?.evidence?.roof_age ?? ""}
-     ...
-   />
- </div>
-
- <div id="property.evidence.hvac_year">
-   <InputField
-     label="HVAC Year"
-     type="number"
-     value={property?.evidence?.hvac_year ?? ""}
-     ...
-   />
- </div>

+ {/* Roof Age and HVAC Year moved to Property Systems section */}
```

### Kept in Property & Risk
- 4-Point Inspection field (unique to Property & Risk)
- All toggle switches (Old Roof Flag, Major System Failure, etc.)

### Backward Compatibility Preserved
- `systemsStatusData` initialization still reads from legacy `property.evidence.*` paths
- `handleSystemsStatusChange` still syncs TO legacy paths when Property Systems updates
- No data loss - just moved the UI input to Property Systems

## Verification Results
- TypeScript: PASS
- Roof/HVAC only in Property Systems: YES (only sync code remains in UnderwriteTab)

## Rollback Command (if needed)
```bash
git checkout e2dd57b -- apps/hps-dealengine/components/underwrite/UnderwriteTab.tsx
```

## Ready for Slice 2
- [x] All checks pass
- [ ] Confirmed by reviewer
