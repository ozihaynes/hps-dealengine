import type { DocChunk } from "./docLoader.ts";

export type DealAiContext = {
  dealId: string;
  runId: string | null;
  kpis: {
    spreadDollars?: number | null;
    spreadPctArv?: number | null;
    wholesaleFee?: number | null;
    wholesaleFeeWithDc?: number | null;
    respectFloor?: number | null;
    buyerCeiling?: number | null;
    arv?: number | null;
    aiv?: number | null;
    dtmDays?: number | null;
    urgencyBand?: string | null;
    marketTempLabel?: string | null;
    riskOverall?: string | null;
    confidenceGrade?: string | null;
    workflowState?: string | null;
  };
  traceHighlights: Array<{ frameCode: string; summary: string }>;
  posture?: {
    name?: string;
    minSpreadPolicySummary?: string | null;
  };
};

const TRUST_TIER_RULE = [
  "Trust tiers (lower = higher authority):",
  "0 = math/contracts/official underwriting policy",
  "1 = engine/app/KPI/ops implementations",
  "2 = product vision, personas, examples/playbooks (context only, not math)",
  "3 = external or speculative context (never override DealEngine math)",
  "If sources disagree, defer to the lowest trust_tier and state the conflict.",
].join(" ");

function truncate(text: string, max = 900): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

function fmtNumber(value: unknown): string {
  if (value === null || typeof value === "undefined") return "n/a";
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return String(value);
  return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function renderDocs(docs: DocChunk[]): string {
  return docs
    .map(
      (doc) =>
        `- [tier ${doc.trustTier}] ${doc.docId} — ${doc.heading}: ${truncate(
          doc.content.replace(/\\s+/g, " "),
          320,
        )}`,
    )
    .join("\\n");
}

function renderContext(ctx: DealAiContext): string {
  const lines: string[] = [];
  const k = ctx.kpis;
  lines.push(`dealId=${ctx.dealId} runId=${ctx.runId ?? "latest"} posture=${ctx.posture?.name ?? "unknown"}`);
  lines.push(
    `KPIs: spread=${fmtNumber(k.spreadDollars)}; fee=${fmtNumber(k.wholesaleFee)}; fee_dc=${fmtNumber(
      k.wholesaleFeeWithDc,
    )}; floor=${fmtNumber(k.respectFloor)}; ceiling=${fmtNumber(k.buyerCeiling)}; ARV=${fmtNumber(
      k.arv,
    )}; AIV=${fmtNumber(k.aiv)}; DTM=${fmtNumber(k.dtmDays)}; urgency=${k.urgencyBand ?? "n/a"}; market_temp=${
      k.marketTempLabel ?? "n/a"
    }; risk=${k.riskOverall ?? "n/a"}; confidence=${k.confidenceGrade ?? "n/a"}; workflow=${k.workflowState ?? "n/a"}`,
  );
  if (ctx.traceHighlights.length > 0) {
    lines.push(
      "Trace highlights: " +
        ctx.traceHighlights
          .map((t) => `${t.frameCode}: ${truncate(t.summary, 160)}`)
          .join(" | "),
    );
  }
  return lines.join("\\n");
}

export function buildDealExplainPrompt(params: {
  context: DealAiContext;
  question: string;
  docs: DocChunk[];
  guardrails: string[];
}): string {
  const { context, question, docs, guardrails } = params;
  return [
    "You are the HPS DealEngine AI strategist (advisory only).",
    "Identity: Lead Backend Architect for deterministic underwriting + Lead Frontend Design Engineer for investor-grade UIs.",
    "Guardrails:",
    ...guardrails,
    TRUST_TIER_RULE,
    "If data is missing, say what is missing and stop; never invent numbers or override outputs.",
    "Deal context (use as ground truth for numbers):",
    renderContext(context),
    "Docs (do not override run outputs; prefer lower trust_tier):",
    renderDocs(docs),
    "User question:",
    question,
    "Respond as JSON with keys: summary (string), key_numbers (object), guardrails (string[]), risk_and_evidence (string[]), recommendations (string[]), sources (array of {doc_id, path, trust_tier}). Use only provided doc_ids in sources.",
  ].join("\\n\\n");
}

export function buildDocsQnaPrompt(params: {
  question: string;
  docs: DocChunk[];
  guardrails: string[];
}): string {
  const { question, docs, guardrails } = params;
  return [
    "You are the HPS DealEngine documentation guide.",
    "Guardrails:",
    ...guardrails,
    TRUST_TIER_RULE,
    "Use only the provided docs as sources; cite doc_id in Sources. Do not invent new math or policies.",
    "Docs:",
    renderDocs(docs),
    "Question:",
    question,
    "Respond as JSON with keys: answer_markdown (string) and sources (array of {doc_id, path, trust_tier}).",
  ].join("\\n\\n");
}
