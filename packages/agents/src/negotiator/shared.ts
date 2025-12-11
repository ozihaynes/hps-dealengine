import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { createSupabaseRlsClient } from "../supabase/supabaseRlsClient";
import type { NegotiationPlanRow } from "./types";

type RunRow = {
  id: string;
  org_id: string;
  deal_id: string;
  input?: unknown;
  output?: unknown;
  trace?: unknown;
  policy_snapshot?: unknown;
  created_at?: string;
};

type DealRow = {
  id: string;
  org_id: string;
  updated_at?: string;
};

export interface NegotiationPlanInput {
  orgId: string;
  userId: string;
  accessToken: string;
  dealId: string;
  runId?: string | null;
  dealFactsOverride?: Record<string, unknown> | null;
}

const negotiationDealFactsSchema = z.object({
  condition_band: z.enum(["light", "medium", "heavy", "hazardous"]).optional(),
  repairs_band: z.enum(["low", "medium", "high", "extreme"]).optional(),
  repair_evidence: z.enum(["bids_present", "estimator_only", "photos_only", "none"]).optional(),
  has_big5_issues: z.boolean().optional(),
  status_in_foreclosure: z.boolean().optional(),
  seller_motivation_primary: z
    .enum([
      "avoid_auction",
      "debt_relief",
      "tired_landlord",
      "relocation",
      "inheritance",
      "equity_cash_out",
      "divorce",
      "code_violations",
      "other",
    ])
    .optional(),
  motivation_strength: z.enum(["low", "medium", "high"]).optional(),
  timeline_urgency: z.enum(["emergency", "critical", "high", "low"]).optional(),
  timeline_trigger: z.enum(["auction", "move_date", "tax_sale", "vacancy_burn", "none"]).optional(),
  arrears_band: z.enum(["none", "low", "moderate", "high", "critical"]).optional(),
  shortfall_vs_payoff_band: z.enum(["big_cushion", "thin", "shortfall"]).optional(),
  zip_speed_band: z.enum(["fast", "neutral", "slow"]).optional(),
  market_temp_label: z.enum(["hot", "warm", "neutral", "cool"]).optional(),
  confidence_grade: z.enum(["A", "B", "C"]).optional(),
  risk_flags: z
    .array(
      z.enum([
        "uninsurable",
        "condo_sirs",
        "pace",
        "solar_ucc",
        "fha_90_day",
        "flood_50pct",
        "manufactured",
        "firpta",
        "scra",
        "title_cloudy",
      ]),
    )
    .optional(),
  lead_channel: z.enum(["inbound_call", "web_form", "sms", "ppc", "referral", "repeat_seller"]).optional(),
  trust_level: z.enum(["cold", "lukewarm", "warm", "repeat_seller"]).optional(),
});

type NegotiationDealFacts = z.infer<typeof negotiationDealFactsSchema>;

const negotiationMatrixRowSchema = z.object({
  id: z.string(),
  module: z.enum(["competence", "price_anchor", "objection_pivot", "negative_reverse"]),
  scenario_label: z.string(),
  deal_facts: negotiationDealFactsSchema.required({
    condition_band: true,
    repairs_band: true,
  }),
  preemptive_objection: z.string().optional(),
  trigger_timing: z.string().optional(),
  competence_focus: z.string().nullable().optional(),
  ackerman_stage: z.string().nullable().optional(),
  pivot_focus: z.string().nullable().optional(),
  motivation_context: z.string().nullable().optional(),
  trigger_phrase: z.string(),
  script_body: z.string(),
  cushioning_statement: z.string().nullable().optional(),
  followup_question: z.string().nullable().optional(),
  notes_for_ai: z.string().nullable().optional(),
});

type NegotiationMatrixRow = z.infer<typeof negotiationMatrixRowSchema>;

let datasetCache: NegotiationMatrixRow[] | null = null;

function candidateDatasetPaths(): string[] {
  const envPath = process.env.HPS_NEGOTIATION_MATRIX_PATH;
  const paths = [
    envPath,
    path.resolve(process.cwd(), "data/negotiation-matrix/negotiation-matrix.data.json"),
    path.resolve(process.cwd(), "docs/ai/negotiation-matrix/negotiation-matrix.example.json"),
  ];
  return paths.filter((p): p is string => Boolean(p));
}

async function loadNegotiationDataset(): Promise<NegotiationMatrixRow[]> {
  if (datasetCache) return datasetCache;

  const errors: string[] = [];
  for (const candidate of candidateDatasetPaths()) {
    try {
      const raw = await fs.readFile(candidate, "utf8");
      const parsed = JSON.parse(raw);
      const rows = Array.isArray(parsed?.rows) ? parsed.rows : [];
      const validated = z.array(negotiationMatrixRowSchema).safeParse(rows);
      if (!validated.success) {
        errors.push(`schema validation failed for ${candidate}: ${validated.error.message}`);
        continue;
      }
      datasetCache = validated.data;
      return datasetCache;
    } catch (err: any) {
      errors.push(`read failed for ${candidate}: ${err?.message ?? String(err)}`);
    }
  }
  throw new Error(`Failed to load negotiation matrix dataset. Attempts: ${errors.join(" | ")}`);
}

function riskFlagFromGate(status: string | undefined | null): boolean {
  return Boolean(status && status !== "pass");
}

export function deriveDealFactsFromRun(run: RunRow): Partial<NegotiationDealFacts> {
  const outputs = (run as any)?.output?.outputs ?? (run as any)?.output ?? {};
  const facts: Partial<NegotiationDealFacts> = {};

  const timeline = outputs?.timeline_summary ?? {};
  const speedBand: string | null = timeline?.speed_band ?? null;
  if (speedBand === "balanced") facts.zip_speed_band = "neutral";
  else if (speedBand === "fast" || speedBand === "slow") facts.zip_speed_band = speedBand;

  const urgency: string | null = timeline?.urgency ?? null;
  if (urgency === "critical") facts.timeline_urgency = "critical";
  else if (urgency === "elevated") facts.timeline_urgency = "high";
  else if (urgency === "normal") facts.timeline_urgency = "low";

  const confidence: string | null = outputs?.confidence_grade ?? outputs?.evidence_summary?.confidence_grade ?? null;
  if (confidence === "A" || confidence === "B" || confidence === "C") {
    facts.confidence_grade = confidence;
  }

  const shortfallVsPayoff: number | null | undefined = outputs?.shortfall_vs_payoff;
  if (typeof shortfallVsPayoff === "number") {
    if (shortfallVsPayoff < 0) facts.shortfall_vs_payoff_band = "shortfall";
    else if (shortfallVsPayoff <= 10000) facts.shortfall_vs_payoff_band = "thin";
    else facts.shortfall_vs_payoff_band = "big_cushion";
  }

  const riskSummary = outputs?.risk_summary ?? {};
  const perGate: Record<string, { status?: string }> = riskSummary?.per_gate ?? {};
  type RiskFlag = NonNullable<NegotiationDealFacts["risk_flags"]>[number];
  const riskFlags: RiskFlag[] = [];

  const gateStatus = (key: string) => (perGate[key]?.status ?? (riskSummary as any)?.[key]) as string | undefined | null;

  if (riskFlagFromGate(gateStatus("insurability"))) riskFlags.push("uninsurable");
  if (riskFlagFromGate(gateStatus("condo_sirs"))) riskFlags.push("condo_sirs");
  if (riskFlagFromGate(gateStatus("pace_solar_ucc"))) {
    riskFlags.push("pace");
    riskFlags.push("solar_ucc");
  }
  if (riskFlagFromGate(gateStatus("fha_va_flip"))) riskFlags.push("fha_90_day");
  if (riskFlagFromGate(gateStatus("flood_50pct"))) riskFlags.push("flood_50pct");
  if (riskFlagFromGate(gateStatus("manufactured"))) riskFlags.push("manufactured");
  if (riskFlagFromGate(gateStatus("firpta"))) riskFlags.push("firpta");
  if (riskFlagFromGate(gateStatus("scra"))) riskFlags.push("scra");
  if (riskFlagFromGate(gateStatus("title"))) riskFlags.push("title_cloudy");

  if (riskFlags.length > 0) {
    facts.risk_flags = Array.from(new Set(riskFlags));
  }

  return facts;
}

export type NegotiationMatch = {
  row: NegotiationMatrixRow;
  matchScore: number;
  matchedFacts: string[];
  unmatchedFacts: string[];
};

export function matchNegotiationRow(
  rows: NegotiationMatrixRow[],
  dealFacts: Partial<NegotiationDealFacts>,
): NegotiationMatch | null {
  if (!rows.length) return null;

  const results: NegotiationMatch[] = rows.map((row) => {
    let score = 0;
    const matched: string[] = [];
    const unmatched: string[] = [];

    for (const [key, expected] of Object.entries(row.deal_facts)) {
      const actual = (dealFacts as any)[key];
      if (key === "risk_flags") {
        const expectedFlags = Array.isArray(expected) ? expected : [];
        const actualFlags = Array.isArray(actual) ? actual : [];
        const includesAll = expectedFlags.every((flag) => actualFlags.includes(flag));
        if (includesAll) {
          score += 1;
          matched.push(key);
        } else {
          unmatched.push(key);
        }
      } else if (actual !== undefined && actual !== null && actual === expected) {
        score += 1;
        matched.push(key);
      } else {
        unmatched.push(key);
      }
    }

    return { row, matchScore: score, matchedFacts: matched, unmatchedFacts: unmatched };
  });

  results.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return a.row.id.localeCompare(b.row.id);
  });

  return results[0] ?? null;
}

async function loadDealAndRun(params: {
  orgId: string;
  dealId: string;
  runId?: string | null;
  accessToken: string;
}): Promise<{ deal: DealRow | null; run: RunRow | null }> {
  const supabase = createSupabaseRlsClient(params.accessToken);

  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("id, org_id, updated_at")
    .eq("id", params.dealId)
    .maybeSingle();

  if (dealError) throw dealError;
  if (!deal) return { deal: null, run: null };

  let runQuery = supabase.from("runs").select(
    `
      id,
      org_id,
      deal_id,
      input,
      output,
      trace,
      policy_snapshot,
      created_at
    `,
  );
  runQuery = runQuery.eq("org_id", deal.org_id).eq("deal_id", params.dealId);
  if (params.runId) {
    runQuery = runQuery.eq("id", params.runId);
  } else {
    runQuery = runQuery.order("created_at", { ascending: false }).limit(1);
  }

  const { data: runRows, error: runError } = await runQuery;
  if (runError) throw runError;
  const run = Array.isArray(runRows) ? (runRows[0] as RunRow) : null;

  return { deal: deal as DealRow, run };
}

export async function resolveNegotiationPlan(input: NegotiationPlanInput): Promise<{
  deal: DealRow | null;
  run: RunRow | null;
  negotiationPlan: NegotiationPlanRow | null;
}> {
  const { deal, run } = await loadDealAndRun({
    orgId: input.orgId,
    dealId: input.dealId,
    runId: input.runId ?? null,
    accessToken: input.accessToken,
  });

  const baseFacts = input.dealFactsOverride ?? deriveDealFactsFromRun((run as RunRow) ?? ({} as RunRow));
  const dataset = await loadNegotiationDataset();
  const match = matchNegotiationRow(dataset, baseFacts ?? {});

  const negotiationPlan: NegotiationPlanRow | null = match
    ? {
        id: match.row.id,
        module: match.row.module,
        scenarioLabel: match.row.scenario_label,
        dealFacts: match.row.deal_facts,
        triggerPhrase: match.row.trigger_phrase ?? null,
        scriptBody: match.row.script_body,
        notesForAi: match.row.notes_for_ai ?? null,
        preemptiveObjection: match.row.preemptive_objection ?? null,
        triggerTiming: match.row.trigger_timing ?? null,
        competenceFocus: match.row.competence_focus ?? null,
        ackermanStage: match.row.ackerman_stage ?? null,
        pivotFocus: match.row.pivot_focus ?? null,
        motivationContext: match.row.motivation_context ?? null,
        cushioningStatement: match.row.cushioning_statement ?? null,
        followupQuestion: match.row.followup_question ?? null,
      }
    : null;

  return { deal, run, negotiationPlan };
}

