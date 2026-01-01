-- supabase/bootstrap/intake_schema_seed.sql
-- Idempotent seed for dev intake schema version.
-- Run after dev_org_seed.sql to create a usable intake form.

DO $$
DECLARE
  v_org_id UUID;
BEGIN
  -- 1) Look up the dev organization
  SELECT id INTO v_org_id
  FROM public.organizations
  WHERE name = 'HPS Dev Org'
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'intake_schema_seed: HPS Dev Org not found. Run dev_org_seed.sql first.';
  END IF;

  -- 2) Insert the default intake schema version if it doesn't exist
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
    v_org_id,
    '1.0.0',
    'Standard Client Intake v1',
    'Initial intake form for distressed SFR deals - collects seller info, property details, and financial situation.',
    '{
      "version": "1.0.0",
      "title": "Property Information Form",
      "sections": [
        {
          "id": "seller_info",
          "title": "Seller Information",
          "fields": [
            {"key": "seller_name", "label": "Full Name", "type": "text", "required": true},
            {"key": "seller_email", "label": "Email Address", "type": "email", "required": true},
            {"key": "seller_phone", "label": "Phone Number", "type": "phone", "required": true},
            {"key": "seller_address", "label": "Current Address", "type": "text", "required": false}
          ]
        },
        {
          "id": "property_info",
          "title": "Property Details",
          "fields": [
            {"key": "property_address", "label": "Property Address", "type": "text", "required": true},
            {"key": "property_city", "label": "City", "type": "text", "required": true},
            {"key": "property_state", "label": "State", "type": "select", "required": true, "options": ["FL"]},
            {"key": "property_zip", "label": "ZIP Code", "type": "text", "required": true},
            {"key": "property_type", "label": "Property Type", "type": "select", "required": true, "options": ["Single Family", "Townhome", "Condo"]},
            {"key": "bedrooms", "label": "Bedrooms", "type": "number", "required": true},
            {"key": "bathrooms", "label": "Bathrooms", "type": "number", "required": true},
            {"key": "sqft", "label": "Square Footage", "type": "number", "required": false},
            {"key": "year_built", "label": "Year Built", "type": "number", "required": false}
          ]
        },
        {
          "id": "financial_info",
          "title": "Financial Situation",
          "fields": [
            {"key": "asking_price", "label": "Asking Price", "type": "currency", "required": false},
            {"key": "mortgage_balance", "label": "Mortgage Balance Owed", "type": "currency", "required": false},
            {"key": "monthly_payment", "label": "Monthly Mortgage Payment", "type": "currency", "required": false},
            {"key": "behind_on_payments", "label": "Behind on Payments?", "type": "select", "required": false, "options": ["No", "1-2 months", "3-6 months", "6+ months"]},
            {"key": "in_foreclosure", "label": "Currently in Foreclosure?", "type": "boolean", "required": true},
            {"key": "foreclosure_sale_date", "label": "Foreclosure Sale Date", "type": "date", "required": false}
          ]
        },
        {
          "id": "condition_info",
          "title": "Property Condition",
          "fields": [
            {"key": "overall_condition", "label": "Overall Condition", "type": "select", "required": true, "options": ["Excellent", "Good", "Fair", "Poor", "Needs Major Repairs"]},
            {"key": "roof_age", "label": "Roof Age (years)", "type": "number", "required": false},
            {"key": "hvac_age", "label": "HVAC Age (years)", "type": "number", "required": false},
            {"key": "repair_notes", "label": "Known Repairs Needed", "type": "textarea", "required": false}
          ]
        },
        {
          "id": "motivation_info",
          "title": "Selling Situation",
          "fields": [
            {"key": "reason_for_selling", "label": "Reason for Selling", "type": "select", "required": true, "options": ["Foreclosure", "Divorce", "Relocation", "Inherited", "Financial Hardship", "Other"]},
            {"key": "timeline", "label": "Desired Timeline", "type": "select", "required": true, "options": ["ASAP", "30 days", "60 days", "90+ days", "Flexible"]},
            {"key": "additional_notes", "label": "Anything Else We Should Know?", "type": "textarea", "required": false}
          ]
        }
      ],
      "evidence_uploads": [
        {"key": "photos", "label": "Property Photos", "accept": ["image/jpeg", "image/png"], "max_files": 10, "required": false},
        {"key": "mortgage_statement", "label": "Recent Mortgage Statement", "accept": ["application/pdf", "image/jpeg", "image/png"], "max_files": 2, "required": false},
        {"key": "foreclosure_docs", "label": "Foreclosure Documents (if applicable)", "accept": ["application/pdf"], "max_files": 5, "required": false}
      ]
    }'::jsonb,
    '{
      "version": "1.0.0",
      "mappings": [
        {"source_field_key": "seller_name", "target_deal_path": "payload.client.name", "transform": null, "overwrite_policy": "skip"},
        {"source_field_key": "seller_email", "target_deal_path": "payload.client.email", "transform": null, "overwrite_policy": "skip"},
        {"source_field_key": "seller_phone", "target_deal_path": "payload.client.phone", "transform": null, "overwrite_policy": "skip"},
        {"source_field_key": "property_address", "target_deal_path": "address", "transform": null, "overwrite_policy": "skip"},
        {"source_field_key": "property_city", "target_deal_path": "city", "transform": null, "overwrite_policy": "skip"},
        {"source_field_key": "property_state", "target_deal_path": "state", "transform": null, "overwrite_policy": "skip"},
        {"source_field_key": "property_zip", "target_deal_path": "zip", "transform": null, "overwrite_policy": "skip"},
        {"source_field_key": "property_type", "target_deal_path": "payload.property.type", "transform": null, "overwrite_policy": "skip"},
        {"source_field_key": "bedrooms", "target_deal_path": "payload.property.bedrooms", "transform": "parseInt", "overwrite_policy": "skip"},
        {"source_field_key": "bathrooms", "target_deal_path": "payload.property.bathrooms", "transform": "parseFloat", "overwrite_policy": "skip"},
        {"source_field_key": "sqft", "target_deal_path": "payload.property.sqft", "transform": "parseInt", "overwrite_policy": "skip"},
        {"source_field_key": "year_built", "target_deal_path": "payload.property.year_built", "transform": "parseInt", "overwrite_policy": "skip"},
        {"source_field_key": "asking_price", "target_deal_path": "payload.financial.asking_price", "transform": "parseCurrency", "overwrite_policy": "skip"},
        {"source_field_key": "mortgage_balance", "target_deal_path": "payload.financial.mortgage_balance", "transform": "parseCurrency", "overwrite_policy": "skip"},
        {"source_field_key": "monthly_payment", "target_deal_path": "payload.financial.monthly_payment", "transform": "parseCurrency", "overwrite_policy": "skip"},
        {"source_field_key": "behind_on_payments", "target_deal_path": "payload.financial.behind_on_payments", "transform": null, "overwrite_policy": "skip"},
        {"source_field_key": "in_foreclosure", "target_deal_path": "payload.financial.in_foreclosure", "transform": "parseBoolean", "overwrite_policy": "skip"},
        {"source_field_key": "foreclosure_sale_date", "target_deal_path": "payload.financial.foreclosure_sale_date", "transform": "parseDate", "overwrite_policy": "skip"},
        {"source_field_key": "overall_condition", "target_deal_path": "payload.condition.overall", "transform": null, "overwrite_policy": "skip"},
        {"source_field_key": "roof_age", "target_deal_path": "payload.condition.roof_age_years", "transform": "parseInt", "overwrite_policy": "skip"},
        {"source_field_key": "hvac_age", "target_deal_path": "payload.condition.hvac_age_years", "transform": "parseInt", "overwrite_policy": "skip"},
        {"source_field_key": "repair_notes", "target_deal_path": "payload.condition.repair_notes", "transform": null, "overwrite_policy": "skip"},
        {"source_field_key": "reason_for_selling", "target_deal_path": "payload.motivation.reason", "transform": null, "overwrite_policy": "skip"},
        {"source_field_key": "timeline", "target_deal_path": "payload.motivation.timeline", "transform": null, "overwrite_policy": "skip"},
        {"source_field_key": "additional_notes", "target_deal_path": "payload.motivation.notes", "transform": null, "overwrite_policy": "skip"}
      ],
      "evidence_mappings": [
        {"source_upload_key": "photos", "target_evidence_kind": "property_photos"},
        {"source_upload_key": "mortgage_statement", "target_evidence_kind": "mortgage_statement"},
        {"source_upload_key": "foreclosure_docs", "target_evidence_kind": "foreclosure_docs"}
      ]
    }'::jsonb,
    true,  -- is_active
    NULL   -- created_by (system seed)
  )
  ON CONFLICT (org_id, semantic_version) DO NOTHING;

  RAISE NOTICE 'intake_schema_seed: Created Standard Client Intake v1.0.0 for org %', v_org_id;
END;
$$ LANGUAGE plpgsql;
