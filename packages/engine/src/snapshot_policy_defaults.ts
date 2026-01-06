/**
 * Command Center V2.1 - Snapshot Policy Defaults
 * Default values for L2 score computations.
 * These can be overridden by org/posture policy settings.
 */

export const SNAPSHOT_POLICY_DEFAULTS = {
  // Closeability thresholds
  closeability_advance_threshold: 85,
  closeability_caution_threshold: 70,
  closeability_hold_threshold: 50,

  // Payoff thresholds
  payoff_safety_threshold_pct: 10,
  payoff_warning_threshold_pct: 5,

  // Risk penalties (as decimals)
  risk_penalty_structural_pct: 0.15,
  risk_penalty_flood_pct: 0.10,
  risk_penalty_tenant_pct: 0.08,
  risk_penalty_title_pct: 0.12,
  risk_penalty_insurance_pct: 0.10,
  risk_penalty_max_total_pct: 0.50,

  // Urgency thresholds
  urgency_emergency_threshold: 85,
  urgency_critical_threshold: 70,
  urgency_active_threshold: 50,

  // Confidence multipliers
  confidence_multiplier_a: 1.00,
  confidence_multiplier_b: 0.90,
  confidence_multiplier_c: 0.75,

  // Verdict requirements
  verdict_min_spread: 10000,

  // Evidence freshness
  evidence_freshness_limit_days: 30,
  evidence_critical_limit_days: 90,

  // Buyer demand thresholds
  buyer_demand_hot_threshold: 80,
  buyer_demand_warm_threshold: 60,
  buyer_demand_cool_threshold: 40,
} as const;

export type SnapshotPolicyDefaults = typeof SNAPSHOT_POLICY_DEFAULTS;

/**
 * Merge policy snapshot with defaults
 */
export function mergeWithDefaults(
  policySnapshot: Record<string, unknown> | null | undefined
): SnapshotPolicyDefaults {
  if (!policySnapshot) {
    return { ...SNAPSHOT_POLICY_DEFAULTS };
  }

  const merged = { ...SNAPSHOT_POLICY_DEFAULTS } as Record<string, number>;

  const pathMappings: Record<string, keyof typeof SNAPSHOT_POLICY_DEFAULTS> = {
    'workflow_policy.closeability_advance_threshold': 'closeability_advance_threshold',
    'workflow_policy.closeability_caution_threshold': 'closeability_caution_threshold',
    'workflow_policy.closeability_hold_threshold': 'closeability_hold_threshold',
    'payoff_policy.safety_threshold_pct': 'payoff_safety_threshold_pct',
    'payoff_policy.warning_threshold_pct': 'payoff_warning_threshold_pct',
    'risk_penalties.structural': 'risk_penalty_structural_pct',
    'risk_penalties.flood': 'risk_penalty_flood_pct',
    'risk_penalties.tenant': 'risk_penalty_tenant_pct',
    'risk_penalties.title': 'risk_penalty_title_pct',
    'risk_penalties.insurance': 'risk_penalty_insurance_pct',
    'risk_penalties.max_total': 'risk_penalty_max_total_pct',
    'workflow_policy.verdict_min_spread': 'verdict_min_spread',
  };

  for (const [path, key] of Object.entries(pathMappings)) {
    const value = getNestedValue(policySnapshot, path);
    if (value !== undefined && value !== null && typeof value === 'number') {
      merged[key] = value;
    }
  }

  return merged as unknown as SnapshotPolicyDefaults;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}
