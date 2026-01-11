# Deal Type Schema Audit

## Source File
- **Type Definition**: `apps/hps-dealengine/types.ts` (Line 179)

## Deal Interface Structure

```typescript
export interface Deal {
  market: {
    arv?: number;
    as_is_value?: number;
    contract_price?: number;
    contract_price_executed?: number;
    arv_source?: string | null;
    arv_as_of?: string | null;
    arv_override_reason?: string | null;
    arv_valuation_run_id?: string | null;
    as_is_value_source?: string | null;
    as_is_value_as_of?: string | null;
    as_is_value_override_reason?: string | null;
    as_is_value_valuation_run_id?: string | null;
    valuation_basis?: string;
    dom_zip?: number;
    moi_zip?: number;
    "price-to-list-pct"?: number;
    price_to_list_ratio?: number;
    local_discount_20th_pct?: number;
    local_discount_pct?: number;
    dom?: number;
    months_of_inventory?: number;
  };

  property: {
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    occupancy?: string;
    county?: string;
    old_roof_flag?: boolean;
    is_homestead?: boolean;
    is_foreclosure_sale?: boolean;
    is_redemption_period_sale?: boolean;
  };

  contact?: {
    name?: string;
    phone?: string;
    email?: string;
  };

  client?: {
    name?: string;
    phone?: string;
    email?: string;
  };

  status: {
    insurability?: string;
    structural_or_permit_risk_flag?: boolean;
    major_system_failure_flag?: boolean;
  };

  debt: {
    senior_principal?: number;
    senior_per_diem?: number;
    good_thru_date?: string;
    protective_advances?: number;
    juniors?: JuniorLien[];
    payoff_is_confirmed?: boolean;
    hoa_estoppel_fee?: number;
  };

  title: {
    cure_cost?: number;
    risk_pct?: number;
  };

  policy: {
    assignment_fee_target?: number;
    safety_on_aiv_pct?: number;
    min_spread?: number;
    costs_are_annual?: boolean;
    planned_close_days?: number;
    manual_days_to_money?: number | "";
  };

  costs: {
    monthly: { interest?: number };
    double_close?: any;
    doubleClose?: any;
    repairs_base?: number;
    concessions_pct?: number;
    list_commission_pct?: number;
    sell_close_pct?: number;
  };

  legal: { case_no?: string };

  timeline: { auction_date?: string };

  cma: { subject: { sqft?: number } };

  confidence: {
    no_access_flag?: boolean;
    reinstatement_proof_flag?: boolean;
  };
}
```

## Missing from Deal Type (Expected by UnderwriteTab)

Based on UnderwriteTab SECTION_FIELDS, these paths are used but may not be in Deal type:

### Seller Section (not in Deal type)
- `seller.reason_for_selling`
- `seller.seller_timeline`
- `seller.decision_maker_status`
- `seller.lowest_acceptable_price`
- `seller.mortgage_delinquent`
- `seller.listed_with_agent`
- `seller.seller_notes`

### Foreclosure Section (not in Deal type)
- `foreclosure.foreclosure_status`
- `foreclosure.days_delinquent`
- `foreclosure.first_missed_payment_date`
- `foreclosure.lis_pendens_date`
- `foreclosure.judgment_date`
- `foreclosure.auction_date`

### Liens Section (not in Deal type)
- `liens.hoa_status`
- `liens.hoa_arrears_amount`
- `liens.hoa_monthly_assessment`
- `liens.cdd_status`
- `liens.cdd_arrears_amount`
- `liens.property_tax_status`
- `liens.property_tax_arrears`
- `liens.municipal_liens_present`
- `liens.municipal_lien_amount`
- `liens.title_search_completed`
- `liens.title_issues_notes`

### Systems Section (partially in Deal type)
- `systems.overall_condition`
- `systems.deferred_maintenance_level`
- `systems.roof_year_installed`
- `systems.hvac_year_installed`
- `systems.water_heater_year_installed`

### Property Evidence (not explicitly typed)
- `property.evidence.roof_age`
- `property.evidence.hvac_year`
- `property.evidence.water_heater_year`
- `property.evidence.electrical_updated`
- `property.evidence.plumbing_updated`
- `property.evidence.pool_present`
- `property.evidence.septic_present`
- `property.evidence.well_water`
- `property.evidence.four_point.inspected`

## Notes
- Deal type is incomplete relative to what UnderwriteTab uses
- Many paths are accessed via setDealValue but not typed in Deal interface
- The deal.payload JSON blob allows arbitrary nested data
- TypeScript types may be loose (`any`) in some places
