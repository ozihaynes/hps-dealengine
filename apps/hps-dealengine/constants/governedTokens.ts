// Tokens that require manager/vp/owner approval before changing.
export const GOVERNED_TOKENS = [
  "policy.min_spread",
  "policy.safety_on_aiv_pct",
  "policy.assignment_fee_target",
  "costs.concessions_pct",
  "policy.manual_days_to_money",
] as const;

export type GovernedToken = (typeof GOVERNED_TOKENS)[number];

export function isGovernedToken(token: string): token is GovernedToken {
  return GOVERNED_TOKENS.includes(token as GovernedToken);
}

export function canEditGoverned(role?: string | null): boolean {
  const r = (role ?? "").toLowerCase();
  return r === "manager" || r === "vp" || r === "owner";
}

export function governedLabel(token: GovernedToken): string {
  const map: Record<GovernedToken, string> = {
    "policy.min_spread": "Minimum spread",
    "policy.safety_on_aiv_pct": "Safety on AIV %",
    "policy.assignment_fee_target": "Assignment fee target",
    "costs.concessions_pct": "Seller concessions %",
    "policy.manual_days_to_money": "Manual days to money",
  };
  return map[token];
}
