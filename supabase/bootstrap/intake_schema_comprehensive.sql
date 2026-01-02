-- supabase/bootstrap/intake_schema_comprehensive.sql
-- Comprehensive client intake schema v2.0.0
-- 8 sections, 35+ fields covering all client-only information
-- Includes evidence uploads for seller documents

-- First, deactivate any existing schemas for this org
UPDATE public.intake_schema_versions
SET is_active = false
WHERE org_id = '033ff93d-ff97-4af9-b3a1-a114d3c04da6';

-- Delete existing v2.0.0 if it exists (for idempotent re-runs)
DELETE FROM public.intake_schema_versions
WHERE org_id = '033ff93d-ff97-4af9-b3a1-a114d3c04da6'
  AND semantic_version = '2.0.0';

-- Insert the comprehensive intake schema
INSERT INTO public.intake_schema_versions (
  org_id,
  semantic_version,
  display_name,
  description,
  schema_public_json,
  mapping_private_json,
  is_active,
  created_by
)
VALUES (
  '033ff93d-ff97-4af9-b3a1-a114d3c04da6',
  '2.0.0',
  'Comprehensive Client Intake v2',
  'Complete intake form for distressed SFR deals - collects all client-only information needed for underwriting.',
  '{
    "version": "2.0.0",
    "title": "Property Information Form",
    "description": "Please complete this form to help us evaluate your property. Your information is kept confidential.",
    "sections": [
      {
        "id": "contact",
        "title": "Your Contact Information",
        "description": "How can we reach you?",
        "fields": [
          {
            "key": "contact_name",
            "label": "Full Legal Name",
            "type": "text",
            "required": true,
            "placeholder": "Enter your full name",
            "helpText": "As it appears on your property deed"
          },
          {
            "key": "contact_phone",
            "label": "Phone Number",
            "type": "phone",
            "required": true,
            "placeholder": "(555) 123-4567",
            "helpText": "Best number to reach you"
          },
          {
            "key": "contact_email",
            "label": "Email Address",
            "type": "email",
            "required": true,
            "placeholder": "you@example.com",
            "helpText": "For important documents and updates"
          }
        ]
      },
      {
        "id": "property_basics",
        "title": "Property Details",
        "description": "Basic information about your property",
        "fields": [
          {
            "key": "property_address",
            "label": "Property Street Address",
            "type": "text",
            "required": true,
            "placeholder": "123 Main Street",
            "helpText": "The full street address of the property"
          },
          {
            "key": "property_city",
            "label": "City",
            "type": "text",
            "required": true,
            "placeholder": "Orlando"
          },
          {
            "key": "property_state",
            "label": "State",
            "type": "select",
            "required": true,
            "options": [
              {"value": "FL", "label": "Florida"}
            ]
          },
          {
            "key": "property_zip",
            "label": "ZIP Code",
            "type": "text",
            "required": true,
            "placeholder": "32801"
          },
          {
            "key": "property_county",
            "label": "County",
            "type": "text",
            "required": false,
            "placeholder": "Orange County",
            "helpText": "The county where the property is located"
          },
          {
            "key": "is_homestead",
            "label": "Is this your primary residence (homestead)?",
            "type": "boolean",
            "required": true,
            "helpText": "This affects tax exemptions and legal protections"
          }
        ]
      },
      {
        "id": "occupancy",
        "title": "Occupancy Status",
        "description": "Who currently lives at the property?",
        "fields": [
          {
            "key": "occupancy_status",
            "label": "Current Occupancy",
            "type": "select",
            "required": true,
            "options": [
              {"value": "owner", "label": "I live here (Owner-occupied)"},
              {"value": "tenant", "label": "Tenants live here (Rented)"},
              {"value": "vacant", "label": "The property is vacant"}
            ],
            "helpText": "Select who currently occupies the property"
          },
          {
            "key": "tenant_lease_end",
            "label": "When does the current lease end?",
            "type": "date",
            "required": false,
            "condition": {"field": "occupancy_status", "equals": "tenant"},
            "helpText": "The end date of the current lease agreement"
          },
          {
            "key": "tenant_monthly_rent",
            "label": "Monthly Rent Amount",
            "type": "currency",
            "required": false,
            "condition": {"field": "occupancy_status", "equals": "tenant"},
            "placeholder": "0.00",
            "helpText": "Current monthly rent collected"
          },
          {
            "key": "tenant_arrears",
            "label": "Any unpaid rent owed?",
            "type": "currency",
            "required": false,
            "condition": {"field": "occupancy_status", "equals": "tenant"},
            "placeholder": "0.00",
            "helpText": "Total amount of past-due rent"
          }
        ]
      },
      {
        "id": "financial",
        "title": "Financial Information",
        "description": "Information about your mortgage and any other debts on the property",
        "fields": [
          {
            "key": "mortgage_payoff",
            "label": "Current Mortgage Payoff Amount",
            "type": "currency",
            "required": true,
            "placeholder": "0.00",
            "helpText": "The total amount needed to pay off your mortgage today. You can find this on a recent statement or by calling your lender."
          },
          {
            "key": "mortgage_per_diem",
            "label": "Daily Interest (Per Diem)",
            "type": "currency",
            "required": false,
            "placeholder": "0.00",
            "helpText": "Daily interest charge found on your payoff letter (optional)"
          },
          {
            "key": "payoff_good_thru",
            "label": "Payoff Good Through Date",
            "type": "date",
            "required": false,
            "helpText": "The date your payoff quote is valid until"
          },
          {
            "key": "has_payoff_letter",
            "label": "Do you have a formal payoff letter from your lender?",
            "type": "boolean",
            "required": false,
            "helpText": "A payoff letter confirms the exact amount needed to satisfy the loan"
          },
          {
            "key": "protective_advances",
            "label": "Lender Advances (taxes/insurance paid by lender)",
            "type": "currency",
            "required": false,
            "placeholder": "0.00",
            "helpText": "If your lender has paid property taxes or insurance on your behalf, enter the total amount"
          },
          {
            "key": "has_other_liens",
            "label": "Do you have any other loans, liens, or judgments on the property?",
            "type": "boolean",
            "required": true,
            "helpText": "This includes HELOCs, 2nd mortgages, tax liens, HOA liens, or court judgments"
          },
          {
            "key": "junior_liens_description",
            "label": "Please describe all other liens",
            "type": "textarea",
            "required": false,
            "condition": {"field": "has_other_liens", "equals": true},
            "placeholder": "Example: HELOC with Bank of America - $25,000; Property tax lien - $3,500",
            "helpText": "List each lien with the creditor name and approximate amount"
          },
          {
            "key": "junior_liens_total",
            "label": "Total Amount of Other Liens",
            "type": "currency",
            "required": false,
            "condition": {"field": "has_other_liens", "equals": true},
            "placeholder": "0.00",
            "helpText": "Combined total of all other liens and judgments"
          },
          {
            "key": "hoa_fees_owed",
            "label": "HOA Dues/Assessments Owed",
            "type": "currency",
            "required": false,
            "placeholder": "0.00",
            "helpText": "Any outstanding HOA dues or special assessments"
          },
          {
            "key": "title_issues_known",
            "label": "Are you aware of any title issues?",
            "type": "boolean",
            "required": false,
            "helpText": "This includes disputed ownership, missing heirs, or unrecorded documents"
          },
          {
            "key": "title_issues_description",
            "label": "Please describe the title issues",
            "type": "textarea",
            "required": false,
            "condition": {"field": "title_issues_known", "equals": true},
            "placeholder": "Describe any known title problems..."
          },
          {
            "key": "title_cure_cost",
            "label": "Estimated cost to resolve title issues",
            "type": "currency",
            "required": false,
            "condition": {"field": "title_issues_known", "equals": true},
            "placeholder": "0.00"
          }
        ]
      },
      {
        "id": "property_condition",
        "title": "Property Condition",
        "description": "Current state of the property and major systems",
        "fields": [
          {
            "key": "roof_age",
            "label": "How old is the roof? (years)",
            "type": "number",
            "required": false,
            "min": 0,
            "max": 100,
            "placeholder": "15",
            "helpText": "Approximate age in years. Enter 0 if recently replaced."
          },
          {
            "key": "hvac_year",
            "label": "When was the HVAC system installed? (year)",
            "type": "number",
            "required": false,
            "min": 1950,
            "max": 2030,
            "placeholder": "2015",
            "helpText": "Enter the year the current HVAC was installed"
          },
          {
            "key": "major_system_issues",
            "label": "Are any major systems NOT working properly?",
            "type": "multiselect",
            "required": false,
            "options": [
              {"value": "hvac", "label": "HVAC (heating/cooling)"},
              {"value": "roof", "label": "Roof (leaks or damage)"},
              {"value": "plumbing", "label": "Plumbing issues"},
              {"value": "electrical", "label": "Electrical problems"},
              {"value": "foundation", "label": "Foundation issues"},
              {"value": "water_heater", "label": "Water heater"},
              {"value": "none", "label": "All systems are working"}
            ],
            "helpText": "Select all that apply"
          },
          {
            "key": "unpermitted_work",
            "label": "Are you aware of any unpermitted additions or renovations?",
            "type": "boolean",
            "required": false,
            "helpText": "Work done without proper building permits"
          },
          {
            "key": "insurance_issues",
            "label": "Have you had difficulty getting or keeping homeowner insurance?",
            "type": "select",
            "required": false,
            "options": [
              {"value": "bindable", "label": "No issues - easily insurable"},
              {"value": "conditional", "label": "Some conditions required"},
              {"value": "unbindable", "label": "Unable to get insurance"},
              {"value": "unknown", "label": "I don't know"}
            ],
            "helpText": "Insurance issues may include roof age, claims history, or property condition"
          },
          {
            "key": "four_point_done",
            "label": "Has a 4-point inspection been completed recently?",
            "type": "boolean",
            "required": false,
            "helpText": "A 4-point inspection covers roof, HVAC, electrical, and plumbing"
          },
          {
            "key": "interior_access",
            "label": "Can you provide access to the interior for inspection?",
            "type": "boolean",
            "required": false,
            "helpText": "We may need to view the property interior"
          },
          {
            "key": "condition_notes",
            "label": "Any other condition issues we should know about?",
            "type": "textarea",
            "required": false,
            "placeholder": "Describe any additional repairs needed, recent improvements made, or other relevant details..."
          }
        ]
      },
      {
        "id": "legal_status",
        "title": "Legal & Foreclosure Status",
        "description": "Any legal matters affecting the property",
        "fields": [
          {
            "key": "in_foreclosure",
            "label": "Is the property currently in foreclosure?",
            "type": "boolean",
            "required": true,
            "helpText": "Have you received a lis pendens or foreclosure notice?"
          },
          {
            "key": "foreclosure_stage",
            "label": "What stage is the foreclosure in?",
            "type": "select",
            "required": false,
            "condition": {"field": "in_foreclosure", "equals": true},
            "options": [
              {"value": "pre_filing", "label": "Pre-filing (received notice of default)"},
              {"value": "lis_pendens", "label": "Lis Pendens filed"},
              {"value": "summary_judgment", "label": "Summary Judgment entered"},
              {"value": "sale_scheduled", "label": "Auction/Sale scheduled"},
              {"value": "sale_completed", "label": "Sale completed (in redemption)"}
            ]
          },
          {
            "key": "foreclosure_case_no",
            "label": "Foreclosure Case Number",
            "type": "text",
            "required": false,
            "condition": {"field": "in_foreclosure", "equals": true},
            "placeholder": "XX-XXXX-XX",
            "helpText": "Found on court documents"
          },
          {
            "key": "auction_date",
            "label": "Scheduled Auction/Sale Date",
            "type": "date",
            "required": false,
            "condition": {"field": "in_foreclosure", "equals": true},
            "helpText": "The date of the scheduled foreclosure sale"
          },
          {
            "key": "in_redemption_period",
            "label": "Are you in the redemption period? (sale already occurred)",
            "type": "boolean",
            "required": false,
            "condition": {"field": "in_foreclosure", "equals": true}
          },
          {
            "key": "reinstatement_available",
            "label": "Can you reinstate the loan (bring it current)?",
            "type": "boolean",
            "required": false,
            "condition": {"field": "in_foreclosure", "equals": true},
            "helpText": "Do you have the ability to pay the past-due amount?"
          },
          {
            "key": "bankruptcy_filed",
            "label": "Have you filed for bankruptcy?",
            "type": "boolean",
            "required": false,
            "helpText": "An active bankruptcy affects the sale process"
          },
          {
            "key": "bankruptcy_case_no",
            "label": "Bankruptcy Case Number",
            "type": "text",
            "required": false,
            "condition": {"field": "bankruptcy_filed", "equals": true},
            "placeholder": "XX-XXXXX"
          }
        ]
      },
      {
        "id": "motivation",
        "title": "Your Situation",
        "description": "Help us understand your timeline and goals",
        "fields": [
          {
            "key": "reason_for_selling",
            "label": "Primary reason for selling",
            "type": "select",
            "required": true,
            "options": [
              {"value": "foreclosure", "label": "Avoiding foreclosure"},
              {"value": "relocation", "label": "Relocating for work or family"},
              {"value": "divorce", "label": "Divorce or separation"},
              {"value": "inherited", "label": "Inherited property"},
              {"value": "downsizing", "label": "Downsizing"},
              {"value": "financial", "label": "Financial hardship"},
              {"value": "repairs", "label": "Cannot afford repairs"},
              {"value": "tired_landlord", "label": "Tired of being a landlord"},
              {"value": "other", "label": "Other reason"}
            ]
          },
          {
            "key": "urgency_timeline",
            "label": "How quickly do you need to close and receive funds?",
            "type": "select",
            "required": true,
            "options": [
              {"value": "asap", "label": "As soon as possible (7-14 days)"},
              {"value": "30_days", "label": "Within 30 days"},
              {"value": "60_days", "label": "Within 60 days"},
              {"value": "flexible", "label": "Flexible timeline"}
            ]
          },
          {
            "key": "asking_price",
            "label": "What price are you hoping to get? (optional)",
            "type": "currency",
            "required": false,
            "placeholder": "0.00",
            "helpText": "Your target price if you have one in mind"
          },
          {
            "key": "additional_notes",
            "label": "Anything else we should know?",
            "type": "textarea",
            "required": false,
            "placeholder": "Share any other relevant information about your property or situation...",
            "helpText": "This helps us better understand your needs"
          }
        ]
      },
      {
        "id": "documents",
        "title": "Document Uploads",
        "description": "Upload supporting documents to speed up the process. All files are securely stored.",
        "fields": []
      }
    ],
    "evidence_uploads": [
      {
        "key": "payoff_letter",
        "label": "Mortgage Payoff Letter",
        "description": "Official payoff statement from your lender",
        "accept": ["application/pdf", "image/jpeg", "image/png"],
        "max_files": 3,
        "required": false
      },
      {
        "key": "mortgage_statement",
        "label": "Recent Mortgage Statement",
        "description": "Your most recent monthly mortgage statement",
        "accept": ["application/pdf", "image/jpeg", "image/png"],
        "max_files": 3,
        "required": false
      },
      {
        "key": "hoa_estoppel",
        "label": "HOA Estoppel Letter",
        "description": "Statement from HOA showing amounts owed",
        "accept": ["application/pdf", "image/jpeg", "image/png"],
        "max_files": 2,
        "required": false
      },
      {
        "key": "foreclosure_docs",
        "label": "Foreclosure Documents",
        "description": "Any legal notices, lis pendens, or court filings",
        "accept": ["application/pdf", "image/jpeg", "image/png"],
        "max_files": 10,
        "required": false
      },
      {
        "key": "lease_agreement",
        "label": "Lease Agreement",
        "description": "Current lease if property is rented",
        "accept": ["application/pdf", "image/jpeg", "image/png", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        "max_files": 3,
        "required": false
      },
      {
        "key": "insurance_docs",
        "label": "Insurance Documents",
        "description": "Declarations page, denial letters, or claims history",
        "accept": ["application/pdf", "image/jpeg", "image/png"],
        "max_files": 5,
        "required": false
      },
      {
        "key": "inspection_report",
        "label": "Inspection Reports",
        "description": "4-point, wind mitigation, or other inspection reports",
        "accept": ["application/pdf", "image/jpeg", "image/png"],
        "max_files": 5,
        "required": false
      },
      {
        "key": "property_photos",
        "label": "Property Photos",
        "description": "Current photos of interior and exterior",
        "accept": ["image/jpeg", "image/png", "image/heic", "image/webp"],
        "max_files": 20,
        "required": false
      },
      {
        "key": "title_docs",
        "label": "Title Documents",
        "description": "Deed, prior title policy, or known lien documents",
        "accept": ["application/pdf", "image/jpeg", "image/png"],
        "max_files": 10,
        "required": false
      },
      {
        "key": "other_docs",
        "label": "Other Documents",
        "description": "Any other relevant documents",
        "accept": ["application/pdf", "image/jpeg", "image/png", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        "max_files": 10,
        "required": false
      }
    ],
    "evidence_upload_config": {
      "enabled": true,
      "max_total_files": 50,
      "max_file_size_mb": 25,
      "allowed_extensions": ["pdf", "jpg", "jpeg", "png", "doc", "docx", "heic", "webp"]
    }
  }'::jsonb,
  '{
    "version": "2.0.0",
    "description": "Maps intake form fields to deal payload paths",
    "mappings": [
      {"source_field_key": "contact_name", "target_deal_path": "payload.contact.name", "transform": null, "overwrite_policy": "skip"},
      {"source_field_key": "contact_phone", "target_deal_path": "payload.contact.phone", "transform": null, "overwrite_policy": "skip"},
      {"source_field_key": "contact_email", "target_deal_path": "payload.contact.email", "transform": null, "overwrite_policy": "skip"},
      {"source_field_key": "property_address", "target_deal_path": "address", "transform": null, "overwrite_policy": "skip"},
      {"source_field_key": "property_city", "target_deal_path": "city", "transform": null, "overwrite_policy": "skip"},
      {"source_field_key": "property_state", "target_deal_path": "state", "transform": null, "overwrite_policy": "skip"},
      {"source_field_key": "property_zip", "target_deal_path": "zip", "transform": null, "overwrite_policy": "skip"},
      {"source_field_key": "property_county", "target_deal_path": "payload.property.county", "transform": null, "overwrite_policy": "skip"},
      {"source_field_key": "is_homestead", "target_deal_path": "payload.property.is_homestead", "transform": "parseBoolean", "overwrite_policy": "skip"},
      {"source_field_key": "occupancy_status", "target_deal_path": "payload.property.occupancy", "transform": null, "overwrite_policy": "skip"},
      {"source_field_key": "tenant_lease_end", "target_deal_path": "payload.property.tenant.lease_end", "transform": "parseDate", "overwrite_policy": "skip"},
      {"source_field_key": "tenant_monthly_rent", "target_deal_path": "payload.property.tenant.monthly_rent", "transform": "parseCurrency", "overwrite_policy": "skip"},
      {"source_field_key": "tenant_arrears", "target_deal_path": "payload.property.tenant.arrears", "transform": "parseCurrency", "overwrite_policy": "skip"},
      {"source_field_key": "mortgage_payoff", "target_deal_path": "payload.debt.senior_principal", "transform": "parseCurrency", "overwrite_policy": "skip"},
      {"source_field_key": "mortgage_per_diem", "target_deal_path": "payload.debt.senior_per_diem", "transform": "parseCurrency", "overwrite_policy": "skip"},
      {"source_field_key": "payoff_good_thru", "target_deal_path": "payload.debt.good_thru_date", "transform": "parseDate", "overwrite_policy": "skip"},
      {"source_field_key": "has_payoff_letter", "target_deal_path": "payload.debt.payoff_is_confirmed", "transform": "parseBoolean", "overwrite_policy": "skip"},
      {"source_field_key": "protective_advances", "target_deal_path": "payload.debt.protective_advances", "transform": "parseCurrency", "overwrite_policy": "skip"},
      {"source_field_key": "has_other_liens", "target_deal_path": "payload.debt.has_junior_liens", "transform": "parseBoolean", "overwrite_policy": "skip"},
      {"source_field_key": "junior_liens_description", "target_deal_path": "payload.debt.juniors_notes", "transform": null, "overwrite_policy": "skip"},
      {"source_field_key": "junior_liens_total", "target_deal_path": "payload.debt.juniors_total", "transform": "parseCurrency", "overwrite_policy": "skip"},
      {"source_field_key": "hoa_fees_owed", "target_deal_path": "payload.debt.hoa_estoppel_fee", "transform": "parseCurrency", "overwrite_policy": "skip"},
      {"source_field_key": "title_issues_known", "target_deal_path": "payload.title.has_issues", "transform": "parseBoolean", "overwrite_policy": "skip"},
      {"source_field_key": "title_issues_description", "target_deal_path": "payload.title.issues_notes", "transform": null, "overwrite_policy": "skip"},
      {"source_field_key": "title_cure_cost", "target_deal_path": "payload.title.cure_cost", "transform": "parseCurrency", "overwrite_policy": "skip"},
      {"source_field_key": "roof_age", "target_deal_path": "payload.property.evidence.roof_age", "transform": "parseInt", "overwrite_policy": "skip"},
      {"source_field_key": "hvac_year", "target_deal_path": "payload.property.evidence.hvac_year", "transform": "parseInt", "overwrite_policy": "skip"},
      {"source_field_key": "major_system_issues", "target_deal_path": "payload.status.system_issues", "transform": null, "overwrite_policy": "skip"},
      {"source_field_key": "unpermitted_work", "target_deal_path": "payload.status.structural_or_permit_risk_flag", "transform": "parseBoolean", "overwrite_policy": "skip"},
      {"source_field_key": "insurance_issues", "target_deal_path": "payload.status.insurability", "transform": null, "overwrite_policy": "skip"},
      {"source_field_key": "four_point_done", "target_deal_path": "payload.property.evidence.four_point.inspected", "transform": "parseBoolean", "overwrite_policy": "skip"},
      {"source_field_key": "interior_access", "target_deal_path": "payload.confidence.has_interior_access", "transform": "parseBoolean", "overwrite_policy": "skip"},
      {"source_field_key": "condition_notes", "target_deal_path": "payload.condition.notes", "transform": null, "overwrite_policy": "skip"},
      {"source_field_key": "in_foreclosure", "target_deal_path": "payload.property.is_foreclosure_sale", "transform": "parseBoolean", "overwrite_policy": "skip"},
      {"source_field_key": "foreclosure_stage", "target_deal_path": "payload.legal.foreclosure_stage", "transform": null, "overwrite_policy": "skip"},
      {"source_field_key": "foreclosure_case_no", "target_deal_path": "payload.legal.case_no", "transform": null, "overwrite_policy": "skip"},
      {"source_field_key": "auction_date", "target_deal_path": "payload.timeline.auction_date", "transform": "parseDate", "overwrite_policy": "skip"},
      {"source_field_key": "in_redemption_period", "target_deal_path": "payload.property.is_redemption_period_sale", "transform": "parseBoolean", "overwrite_policy": "skip"},
      {"source_field_key": "reinstatement_available", "target_deal_path": "payload.confidence.reinstatement_proof_flag", "transform": "parseBoolean", "overwrite_policy": "skip"},
      {"source_field_key": "bankruptcy_filed", "target_deal_path": "payload.legal.bankruptcy_filed", "transform": "parseBoolean", "overwrite_policy": "skip"},
      {"source_field_key": "bankruptcy_case_no", "target_deal_path": "payload.legal.bankruptcy_case_no", "transform": null, "overwrite_policy": "skip"},
      {"source_field_key": "reason_for_selling", "target_deal_path": "payload.seller.motivation", "transform": null, "overwrite_policy": "skip"},
      {"source_field_key": "urgency_timeline", "target_deal_path": "payload.seller.urgency", "transform": null, "overwrite_policy": "skip"},
      {"source_field_key": "asking_price", "target_deal_path": "payload.seller.asking_price", "transform": "parseCurrency", "overwrite_policy": "skip"},
      {"source_field_key": "additional_notes", "target_deal_path": "payload.seller.notes", "transform": null, "overwrite_policy": "skip"}
    ],
    "evidence_mappings": [
      {"source_upload_key": "payoff_letter", "target_evidence_kind": "payoff_letter"},
      {"source_upload_key": "mortgage_statement", "target_evidence_kind": "mortgage_statement"},
      {"source_upload_key": "hoa_estoppel", "target_evidence_kind": "hoa_estoppel"},
      {"source_upload_key": "foreclosure_docs", "target_evidence_kind": "foreclosure_docs"},
      {"source_upload_key": "lease_agreement", "target_evidence_kind": "lease_agreement"},
      {"source_upload_key": "insurance_docs", "target_evidence_kind": "insurance_docs"},
      {"source_upload_key": "inspection_report", "target_evidence_kind": "inspection_report"},
      {"source_upload_key": "property_photos", "target_evidence_kind": "property_photos"},
      {"source_upload_key": "title_docs", "target_evidence_kind": "title_docs"},
      {"source_upload_key": "other_docs", "target_evidence_kind": "other_docs"}
    ]
  }'::jsonb,
  true,  -- is_active
  NULL   -- created_by (system seed)
);

-- Confirm insertion
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.intake_schema_versions
  WHERE org_id = '033ff93d-ff97-4af9-b3a1-a114d3c04da6'
    AND semantic_version = '2.0.0';

  IF v_count = 1 THEN
    RAISE NOTICE 'SUCCESS: Comprehensive Client Intake v2.0.0 created with 8 sections and 10 upload categories';
  ELSE
    RAISE EXCEPTION 'FAILED: Schema was not inserted properly';
  END IF;
END;
$$ LANGUAGE plpgsql;
