-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Underwrite Page Enhancements
-- Slice: 01 of 22
-- Created: 2026-01-10
-- Description: Add columns for enhanced underwriting (motivation, foreclosure, liens, systems)
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ENUMS (8 total)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Reason for selling (motivation indicator)
DO $$ BEGIN
  CREATE TYPE reason_for_selling AS ENUM (
    'foreclosure',
    'pre_foreclosure',
    'divorce',
    'probate',
    'relocation',
    'downsizing',
    'financial_distress',
    'tired_landlord',
    'inherited',
    'tax_lien',
    'code_violations',
    'health_issues',
    'job_loss',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Seller timeline urgency
DO $$ BEGIN
  CREATE TYPE seller_timeline AS ENUM (
    'immediate',      -- < 2 weeks
    'urgent',         -- 2-4 weeks
    'flexible',       -- 1-3 months
    'no_rush',        -- 3+ months
    'testing_market'  -- Red flag: not motivated
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Decision maker status
DO $$ BEGIN
  CREATE TYPE decision_maker_status AS ENUM (
    'sole_owner',
    'joint_decision',
    'power_of_attorney',
    'estate_executor',
    'multiple_parties',
    'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Foreclosure status (FL-specific stages)
DO $$ BEGIN
  CREATE TYPE foreclosure_status AS ENUM (
    'none',
    'pre_foreclosure',
    'lis_pendens_filed',
    'judgment_entered',
    'sale_scheduled',
    'post_sale_redemption',
    'reo_bank_owned'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. Lien status
DO $$ BEGIN
  CREATE TYPE lien_status AS ENUM (
    'none',
    'current',
    'delinquent',
    'in_arrears',
    'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. Property tax status
DO $$ BEGIN
  CREATE TYPE tax_status AS ENUM (
    'current',
    'delinquent_1_year',
    'delinquent_2_years',
    'delinquent_3_plus',
    'tax_deed_pending',
    'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7. Property condition
DO $$ BEGIN
  CREATE TYPE property_condition AS ENUM (
    'excellent',
    'good',
    'fair',
    'poor',
    'distressed',
    'uninhabitable'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 8. Deferred maintenance level
DO $$ BEGIN
  CREATE TYPE deferred_maintenance AS ENUM (
    'none',
    'minor',
    'moderate',
    'significant',
    'extensive'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: deals - Add new columns (29 total)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Seller Situation Fields (7 columns)
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS reason_for_selling reason_for_selling;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS seller_timeline seller_timeline;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS lowest_acceptable_price numeric(12,2);
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS decision_maker_status decision_maker_status;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS mortgage_delinquent boolean DEFAULT false;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS listed_with_agent boolean DEFAULT false;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS seller_notes text;

-- Foreclosure Fields (6 columns)
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS foreclosure_status foreclosure_status DEFAULT 'none';
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS days_delinquent integer;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS first_missed_payment_date date;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS lis_pendens_date date;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS judgment_date date;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS auction_date date;

-- Lien Risk Fields (11 columns)
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS hoa_status lien_status;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS hoa_arrears_amount numeric(10,2);
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS hoa_monthly_assessment numeric(8,2);
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS cdd_status lien_status;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS cdd_arrears_amount numeric(10,2);
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS property_tax_status tax_status;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS property_tax_arrears numeric(10,2);
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS municipal_liens_present boolean DEFAULT false;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS municipal_lien_amount numeric(10,2);
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS title_search_completed boolean DEFAULT false;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS title_issues_notes text;

-- Property Systems Fields (5 columns)
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS overall_condition property_condition;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS deferred_maintenance_level deferred_maintenance;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS roof_year_installed integer;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS hvac_year_installed integer;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS water_heater_year_installed integer;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: engine_outputs - Create table with enhanced output fields (14 columns)
-- Note: This table stores computed results from underwriting runs
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.engine_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  org_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Motivation fields (4 columns)
  motivation_score integer,
  motivation_level text,
  motivation_confidence text,
  motivation_red_flags jsonb DEFAULT '[]'::jsonb,

  -- Foreclosure fields (4 columns)
  foreclosure_timeline_position text,
  foreclosure_days_until_sale integer,
  foreclosure_urgency_level text,
  foreclosure_motivation_boost integer DEFAULT 0,

  -- Lien fields (4 columns)
  lien_total_surviving numeric(12,2) DEFAULT 0,
  lien_risk_level text,
  lien_joint_liability_warning boolean DEFAULT false,
  lien_blocking_gate boolean DEFAULT false,

  -- Systems fields (2 columns)
  systems_total_replacement_cost numeric(10,2) DEFAULT 0,
  systems_urgent_replacements jsonb DEFAULT '[]'::jsonb
);

-- Enable RLS on engine_outputs
ALTER TABLE public.engine_outputs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for engine_outputs (org-scoped, matching runs table pattern)
CREATE POLICY engine_outputs_select_in_org ON public.engine_outputs
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.org_id = engine_outputs.org_id AND m.user_id = auth.uid()
  ));

CREATE POLICY engine_outputs_insert_in_org ON public.engine_outputs
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.org_id = engine_outputs.org_id AND m.user_id = auth.uid()
  ));

CREATE POLICY engine_outputs_update_in_org ON public.engine_outputs
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.org_id = engine_outputs.org_id AND m.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.org_id = engine_outputs.org_id AND m.user_id = auth.uid()
  ));

-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEXES (3 for deals, 2 for engine_outputs)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Index for foreclosure queries
CREATE INDEX IF NOT EXISTS idx_deals_foreclosure_status
  ON public.deals(foreclosure_status)
  WHERE foreclosure_status != 'none';

-- Index for auction date queries
CREATE INDEX IF NOT EXISTS idx_deals_auction_date
  ON public.deals(auction_date)
  WHERE auction_date IS NOT NULL;

-- Index for high-motivation deals
CREATE INDEX IF NOT EXISTS idx_engine_outputs_motivation
  ON public.engine_outputs(motivation_score DESC)
  WHERE motivation_score >= 70;

-- Index for engine_outputs by run
CREATE INDEX IF NOT EXISTS idx_engine_outputs_run_id
  ON public.engine_outputs(run_id);

-- Index for engine_outputs by deal
CREATE INDEX IF NOT EXISTS idx_engine_outputs_deal_id
  ON public.engine_outputs(deal_id)
  WHERE deal_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- COMMENTS (Documentation)
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON COLUMN public.deals.reason_for_selling IS 'Primary motivation indicator for seller';
COMMENT ON COLUMN public.deals.seller_timeline IS 'Urgency level for closing';
COMMENT ON COLUMN public.deals.lowest_acceptable_price IS 'Seller strike price (minimum they will accept)';
COMMENT ON COLUMN public.deals.foreclosure_status IS 'Current stage in FL foreclosure process';
COMMENT ON COLUMN public.deals.lis_pendens_date IS 'Date lis pendens filed (FL 702.10)';
COMMENT ON COLUMN public.deals.judgment_date IS 'Date final judgment entered (FL 45.031)';
COMMENT ON COLUMN public.deals.hoa_arrears_amount IS 'Outstanding HOA balance (FL 720.3085 joint liability)';
COMMENT ON COLUMN public.deals.cdd_arrears_amount IS 'Outstanding CDD balance (joint liability applies)';

COMMENT ON TABLE public.engine_outputs IS 'Computed underwriting results for each run';
COMMENT ON COLUMN public.engine_outputs.motivation_score IS 'Computed motivation score 0-100';
COMMENT ON COLUMN public.engine_outputs.lien_joint_liability_warning IS 'FL 720.3085 buyer liability warning';
COMMENT ON COLUMN public.engine_outputs.lien_blocking_gate IS 'True if liens exceed $10K threshold';

COMMIT;
