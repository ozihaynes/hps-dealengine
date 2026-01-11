# UnderwriteTab Fields Audit

## Source Files
- **Main Component**: `apps/hps-dealengine/components/underwrite/UnderwriteTab.tsx`
- **Section Hooks**:
  - `sections/useSellerSituationForm.ts`
  - `sections/useForeclosureForm.ts`
  - `sections/useLienRiskForm.ts`
  - `sections/systems-status/useSystemsStatusForm.ts`

## 11 Accordion Sections

### Section 1: Seller Situation (7 fields)
**Source**: `useSellerSituationForm.ts`
| Field Path | Label/Type | Intake Coverage |
|------------|------------|-----------------|
| `seller.reason_for_selling` | ReasonForSelling enum | Partial (intake: reason_for_selling) |
| `seller.seller_timeline` | SellerTimeline enum | Partial (intake: timeline) |
| `seller.lowest_acceptable_price` | number | Partial (intake: seller_strike_price) |
| `seller.decision_maker_status` | DecisionMakerStatus enum | **MISSING** |
| `seller.mortgage_delinquent` | boolean | **MISSING** |
| `seller.listed_with_agent` | boolean | **MISSING** |
| `seller.seller_notes` | string | Partial (intake: additional_notes) |

### Section 2: Foreclosure Details (6 fields)
**Source**: `useForeclosureForm.ts`
| Field Path | Label/Type | Intake Coverage |
|------------|------------|-----------------|
| `foreclosure.foreclosure_status` | ForeclosureStatus enum | **MISSING** (intake has boolean only) |
| `foreclosure.days_delinquent` | number | **MISSING** |
| `foreclosure.first_missed_payment_date` | date string | **MISSING** |
| `foreclosure.lis_pendens_date` | date string | **MISSING** |
| `foreclosure.judgment_date` | date string | **MISSING** |
| `foreclosure.auction_date` | date string | Partial (intake: foreclosure_sale_date) |

### Section 3: Lien Risk (11 fields)
**Source**: `useLienRiskForm.ts`
| Field Path | Label/Type | Intake Coverage |
|------------|------------|-----------------|
| `liens.hoa_status` | LienAccountStatus enum | **MISSING** |
| `liens.hoa_arrears_amount` | currency | **MISSING** |
| `liens.hoa_monthly_assessment` | currency | **MISSING** |
| `liens.cdd_status` | LienAccountStatus enum | **MISSING** |
| `liens.cdd_arrears_amount` | currency | **MISSING** |
| `liens.property_tax_status` | LienAccountStatus enum | **MISSING** |
| `liens.property_tax_arrears` | currency | **MISSING** |
| `liens.municipal_liens_present` | boolean | **MISSING** |
| `liens.municipal_lien_amount` | currency | **MISSING** |
| `liens.title_search_completed` | boolean | **MISSING** |
| `liens.title_issues_notes` | string | **MISSING** |

### Section 4: Property Systems (5 fields)
**Source**: `useSystemsStatusForm.ts`
| Field Path | Label/Type | Intake Coverage |
|------------|------------|-----------------|
| `systems.overall_condition` | PropertyCondition enum | Path mismatch (intake: condition.overall) |
| `systems.deferred_maintenance_level` | DeferredMaintenance enum | **MISSING** |
| `systems.roof_year_installed` | year number | **TYPE MISMATCH** (intake: roof_age years) |
| `systems.hvac_year_installed` | year number | **TYPE MISMATCH** (intake: hvac_age years) |
| `systems.water_heater_year_installed` | year number | **MISSING** |

### Section 5: Market & Valuation (2 fields)
| Field Path | Label/Type | Intake Coverage |
|------------|------------|-----------------|
| `market.valuation_basis` | string | **MISSING** |
| `market.arv` | currency | **MISSING** |

### Section 6: Property & Risk (6 fields)
| Field Path | Label/Type | Intake Coverage |
|------------|------------|-----------------|
| `property.occupancy` | string | **MISSING** |
| `property.county` | string | **MISSING** |
| `property.old_roof_flag` | boolean | **MISSING** |
| `property.is_homestead` | boolean | **MISSING** |
| `property.evidence.four_point.inspected` | boolean | **MISSING** |
| `status.insurability` | string | **MISSING** |

### Section 7: Debt & Liens (8 fields)
| Field Path | Label/Type | Intake Coverage |
|------------|------------|-----------------|
| `debt.senior_principal` | currency | Partial (intake: mortgage_balance) |
| `debt.senior_per_diem` | currency | **MISSING** |
| `debt.good_thru_date` | date string | **MISSING** |
| `debt.payoff_is_confirmed` | boolean | **MISSING** |
| `debt.protective_advances` | currency | **MISSING** |
| `debt.hoa_estoppel_fee` | currency | **MISSING** |
| `title.cure_cost` | currency | **MISSING** |
| `title.risk_pct` | percentage | **MISSING** |

### Section 8: Policy & Fees (4 fields)
| Field Path | Label/Type | Intake Coverage |
|------------|------------|-----------------|
| `policy.assignment_fee_target` | currency | **MISSING** |
| `policy.min_spread` | currency | **MISSING** |
| `policy.costs_are_annual` | boolean | **MISSING** |
| `policy.planned_close_days` | number | **MISSING** |

### Section 9: Timeline & Legal (3 fields)
| Field Path | Label/Type | Intake Coverage |
|------------|------------|-----------------|
| `timeline.auction_date` | date string | Partial (intake: foreclosure_sale_date) |
| `legal.case_no` | string | **MISSING** |
| `confidence.no_access_flag` | boolean | **MISSING** |

### Section 10: Scenario Modeler (0 input fields)
Calculator section - no user input fields

### Section 11: Calculator (0 input fields)
Calculator section - no user input fields

## Summary Statistics

| Category | Count |
|----------|-------|
| Total Underwrite Fields | 52 |
| Covered by Intake (exact match) | 3 |
| Covered by Intake (partial/path mismatch) | 8 |
| Missing from Intake | 41 |
| Type Mismatches | 2 |

## Coverage by Section
| Section | Total | Covered | Missing | % Covered |
|---------|-------|---------|---------|-----------|
| Seller Situation | 7 | 3* | 4 | 43% |
| Foreclosure Details | 6 | 1* | 5 | 17% |
| Lien Risk | 11 | 0 | 11 | 0% |
| Property Systems | 5 | 2* | 3 | 40% |
| Market & Valuation | 2 | 0 | 2 | 0% |
| Property & Risk | 6 | 0 | 6 | 0% |
| Debt & Liens | 8 | 1* | 7 | 13% |
| Policy & Fees | 4 | 0 | 4 | 0% |
| Timeline & Legal | 3 | 1* | 2 | 33% |

*Partial coverage - path or type mismatch exists
