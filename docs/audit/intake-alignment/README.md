# Intake Form Field Mapping Audit

## Purpose
Verify and document the complete field mapping from intake forms to deal object to underwriting tab.

## Data Flow
```
IntakeForm (client) → [schema_public_json] → Deal.payload → UnderwriteTab (UI)
                            ↓
                   mapping_private_json (transforms)
```

## Audit Files
| File | Description |
|------|-------------|
| 01-intake-form-fields.md | Fields in IntakeForm schema |
| 02-new-deal-form-fields.md | Fields in NewDealForm component |
| 03-deal-type-schema.md | Complete Deal type definition |
| 04-underwrite-fields.md | Fields rendered in UnderwriteTab |
| 05-mapping-analysis.md | Gap analysis and alignment issues |

## Status
- [x] Discovery complete (2026-01-11)
- [ ] Human review complete
- [ ] Action plan approved

## Quick Summary

### Critical Findings
1. **Schema Mismatch**: Intake schema collects ~27 fields, but UnderwriteTab uses ~70+ fields across 11 sections
2. **Path Mismatch**: Intake maps to `payload.condition.*`, `payload.motivation.*`, `payload.financial.*` but UnderwriteTab expects `seller.*`, `foreclosure.*`, `liens.*`, `systems.*`
3. **Missing Fields**: Major sections (Liens, Foreclosure Details, Systems) have no intake coverage
4. **Type Mismatch**: Intake collects `roof_age` (years old), but systems section expects `roof_year_installed` (year)

### Sections Comparison
| UnderwriteTab Section | Intake Coverage | Gap |
|-----------------------|-----------------|-----|
| Seller Situation (7 fields) | Partial (3/7) | 4 fields missing |
| Foreclosure Details (6 fields) | Minimal (1/6) | 5 fields missing |
| Lien Risk (11 fields) | None (0/11) | 11 fields missing |
| Property Systems (5 fields) | Partial (3/5) | Path + type mismatch |
| Market & Valuation (2 fields) | None (0/2) | 2 fields missing |
| Property & Risk (6 fields) | Partial (1/6) | 5 fields missing |
| Debt & Liens (8 fields) | Partial (1/8) | 7 fields missing |
| Policy & Fees (4 fields) | None (0/4) | 4 fields missing |
| Timeline & Legal (3 fields) | Partial (1/3) | 2 fields missing |
