import {
  NegotiationDealFacts,
  NegotiationMatrix,
  NegotiationMatrixRow,
  NegotiationPlaybookResult,
  NegotiatorChatResult,
} from "./matrix-types.ts";
import { selectPlaybookRows } from "./matrix-matcher.ts";

export const NEGOTIATOR_SYSTEM_PROMPT = [
  "You are The Negotiator for HPS DealEngine.",
  "Role: turn pre-computed deal facts and policy/risk context into pre-emptive, audit-style negotiation scripts.",
  "Tone: Empathetic but firm. Sound like a competent auditor, not a hypey salesperson.",
  "Never invent or recompute numbers. All numeric anchors (ARV, repairs, ceilings, floors, payoff, timeline) come from the engine and are provided explicitly.",
  "Rely on the Negotiation Logic Tree dataset that maps normalized deal facts to trigger phrases and scripts.",
  "Adjust phrasing and sequencing within that dataset and HPS policies only.",
  "Never undermine risk gates or policy constraints.",
].join("\n");

type NegotiatorTone = "objective" | "empathetic" | "assertive";

function toneInstruction(tone?: NegotiatorTone): string {
  switch (tone) {
    case "empathetic":
      return [
        "Use a calm, tactical-empathy tone. Label emotions and slow the conversation down before pivoting back to deal facts.",
        "Stay firm on policy and math; do not apologize for constraints.",
      ].join(" ");
    case "assertive":
      return [
        "Use a confident, closing-focused tone. Be clear about options and next steps without pressuring or bypassing policy.",
        "Keep it decisive and concise while respecting risk gates and engine outputs.",
      ].join(" ");
    case "objective":
    default:
      return [
        "Use an objective, audit-style tone. Matter-of-fact, stoic, and data-led.",
        "Walk through the logic from the Negotiation Matrix without hype.",
      ].join(" ");
  }
}

function toSection(row?: NegotiationMatrixRow | null) {
  if (!row) return null;
  return {
    id: row.id,
    module: row.module,
    scenarioLabel: row.scenario_label,
    triggerPhrase: row.trigger_phrase,
    scriptBody: row.script_body,
    cushioningStatement: row.cushioning_statement ?? null,
    followupQuestion: row.followup_question ?? null,
  };
}

export function buildPlaybookResult(args: {
  runId: string;
  facts: NegotiationDealFacts;
  matrix: NegotiationMatrix;
}): NegotiationPlaybookResult {
  const rowsByModule = selectPlaybookRows(args.matrix, args.facts);
  const allRows = Object.values(rowsByModule).filter((row): row is NegotiationMatrixRow => !!row);

  return {
    persona: "dealNegotiator",
    mode: "generate_playbook",
    runId: args.runId,
    logicRowIds: allRows.map((r) => r.id),
    sections: {
      anchor: toSection(rowsByModule.price_anchor ?? null),
      script: toSection(rowsByModule.competence ?? null),
      pivot:
        toSection(rowsByModule.objection_pivot ?? null) ??
        toSection(rowsByModule.negative_reverse ?? null),
      all: allRows
        .map(toSection)
        .filter((s): s is NonNullable<ReturnType<typeof toSection>> => !!s),
    },
  };
}

export function buildNegotiatorChatResult(args: {
  runId: string | null;
  facts: NegotiationDealFacts;
  matrix: NegotiationMatrix;
  logicRowIds?: string[];
  userMessage?: string;
  tone?: NegotiatorTone;
}): NegotiatorChatResult {
  const logicRows =
    args.logicRowIds && args.logicRowIds.length > 0
      ? args.matrix.rows.filter((r) => args.logicRowIds?.includes(r.id))
      : [];

  const rowsSummary =
    logicRows.length > 0
      ? logicRows
          .map((r) => `- ${r.module}: ${r.scenario_label} (id=${r.id})`)
          .join("\n")
      : "No specific negotiation rows were pre-selected for this chat.";

  const factsSummary = JSON.stringify(args.facts, null, 2);

  const messages: NegotiatorChatResult["messages"] = [
    {
      role: "system",
      content: [NEGOTIATOR_SYSTEM_PROMPT, "", "Tone guidance:", toneInstruction(args.tone)].join("\n"),
    },
    {
      role: "assistant",
      content: [
        "Context loaded for Negotiator chat.",
        `Run: ${args.runId ?? "unknown"}`,
        "Normalized deal facts:",
        factsSummary,
        "Negotiation rows in play:",
        rowsSummary,
        "Awaiting user question or coaching request.",
      ].join("\n"),
    },
  ];

  if (args.userMessage) {
    messages.push({ role: "user", content: args.userMessage });
  }

  return {
    persona: "dealNegotiator",
    mode: "chat",
    runId: args.runId,
    logicRowIds: args.logicRowIds ?? [],
    messages,
  };
}
