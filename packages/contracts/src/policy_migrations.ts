import type { Settings } from './settings';

/**
 * Maps a few legacy keys (e.g., aiv.hardCapPct) into the new token-based schema.
 * We intentionally DO NOT carry numeric values forward — we replace with tokens.
 * This keeps the "no invented numbers" rule intact.
 */
export function legacyPolicyMap(raw: any): Partial<Settings> {
  if (!raw || typeof raw !== 'object') return {};
  const out: any = { aiv: {}, carry: {}, fees: {}, floors: {}, evidence: {} };

  // AIV
  const legacyAiv = raw.aiv ?? raw.AIV ?? {};
  if (legacyAiv.hardCapPct !== undefined) {
    out.aiv.safety_cap_pct_token = '<AIV_CAP_PCT>';
  }
  if (legacyAiv.softMaxAgeDays !== undefined) {
    out.aiv.soft_max_comps_age_days_token = '<AIV_SOFT_MAX_AGE_DAYS>';
  }
  if (
    legacyAiv.overrideNeedsBindableInsurance !== undefined ||
    legacyAiv.overrideRole !== undefined
  ) {
    out.aiv.cap_override = {
      approval_role: legacyAiv.overrideRole ?? 'Owner',
      requires_bindable_insurance: Boolean(legacyAiv.overrideNeedsBindableInsurance ?? true),
    };
  }

  // Carry
  const legacyCarry = raw.carry ?? {};
  if (legacyCarry.monthsHardCap !== undefined) {
    out.carry.months_cap_token = '<CARRY_MONTHS_CAP>';
  }
  if (legacyCarry.domToMonthsRule !== undefined) {
    out.carry.dom_add_days_default_token = '<DOM_TO_MONTHS_RULE>';
  }

  // Fees
  const legacyFees = raw.fees ?? {};
  if (legacyFees.list_commission_pct !== undefined)
    out.fees.list_commission_pct_token = '<LIST_COMM_PCT>';
  if (legacyFees.concessions_pct !== undefined)
    out.fees.concessions_pct_token = '<CONCESSIONS_PCT>';
  if (legacyFees.sell_close_pct !== undefined) out.fees.sell_close_pct_token = '<SELL_CLOSE_PCT>';

  // Floors/Ceilings
  const legacyFloors = raw.floors ?? raw.floorsCeilings ?? {};
  if (typeof legacyFloors.respect_floor_enabled === 'boolean') {
    out.floors.respect_floor_enabled = legacyFloors.respect_floor_enabled;
  }

  // Evidence (pass-through structure only)
  if (raw.evidence && typeof raw.evidence === 'object') out.evidence = { ...raw.evidence };

  return out as Partial<Settings>;
}
