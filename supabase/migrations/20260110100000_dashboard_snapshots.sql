-- Migration: 20260102000000_dashboard_snapshots.sql
-- Purpose: Create dashboard_snapshots table for Command Center V2.1
-- Author: Claude Code
-- Date: 2026-01-02

-- ============================================================================
-- TABLE: dashboard_snapshots
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.dashboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  run_id UUID NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,

  -- L2 Composite Scores (0-100 scale)
  closeability_index SMALLINT CHECK (closeability_index >= 0 AND closeability_index <= 100),
  urgency_score SMALLINT CHECK (urgency_score >= 0 AND urgency_score <= 100),
  risk_adjusted_spread INTEGER,
  buyer_demand_index SMALLINT CHECK (buyer_demand_index >= 0 AND buyer_demand_index <= 100),

  -- Supporting Metrics
  evidence_grade VARCHAR(1) CHECK (evidence_grade IN ('A', 'B', 'C')),
  payoff_buffer_pct NUMERIC(5,2),
  gate_health_score SMALLINT CHECK (gate_health_score >= 0 AND gate_health_score <= 100),

  -- Verdict
  verdict VARCHAR(25) NOT NULL CHECK (verdict IN ('GO', 'PROCEED_WITH_CAUTION', 'HOLD', 'PASS')),
  verdict_reasons TEXT[] DEFAULT '{}',

  -- Banded Classifications
  urgency_band VARCHAR(15) CHECK (urgency_band IN ('emergency', 'critical', 'active', 'steady')),
  market_temp_band VARCHAR(15) CHECK (market_temp_band IN ('hot', 'warm', 'cool', 'cold')),
  buyer_demand_band VARCHAR(15) CHECK (buyer_demand_band IN ('hot', 'warm', 'cool', 'cold')),
  payoff_buffer_band VARCHAR(15) CHECK (payoff_buffer_band IN ('safe', 'warning', 'shortfall')),
  gate_health_band VARCHAR(15) CHECK (gate_health_band IN ('healthy', 'caution', 'blocked')),

  -- Active Signals
  active_signals JSONB DEFAULT '[]'::jsonb,
  signals_critical_count SMALLINT DEFAULT 0 CHECK (signals_critical_count >= 0),
  signals_warning_count SMALLINT DEFAULT 0 CHECK (signals_warning_count >= 0),
  signals_info_count SMALLINT DEFAULT 0 CHECK (signals_info_count >= 0),

  -- Computation Trace (for debugging/audit)
  computation_trace JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  as_of TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one snapshot per deal+run combination
  CONSTRAINT dashboard_snapshots_deal_run_unique UNIQUE (deal_id, run_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_org_id ON public.dashboard_snapshots(org_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_deal_id ON public.dashboard_snapshots(deal_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_run_id ON public.dashboard_snapshots(run_id);

-- Filter indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_verdict ON public.dashboard_snapshots(verdict);
CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_urgency_band ON public.dashboard_snapshots(urgency_band);
CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_as_of ON public.dashboard_snapshots(as_of DESC);

-- Composite indexes for portfolio queries
CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_portfolio ON public.dashboard_snapshots(org_id, verdict, urgency_band, as_of DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_deal_latest ON public.dashboard_snapshots(deal_id, as_of DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.dashboard_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access snapshots for their organization(s)
CREATE POLICY "dashboard_snapshots_org_isolation"
  ON public.dashboard_snapshots
  FOR ALL
  USING (
    org_id IN (
      SELECT m.org_id
      FROM public.memberships m
      WHERE m.user_id = auth.uid()
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- updated_at trigger (uses shared helper function)
DROP TRIGGER IF EXISTS dashboard_snapshots_updated_at ON public.dashboard_snapshots;
CREATE TRIGGER dashboard_snapshots_updated_at
  BEFORE UPDATE ON public.dashboard_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.dashboard_snapshots IS 'Precomputed Command Center V2.1 dashboard snapshots for sub-100ms reads.';
COMMENT ON COLUMN public.dashboard_snapshots.closeability_index IS 'L2 composite score (0-100): Likelihood of successful close based on risk, evidence, and timeline.';
COMMENT ON COLUMN public.dashboard_snapshots.urgency_score IS 'L2 composite score (0-100): Time pressure from DTM, auction dates, and market conditions.';
COMMENT ON COLUMN public.dashboard_snapshots.risk_adjusted_spread IS 'Spread dollars adjusted by risk gate statuses and confidence grade.';
COMMENT ON COLUMN public.dashboard_snapshots.buyer_demand_index IS 'L2 composite score (0-100): Market liquidity from DOM, MOI, and price-to-list ratio.';
COMMENT ON COLUMN public.dashboard_snapshots.verdict IS 'Decision classification: GO, PROCEED_WITH_CAUTION, HOLD, PASS.';
COMMENT ON COLUMN public.dashboard_snapshots.active_signals IS 'Array of active signal objects with severity, message, and resolution hints.';
COMMENT ON COLUMN public.dashboard_snapshots.computation_trace IS 'Debug trace of L2 score derivation for audit and explainability.';

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_snapshots TO authenticated;
