-- Migration: Add market conditions and seller strike price to intake schemas
-- Slice 10: Input Field Additions for V2.5 Dashboard

-- This migration updates existing intake_schema_versions to include:
-- 1. seller_strike_price field in the seller_info section
-- 2. New market_conditions section with absorption_rate and cash_buyer_share_pct
-- 3. Corresponding field mappings

DO $$
DECLARE
  v_schema_rec RECORD;
  v_updated_schema_public JSONB;
  v_updated_mapping_private JSONB;
  v_seller_info_section JSONB;
  v_new_seller_fields JSONB;
  v_market_conditions_section JSONB;
  v_new_mappings JSONB;
  v_existing_sections JSONB;
  v_existing_mappings JSONB;
  v_section_idx INTEGER;
BEGIN
  -- Define the new fields and sections
  v_market_conditions_section := '{
    "id": "market_conditions",
    "title": "Market Conditions (Optional)",
    "description": "If you have market data available, please provide it below.",
    "fields": [
      {"key": "absorption_rate", "label": "Absorption Rate (months)", "type": "number", "required": false, "helpText": "Average months of inventory on the market", "min": 0, "max": 36},
      {"key": "cash_buyer_share_pct", "label": "Cash Buyer Share (%)", "type": "number", "required": false, "helpText": "Percentage of buyers paying cash in this market", "min": 0, "max": 100}
    ]
  }'::jsonb;

  v_new_mappings := '[
    {"source_field_key": "seller_strike_price", "target_deal_path": "payload.seller.strike_price", "transform": "parseCurrency", "overwrite_policy": "skip"},
    {"source_field_key": "absorption_rate", "target_deal_path": "payload.market_conditions.absorption_rate", "transform": "parseFloat", "overwrite_policy": "skip"},
    {"source_field_key": "cash_buyer_share_pct", "target_deal_path": "payload.market_conditions.cash_buyer_share_pct", "transform": "parseFloat", "overwrite_policy": "skip"}
  ]'::jsonb;

  -- Loop through all intake schema versions
  FOR v_schema_rec IN
    SELECT id, schema_public_json, mapping_private_json
    FROM public.intake_schema_versions
  LOOP
    v_updated_schema_public := v_schema_rec.schema_public_json;
    v_updated_mapping_private := v_schema_rec.mapping_private_json;
    v_existing_sections := v_schema_rec.schema_public_json->'sections';
    v_existing_mappings := v_schema_rec.mapping_private_json->'mappings';

    -- Check if seller_strike_price already exists in seller_info section
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_existing_sections) section
      WHERE section->>'id' = 'seller_info'
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(section->'fields') field
          WHERE field->>'key' = 'seller_strike_price'
        )
    ) THEN
      -- Find the seller_info section and add seller_strike_price field
      FOR v_section_idx IN 0..jsonb_array_length(v_existing_sections) - 1 LOOP
        IF v_existing_sections->v_section_idx->>'id' = 'seller_info' THEN
          v_seller_info_section := v_existing_sections->v_section_idx;
          v_new_seller_fields := v_seller_info_section->'fields' || '[{"key": "seller_strike_price", "label": "Minimum Acceptable Price", "type": "currency", "required": false, "helpText": "The lowest price you would consider accepting"}]'::jsonb;
          v_seller_info_section := jsonb_set(v_seller_info_section, '{fields}', v_new_seller_fields);
          v_existing_sections := jsonb_set(v_existing_sections, ARRAY[v_section_idx::text], v_seller_info_section);
          v_updated_schema_public := jsonb_set(v_updated_schema_public, '{sections}', v_existing_sections);
          EXIT;
        END IF;
      END LOOP;
    END IF;

    -- Check if market_conditions section already exists
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_updated_schema_public->'sections') section
      WHERE section->>'id' = 'market_conditions'
    ) THEN
      -- Find the position after seller_info to insert market_conditions
      v_existing_sections := v_updated_schema_public->'sections';
      v_section_idx := 0;
      FOR v_section_idx IN 0..jsonb_array_length(v_existing_sections) - 1 LOOP
        IF v_existing_sections->v_section_idx->>'id' = 'seller_info' THEN
          -- Insert market_conditions after seller_info
          v_existing_sections := (
            SELECT jsonb_agg(elem)
            FROM (
              SELECT elem, row_number() OVER () AS idx
              FROM (
                SELECT jsonb_array_elements(v_existing_sections) AS elem
              ) sub
            ) sub2
            ORDER BY
              CASE WHEN idx <= v_section_idx + 1 THEN idx ELSE idx + 1 END,
              CASE WHEN idx = v_section_idx + 1 THEN 1 ELSE 0 END
          );
          -- Simpler approach: rebuild array with insertion
          EXIT;
        END IF;
      END LOOP;

      -- Simpler approach: just append the section at the end if seller_info not found,
      -- or after first section otherwise
      v_existing_sections := v_updated_schema_public->'sections';
      IF jsonb_array_length(v_existing_sections) >= 1 THEN
        -- Insert after first section (index 1)
        v_updated_schema_public := jsonb_set(
          v_updated_schema_public,
          '{sections}',
          (
            SELECT jsonb_agg(section ORDER BY idx)
            FROM (
              SELECT section, idx FROM (
                SELECT section, ROW_NUMBER() OVER () AS idx
                FROM jsonb_array_elements(v_existing_sections) section
              ) t
              UNION ALL
              SELECT v_market_conditions_section, 1.5
            ) combined(section, idx)
          )
        );
      ELSE
        v_updated_schema_public := jsonb_set(
          v_updated_schema_public,
          '{sections}',
          v_existing_sections || jsonb_build_array(v_market_conditions_section)
        );
      END IF;
    END IF;

    -- Add new mappings if they don't exist
    FOR v_section_idx IN 0..jsonb_array_length(v_new_mappings) - 1 LOOP
      IF NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_existing_mappings) mapping
        WHERE mapping->>'source_field_key' = v_new_mappings->v_section_idx->>'source_field_key'
      ) THEN
        v_existing_mappings := v_existing_mappings || jsonb_build_array(v_new_mappings->v_section_idx);
      END IF;
    END LOOP;

    v_updated_mapping_private := jsonb_set(v_updated_mapping_private, '{mappings}', v_existing_mappings);

    -- Update the schema version
    UPDATE public.intake_schema_versions
    SET
      schema_public_json = v_updated_schema_public,
      mapping_private_json = v_updated_mapping_private,
      updated_at = NOW()
    WHERE id = v_schema_rec.id;

    RAISE NOTICE 'Updated intake schema version: %', v_schema_rec.id;
  END LOOP;

  RAISE NOTICE 'Migration complete: Added market conditions fields to all intake schemas';
END;
$$ LANGUAGE plpgsql;
