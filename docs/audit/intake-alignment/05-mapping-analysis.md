# Field Mapping Analysis

## Data Flow Summary
```
IntakeForm                  → mapping_private_json        → Deal Payload               → UnderwriteTab
(schema_public_json fields)   (transforms + paths)          (JSON blob in DB)            (section forms)
```

## Critical Alignment Issues

### Issue 1: Path Namespace Mismatch

**Intake maps to:**
- `payload.client.*`
- `payload.seller.*`
- `payload.financial.*`
- `payload.condition.*`
- `payload.motivation.*`
- `payload.market_conditions.*`

**UnderwriteTab expects:**
- `seller.*`
- `foreclosure.*`
- `liens.*`
- `systems.*`
- `debt.*`
- `market.*`

**Impact:** Data populated from intake won't be read by UnderwriteTab sections.

### Issue 2: Type Mismatches

| Field | Intake Type | Underwrite Type | Issue |
|-------|-------------|-----------------|-------|
| roof_age vs roof_year_installed | "Age in years" | "Year installed" | Semantic mismatch |
| hvac_age vs hvac_year_installed | "Age in years" | "Year installed" | Semantic mismatch |
| in_foreclosure vs foreclosure_status | boolean | enum | Type mismatch |
| behind_on_payments vs days_delinquent | string enum | number | Type mismatch |

### Issue 3: Missing Intake Fields

**Entire sections with zero intake coverage:**
- Lien Risk (11 fields) - No HOA/CDD/tax/municipal lien collection
- Market & Valuation (2 fields) - No ARV collection
- Property & Risk (6 fields) - No occupancy/county/flags
- Policy & Fees (4 fields) - No policy parameter collection

**Fields with no intake equivalent:**
- `foreclosure.foreclosure_status` - Intake only has boolean
- `foreclosure.days_delinquent` - Intake has "behind_on_payments" (1-2 months, 3-6 months, etc.)
- `foreclosure.first_missed_payment_date`, `lis_pendens_date`, `judgment_date` - None
- `seller.decision_maker_status` - None
- `seller.mortgage_delinquent` - Intake has "behind_on_payments" but different meaning
- `seller.listed_with_agent` - None
- All liens fields - None
- `systems.deferred_maintenance_level` - None
- `systems.water_heater_year_installed` - None

---

## Field Alignment Matrix

### ✅ Properly Mapped (Intake → Deal → Underwrite)
| Intake Field | Deal Path | Underwrite Section | Notes |
|--------------|-----------|-------------------|-------|
| property_address | address | (top-level) | Works |
| property_city | city | (top-level) | Works |
| property_state | state | (top-level) | Works |
| property_zip | zip | (top-level) | Works |
| seller_name | payload.client.name | (contact display) | Works |
| seller_email | payload.client.email | (contact display) | Works |
| seller_phone | payload.client.phone | (contact display) | Works |

### ⚠️ Partial Mapping (exists but path/type mismatch)
| Intake Field | Intake Path | Expected Path | Issue |
|--------------|-------------|---------------|-------|
| reason_for_selling | payload.motivation.reason | seller.reason_for_selling | Path mismatch |
| timeline | payload.motivation.timeline | seller.seller_timeline | Path + name mismatch |
| seller_strike_price | payload.seller.strike_price | seller.lowest_acceptable_price | Path mismatch |
| additional_notes | payload.motivation.notes | seller.seller_notes | Path mismatch |
| overall_condition | payload.condition.overall | systems.overall_condition | Path mismatch |
| roof_age | payload.condition.roof_age_years | systems.roof_year_installed | Path + type mismatch |
| hvac_age | payload.condition.hvac_age_years | systems.hvac_year_installed | Path + type mismatch |
| mortgage_balance | payload.financial.mortgage_balance | debt.senior_principal | Path mismatch |
| foreclosure_sale_date | payload.financial.foreclosure_sale_date | foreclosure.auction_date | Path mismatch |
| in_foreclosure | payload.financial.in_foreclosure | foreclosure.foreclosure_status | Path + type mismatch |

### ❌ Missing in Intake (exists in Underwrite but not collected)
| Underwrite Path | Underwrite Section | Priority |
|-----------------|-------------------|----------|
| seller.decision_maker_status | Seller Situation | High |
| seller.mortgage_delinquent | Seller Situation | High |
| seller.listed_with_agent | Seller Situation | Medium |
| foreclosure.foreclosure_status | Foreclosure Details | High |
| foreclosure.days_delinquent | Foreclosure Details | High |
| foreclosure.first_missed_payment_date | Foreclosure Details | Medium |
| foreclosure.lis_pendens_date | Foreclosure Details | Medium |
| foreclosure.judgment_date | Foreclosure Details | Medium |
| liens.* (all 11 fields) | Lien Risk | High |
| systems.deferred_maintenance_level | Property Systems | Medium |
| systems.water_heater_year_installed | Property Systems | Low |
| market.arv | Market & Valuation | N/A (auto-populated) |
| property.occupancy | Property & Risk | Medium |
| property.county | Property & Risk | Low |
| property.old_roof_flag | Property & Risk | Medium |
| property.is_homestead | Property & Risk | Medium |
| debt.senior_per_diem | Debt & Liens | High |
| debt.good_thru_date | Debt & Liens | High |
| debt.payoff_is_confirmed | Debt & Liens | Medium |
| debt.protective_advances | Debt & Liens | Medium |
| policy.* (all fields) | Policy & Fees | N/A (staff-only) |
| legal.case_no | Timeline & Legal | Medium |

### ❓ Orphaned Fields (in intake but not used in Underwrite)
| Intake Field | Intake Path | Notes |
|--------------|-------------|-------|
| seller_address | *(not mapped)* | Never mapped |
| absorption_rate | payload.market_conditions.absorption_rate | Market conditions - unused in UI |
| cash_buyer_share_pct | payload.market_conditions.cash_buyer_share_pct | Market conditions - unused in UI |
| property_type | payload.property.type | Not displayed in Underwrite |
| bedrooms | payload.property.bedrooms | Not displayed in Underwrite |
| bathrooms | payload.property.bathrooms | Not displayed in Underwrite |
| sqft | payload.property.sqft | Used in CMA but not Underwrite |
| year_built | payload.property.year_built | Not displayed in Underwrite |
| asking_price | payload.financial.asking_price | Not displayed in Underwrite |
| monthly_payment | payload.financial.monthly_payment | Not displayed in Underwrite |
| behind_on_payments | payload.financial.behind_on_payments | Different from days_delinquent |
| repair_notes | payload.condition.repair_notes | Not displayed in Underwrite |

---

## Recommended Priority Fixes

### Priority 1 (Critical) - Path Alignment
1. Update `mapping_private_json` to map intake fields to correct underwrite paths
2. Or update UnderwriteTab to read from intake paths

### Priority 2 (High) - Missing Critical Fields
1. Add `foreclosure_status` (enum) to intake
2. Add `days_delinquent` (number) to intake
3. Add basic lien fields to intake (HOA status at minimum)
4. Add `decision_maker_status` to intake

### Priority 3 (Medium) - Type Conversions
1. Convert roof_age → roof_year_installed (current year - age)
2. Convert hvac_age → hvac_year_installed (current year - age)
3. Map behind_on_payments → days_delinquent (requires logic)

### Priority 4 (Low) - Nice to Have
1. Add remaining lien fields
2. Add property evidence fields
3. Add deferred_maintenance_level

---

## Decision Required

**Option A: Update Intake Schema**
- Add new fields to intake form
- Pros: More complete client data collection
- Cons: Longer form, may reduce completion rate

**Option B: Update Mapping Paths**
- Change `mapping_private_json` to map to correct underwrite paths
- Pros: Quick fix, no form changes
- Cons: Doesn't add missing fields

**Option C: Update UnderwriteTab**
- Change UnderwriteTab to read from intake paths
- Pros: No database changes
- Cons: Requires UI code changes, may conflict with existing data

**Option D: Hybrid Approach**
- Fix path mappings (Option B)
- Add critical missing fields (subset of Option A)
- Leave nice-to-have fields for staff entry

**Recommendation:** Option D (Hybrid)
