# Intake Form Fields Audit

## Source Files
- **Schema Definition**: `supabase/bootstrap/intake_schema_seed.sql`
- **Form Renderer**: `apps/hps-dealengine/components/intake/IntakeForm.tsx`
- **Contract Types**: `packages/contracts/src/intake.ts`

## Schema Architecture
IntakeForm is a **dynamic form renderer** that renders fields from `schema_public_json` stored in `intake_schema_versions` table. The actual fields are defined in the seed SQL.

## Intake Schema v1.0.0 (27 fields across 6 sections)

### Section 1: Seller Information (5 fields)
| Key | Label | Type | Required | Target Path |
|-----|-------|------|----------|-------------|
| seller_name | Full Name | text | Yes | `payload.client.name` |
| seller_email | Email Address | email | Yes | `payload.client.email` |
| seller_phone | Phone Number | phone | Yes | `payload.client.phone` |
| seller_address | Current Address | text | No | *(not mapped)* |
| seller_strike_price | Minimum Acceptable Price | currency | No | `payload.seller.strike_price` |

### Section 2: Market Conditions (2 fields) - Optional
| Key | Label | Type | Required | Target Path |
|-----|-------|------|----------|-------------|
| absorption_rate | Absorption Rate (months) | number | No | `payload.market_conditions.absorption_rate` |
| cash_buyer_share_pct | Cash Buyer Share (%) | number | No | `payload.market_conditions.cash_buyer_share_pct` |

### Section 3: Property Details (9 fields)
| Key | Label | Type | Required | Target Path |
|-----|-------|------|----------|-------------|
| property_address | Property Address | text | Yes | `address` (top-level) |
| property_city | City | text | Yes | `city` (top-level) |
| property_state | State | select | Yes | `state` (top-level) |
| property_zip | ZIP Code | text | Yes | `zip` (top-level) |
| property_type | Property Type | select | Yes | `payload.property.type` |
| bedrooms | Bedrooms | number | Yes | `payload.property.bedrooms` |
| bathrooms | Bathrooms | number | Yes | `payload.property.bathrooms` |
| sqft | Square Footage | number | No | `payload.property.sqft` |
| year_built | Year Built | number | No | `payload.property.year_built` |

### Section 4: Financial Situation (6 fields)
| Key | Label | Type | Required | Target Path |
|-----|-------|------|----------|-------------|
| asking_price | Asking Price | currency | No | `payload.financial.asking_price` |
| mortgage_balance | Mortgage Balance Owed | currency | No | `payload.financial.mortgage_balance` |
| monthly_payment | Monthly Mortgage Payment | currency | No | `payload.financial.monthly_payment` |
| behind_on_payments | Behind on Payments? | select | No | `payload.financial.behind_on_payments` |
| in_foreclosure | Currently in Foreclosure? | boolean | Yes | `payload.financial.in_foreclosure` |
| foreclosure_sale_date | Foreclosure Sale Date | date | No | `payload.financial.foreclosure_sale_date` |

### Section 5: Property Condition (4 fields)
| Key | Label | Type | Required | Target Path |
|-----|-------|------|----------|-------------|
| overall_condition | Overall Condition | select | Yes | `payload.condition.overall` |
| roof_age | Roof Age (years) | number | No | `payload.condition.roof_age_years` |
| hvac_age | HVAC Age (years) | number | No | `payload.condition.hvac_age_years` |
| repair_notes | Known Repairs Needed | textarea | No | `payload.condition.repair_notes` |

### Section 6: Selling Situation (3 fields)
| Key | Label | Type | Required | Target Path |
|-----|-------|------|----------|-------------|
| reason_for_selling | Reason for Selling | select | Yes | `payload.motivation.reason` |
| timeline | Desired Timeline | select | Yes | `payload.motivation.timeline` |
| additional_notes | Anything Else We Should Know? | textarea | No | `payload.motivation.notes` |

## Evidence Uploads (3 types)
| Key | Label | Accept Types | Max Files | Required |
|-----|-------|--------------|-----------|----------|
| photos | Property Photos | image/jpeg, image/png | 10 | No |
| mortgage_statement | Recent Mortgage Statement | PDF, JPEG, PNG | 2 | No |
| foreclosure_docs | Foreclosure Documents | PDF | 5 | No |

## Field Type Transformations
| Transform | Description |
|-----------|-------------|
| parseInt | Convert string to integer |
| parseFloat | Convert string to float |
| parseCurrency | Parse currency string to number |
| parseBoolean | Parse string to boolean |
| parseDate | Parse date string to ISO format |
| trim | Trim whitespace |

## Notes
- Form validation happens client-side in `IntakeFormSection.tsx`
- Auto-save is implemented via `useIntakeAutoSave` hook
- Population to deal happens via `v1-intake-populate` edge function
