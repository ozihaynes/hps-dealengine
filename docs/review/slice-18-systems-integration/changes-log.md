# Changes Log - Slice 18: Systems Status Integration

## Generated
2026-01-10

## Summary
Created the Property Systems form section that integrates with the existing
SystemsStatusCard visualization. Follows the established pattern of hook +
fields + section component.

## Files Created

| File | Location | Purpose |
|------|----------|---------|
| useSystemsStatusForm.ts | sections/systems-status/ | Form state + debounced computation |
| SystemsStatusFields.tsx | sections/systems-status/ | Form field components |
| SystemsStatusSection.tsx | sections/systems-status/ | Accordion section with preview |
| index.ts | sections/systems-status/ | Barrel export |

## Files Modified

| File | Changes |
|------|---------|
| sections/index.ts | Added SystemsStatus exports, updated slice comment |

## Features

### useSystemsStatusForm Hook
- Manages 5 form fields
- Debounced engine computation (150ms) using useRef + setTimeout pattern
- Tracks completed fields count
- Returns computed output for preview
- Type-safe field updates
- Reset functionality

### SystemsStatusFields
- 5 form fields (2 dropdowns + 3 number inputs)
- Year validation (1900 to 2027)
- Expected life hints on labels (25yr roof, 15yr hvac, 12yr water heater)
- Proper label associations (htmlFor)
- aria-describedby for screen readers
- sr-only hints for additional context
- Focus ring styling via tokens
- Disabled state support

### SystemsStatusSection
- SectionAccordion wrapper with Wrench icon
- Form fields + live preview layout
- Computing indicator during debounce
- Progress tracking (completedFields/totalFields)
- aria-hidden on decorative icon

### Form Fields
| Field | Type | Validation |
|-------|------|------------|
| overall_condition | select | PropertyCondition enum |
| deferred_maintenance_level | select | DeferredMaintenance enum |
| roof_year_installed | number | 1900-2027, 25 yr life |
| hvac_year_installed | number | 1900-2027, 15 yr life |
| water_heater_year_installed | number | 1900-2027, 12 yr life |

## Dependencies

| Dependency | Source | Purpose |
|------------|--------|---------|
| computeSystemsStatus | @/lib/engine | Engine function |
| SectionAccordion | ../accordion | Section wrapper |
| SystemsStatusCard | ../visualizations | Preview display |
| PropertyCondition | @hps-internal/contracts | Type |
| DeferredMaintenance | @hps-internal/contracts | Type |
| PROPERTY_CONDITION_OPTIONS | @hps-internal/contracts | Dropdown options |
| DEFERRED_MAINTENANCE_OPTIONS | @hps-internal/contracts | Dropdown options |
| cn, colors, focus | ../utils | Design tokens |

## Patterns Applied

- **Debounce Pattern**: useRef + setTimeout (matching useSellerSituationForm pattern)
- **Form State Pattern**: useState for data, computed values via useMemo
- **Callback Pattern**: useCallback with stable dependencies
- **Component Composition**: Section > Fields structure
