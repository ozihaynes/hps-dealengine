import type { AnalyzeOutputs } from "@hps-internal/contracts";
import { DoubleClose } from "../services/engine";
import type { Deal, EngineCalculations } from "../types";
import { fmt$ } from "../utils/helpers";

type CalcLike = EngineCalculations & Partial<AnalyzeOutputs> & Record<string, any>;

type SpreadStatus = "wide" | "tight" | "belowPolicy" | "unknown";

type RiskOverall = AnalyzeOutputs["risk_summary"] extends infer R
  ? R extends { overall: any }
    ? R["overall"]
    : unknown
  : unknown;

export interface WholesaleFeeView {
  wholesaleFee: number;
  wholesaleFeePctOfArv: number | null;
  wholesaleFeeWithDc: number;
  dcLoad: number;
  buyerCeiling: number;
  respectFloor: number;
  arv: number;
}

export interface DealAnalysisView {
  healthLabel: string;
  healthColor: "green" | "orange" | "red" | "blue";
  urgencyLabel: string;
  urgencyDays: number | null;
  listingAllowed: boolean;
  buyerMarginPct: number | null;
  contingencyPct: number | null;
  carryMonths: number | null;
  assignmentObserved: number | null;
  totalRepairs: number | null;
  carryCosts: number | null;
  resaleCosts: number | null;
  projectedPayoff: number | null;
  tenantBuffer: number | null;
  showTenantBuffer: boolean;
}

export interface MarketTempView {
  score: number;
  label: "cool" | "neutral" | "warm" | "hot" | "unknown";
  reason: string;
  speedBand: string | null;
  daysToMoney: number | null;
}

export interface DealStructureView {
  payoff: number | null;
  respectFloor: number | null;
  offer: number | null;
  buyerCeiling: number | null;
  arv: number | null;
  aiv: number | null;
  urgencyDays: number | null;
}

export interface NegotiationContextView {
  spreadStatus: SpreadStatus;
  spreadValue: number | null;
  minSpread: number | null;
  dtm: number | null;
  urgencyLabel: string;
  riskOverall: RiskOverall | null;
  evidenceStatus: string | null;
  respectFloor: number | null;
  buyerCeiling: number | null;
  mao: number | null;
  payoff: number | null;
}

export function getWholesaleFeeView(calc: CalcLike, deal: Deal): WholesaleFeeView {
  const buyerCeiling = Number(calc.buyerCeiling ?? calc.buyer_ceiling ?? NaN);
  const respectFloor = Number(calc.respectFloorPrice ?? calc.respect_floor ?? NaN);
  const arv = Number(deal.market?.arv ?? NaN);
  const dcState = (deal.costs as any)?.double_close ?? {};
  const dcCalcs = DoubleClose.computeDoubleClose(dcState, { deal });
  const dcLoad = Number(dcCalcs.Extra_Closing_Load ?? 0) + Number(dcCalcs.Carry_Total ?? 0);
  const wholesaleFee =
    isFinite(buyerCeiling) && isFinite(respectFloor) ? buyerCeiling - respectFloor : NaN;
  const wholesaleFeeWithDc = isFinite(wholesaleFee) ? wholesaleFee - dcLoad : NaN;
  const pctOfArv = isFinite(wholesaleFee) && isFinite(arv) && arv !== 0 ? wholesaleFee / arv : null;

  return {
    wholesaleFee,
    wholesaleFeePctOfArv: pctOfArv,
    wholesaleFeeWithDc,
    dcLoad,
    buyerCeiling,
    respectFloor,
    arv,
  };
}

export function getDealAnalysisView(calc: CalcLike, deal: Deal): DealAnalysisView {
  const minSpread = Number(deal.policy?.min_spread ?? NaN);
  let healthColor: DealAnalysisView["healthColor"] = "blue";
  let healthLabel = "Unknown";
  if (isFinite(calc.dealSpread) && isFinite(minSpread)) {
    if (calc.dealSpread < minSpread) {
      healthColor = "red";
      healthLabel = "Below policy";
    } else if (calc.dealSpread < minSpread * 1.05) {
      healthColor = "orange";
      healthLabel = "Tight";
    } else {
      healthColor = "green";
      healthLabel = "Pass";
    }
  }

  let urgencyLabel = "Unknown";
  if (calc.urgencyBand) urgencyLabel = calc.urgencyBand;

  return {
    healthLabel,
    healthColor,
    urgencyLabel,
    urgencyDays: Number.isFinite(calc.urgencyDays) ? Number(calc.urgencyDays) : null,
    listingAllowed: Boolean(calc.listingAllowed),
    buyerMarginPct: Number.isFinite(calc.displayMargin) ? Number(calc.displayMargin) : null,
    contingencyPct: Number.isFinite(calc.displayCont) ? Number(calc.displayCont) : null,
    carryMonths: Number.isFinite(calc.carryMonths) ? Number(calc.carryMonths) : null,
    assignmentObserved:
      Number.isFinite(calc.maoFinal) && Number.isFinite(calc.instantCashOffer)
        ? Number(calc.maoFinal) - Number(calc.instantCashOffer)
        : null,
    totalRepairs: Number.isFinite(calc.totalRepairs) ? Number(calc.totalRepairs) : null,
    carryCosts: Number.isFinite(calc.carryCosts) ? Number(calc.carryCosts) : null,
    resaleCosts: Number.isFinite(calc.resaleCosts) ? Number(calc.resaleCosts) : null,
    projectedPayoff: Number.isFinite(calc.projectedPayoffClose)
      ? Number(calc.projectedPayoffClose)
      : null,
    tenantBuffer: Number.isFinite(calc.tenantBuffer) ? Number(calc.tenantBuffer) : null,
    showTenantBuffer: (deal as any)?.property?.occupancy === "tenant",
  };
}

export function getMarketTempView(calc: CalcLike): MarketTempView {
  const speedBand = (calc.timeline_summary as any)?.speed_band ?? null;
  const dtm = (calc.timeline_summary as any)?.days_to_money ?? null;
  let score = 50;
  let label: MarketTempView["label"] = "neutral";
  if (!speedBand && !dtm) {
    return {
      score: 0,
      label: "unknown",
      reason: "Insufficient timeline data yet. Run analyze to surface speed band and DTM.",
      speedBand,
      daysToMoney: dtm,
    };
  }

  if (speedBand === "slow") score = 30;
  else if (speedBand === "balanced") score = 55;
  else if (speedBand === "fast") score = 80;

  if (Number.isFinite(dtm)) {
    const n = Number(dtm);
    if (n > 120) score -= 15;
    else if (n > 60) score -= 5;
    else if (n < 30) score += 10;
  }

  if (score < 35) label = "cool";
  else if (score < 55) label = "neutral";
  else if (score < 75) label = "warm";
  else label = "hot";

  const reasonParts: string[] = [];
  if (speedBand) reasonParts.push(`Speed band ${speedBand}.`);
  if (dtm != null) reasonParts.push(`DTM ${dtm} days.`);

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    label,
    reason: reasonParts.join(" ") || "Market tempo pending analysis.",
    speedBand,
    daysToMoney: dtm,
  };
}

export function getDealStructureView(calc: CalcLike, deal: Deal): DealStructureView {
  return {
    payoff: Number.isFinite(calc.projectedPayoffClose) ? Number(calc.projectedPayoffClose) : null,
    respectFloor: Number.isFinite(calc.respectFloorPrice) ? Number(calc.respectFloorPrice) : null,
    offer: Number.isFinite(calc.instantCashOffer) ? Number(calc.instantCashOffer) : null,
    buyerCeiling: Number.isFinite(calc.buyerCeiling) ? Number(calc.buyerCeiling) : null,
    arv: Number.isFinite(deal.market?.arv) ? Number(deal.market.arv) : null,
    aiv: Number.isFinite(deal.market?.as_is_value) ? Number(deal.market.as_is_value) : null,
    urgencyDays: Number.isFinite(calc.urgencyDays) ? Number(calc.urgencyDays) : null,
  };
}

export function getNegotiationContextView(calc: CalcLike, deal: Deal): NegotiationContextView {
  const minSpread = Number(deal.policy?.min_spread ?? NaN);
  const spreadValue = Number.isFinite(calc.dealSpread) ? Number(calc.dealSpread) : null;
  let spreadStatus: SpreadStatus = "unknown";
  if (spreadValue != null && Number.isFinite(minSpread)) {
    if (spreadValue < minSpread) spreadStatus = "belowPolicy";
    else if (spreadValue < minSpread * 1.05) spreadStatus = "tight";
    else spreadStatus = "wide";
  }

  const riskOverall = (calc.risk_summary as any)?.overall ?? null;
  const evidenceStatus = (calc.evidence_summary as any)?.status ?? null;
  const dtm = (calc.timeline_summary as any)?.days_to_money ?? null;
  const urgencyLabel = (calc.timeline_summary as any)?.urgency ?? (calc as any)?.urgencyBand ?? "Unknown";

  return {
    spreadStatus,
    spreadValue,
    minSpread: Number.isFinite(minSpread) ? minSpread : null,
    dtm,
    urgencyLabel,
    riskOverall,
    evidenceStatus,
    respectFloor: Number.isFinite(calc.respectFloorPrice) ? Number(calc.respectFloorPrice) : null,
    buyerCeiling: Number.isFinite(calc.buyerCeiling) ? Number(calc.buyerCeiling) : null,
    mao: Number.isFinite(calc.maoFinal) ? Number(calc.maoFinal) : null,
    payoff: Number.isFinite(calc.projectedPayoffClose) ? Number(calc.projectedPayoffClose) : null,
  };
}
