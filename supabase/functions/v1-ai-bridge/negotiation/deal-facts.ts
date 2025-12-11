import {
  MarketTempLabel,
  NegotiationDealFacts,
  RiskFlag,
  TimelineUrgency,
  ZipSpeedBand,
} from "./matrix-types.ts";

export type NegotiationSourceContext = {
  runId: string;
  dealId: string;
  outputs: Record<string, unknown>;
  trace?: any[];
  input?: Record<string, unknown> | null;
};

function mapSpeedBand(band?: string | null): ZipSpeedBand | undefined {
  if (!band) return undefined;
  const normalized = band.toLowerCase();
  if (normalized === "fast") return "fast";
  if (normalized === "slow") return "slow";
  if (normalized === "balanced" || normalized === "neutral") return "neutral";
  return undefined;
}

function mapMarketTempFromSpeed(band?: string | null): MarketTempLabel | undefined {
  if (!band) return undefined;
  const normalized = band.toLowerCase();
  if (normalized === "fast") return "hot";
  if (normalized === "slow") return "cool";
  if (normalized === "balanced" || normalized === "neutral") return "neutral";
  return undefined;
}

function mapUrgency(urgency?: string | null): TimelineUrgency | undefined {
  if (!urgency) return undefined;
  const normalized = urgency.toLowerCase();
  if (normalized === "critical") return "emergency";
  if (normalized === "elevated" || normalized === "high") return "high";
  if (normalized === "normal" || normalized === "low") return "low";
  return undefined;
}

const RISK_FLAG_MAP: Record<string, RiskFlag> = {
  uninsurable: "uninsurable",
  condo_sirs: "condo_sirs",
  pace: "pace",
  pace_solar_ucc: "pace",
  solar_ucc: "solar_ucc",
  fha_va_flip: "fha_90_day",
  fha_90_day: "fha_90_day",
  firpta: "firpta",
  scra: "scra",
  manufactured: "manufactured",
  title: "title_cloudy",
  title_cloudy: "title_cloudy",
};

function deriveRiskFlags(riskSummary: any): RiskFlag[] | undefined {
  const perGate = (riskSummary?.per_gate ?? {}) as Record<string, { status?: string }>;
  const flags = new Set<RiskFlag>();

  for (const [gate, info] of Object.entries(perGate)) {
    const status = (info?.status ?? "").toString().toLowerCase();
    if (status === "pass") continue;
    const mapped = RISK_FLAG_MAP[gate] ?? (gate as RiskFlag);
    if (mapped) flags.add(mapped);
  }

  return flags.size > 0 ? Array.from(flags) : undefined;
}

export function deriveNegotiationDealFacts(ctx: NegotiationSourceContext): NegotiationDealFacts {
  const outputs = ctx.outputs ?? {};
  const timeline = (outputs as any)?.timeline_summary ?? {};
  const riskSummary = (outputs as any)?.risk_summary ?? {};

  const zipSpeed = mapSpeedBand(timeline?.speed_band ?? timeline?.market_speed ?? null);
  const marketTemp = mapMarketTempFromSpeed(timeline?.speed_band ?? null);
  const urgency = mapUrgency(timeline?.urgency ?? timeline?.urgency_band ?? null);
  const riskFlags = deriveRiskFlags(riskSummary);

  return {
    // Defaults lean neutral when explicit bands are unavailable; replace with explicit engine bands when provided.
    condition_band: (outputs as any)?.condition_band ?? "medium",
    repairs_band: (outputs as any)?.repairs_band ?? "medium",
    repair_evidence: (outputs as any)?.repair_evidence ?? "none",
    has_big5_issues: (outputs as any)?.has_big5_issues ?? false,
    status_in_foreclosure: (outputs as any)?.status_in_foreclosure ?? undefined,
    seller_motivation_primary: (outputs as any)?.seller_motivation_primary ?? undefined,
    motivation_strength: (outputs as any)?.motivation_strength ?? undefined,
    timeline_urgency: urgency,
    timeline_trigger: (outputs as any)?.timeline_trigger ?? "none",
    arrears_band: (outputs as any)?.arrears_band ?? undefined,
    shortfall_vs_payoff_band: (outputs as any)?.shortfall_vs_payoff_band ?? undefined,
    zip_speed_band: zipSpeed,
    market_temp_label: marketTemp,
    confidence_grade:
      (riskSummary?.confidence_grade as any) ??
      (outputs as any)?.confidence_grade ??
      (outputs as any)?.confidence_grade_band ??
      undefined,
    risk_flags: riskFlags,
    lead_channel: (outputs as any)?.lead_channel ?? undefined,
    trust_level: (outputs as any)?.trust_level ?? undefined,
  };
}
