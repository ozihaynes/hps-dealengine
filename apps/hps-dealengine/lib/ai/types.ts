"use client";

export type AiPersona = "dealAnalyst" | "dealStrategist" | "dealNegotiator";
export type AiTone = "neutral" | "punchy" | "visionary" | "direct" | "empathetic";

export type NegotiatorTone = "objective" | "empathetic" | "assertive";

export const NEGOTIATOR_TONE_LABELS: Record<NegotiatorTone, string> = {
  objective: "Objective",
  empathetic: "Empathetic",
  assertive: "Assertive",
};

export const NEGOTIATOR_TONE_DESCRIPTIONS: Record<NegotiatorTone, string> = {
  objective: "Logic-driven, audit-style delivery grounded in the playbook.",
  empathetic: "Calm, tactical-empathy tone for stress and tough objections.",
  assertive: "Confident, closing-focused tone toward a clear next step.",
};

export type AiBridgeSection = {
  title: string;
  body: string;
};

export type AiSourceRefKind = "run" | "trace" | "doc" | "external";

export type AiSourceRef = {
  kind: AiSourceRefKind;
  ref: string; // e.g. runId, trace frame code, doc_id, URL
  doc_id?: string;
  title?: string;
  trust_tier?: number;
};

export type AiBridgeResult = {
  persona: AiPersona;
  summary: string;
  threadId?: string | null;
  provider?: string | null;
  model?: string | null;
  ok?: boolean;
  key_numbers?: AiBridgeSection;
  guardrails?: AiBridgeSection;
  risk_and_evidence?: AiBridgeSection;
  negotiation_playbook?: AiBridgeSection;
  system_guidance?: AiBridgeSection;
  followups?: string[];
  sources: AiSourceRef[];
};

export type NegotiationPlaybookSection = {
  id: string;
  module: "competence" | "price_anchor" | "objection_pivot" | "negative_reverse";
  scenarioLabel: string;
  triggerPhrase: string;
  scriptBody: string;
  cushioningStatement?: string | null;
  followupQuestion?: string | null;
};

export type NegotiationPlaybookResult = {
  persona: "dealNegotiator";
  mode: "generate_playbook";
  runId: string;
  logicRowIds: string[];
  sections: {
    anchor?: NegotiationPlaybookSection | null;
    script?: NegotiationPlaybookSection | null;
    pivot?: NegotiationPlaybookSection | null;
    all: NegotiationPlaybookSection[];
  };
  ok?: boolean;
  summary?: string;
  threadId?: string | null;
  model?: string | null;
};

export type NegotiatorChatResult = {
  persona: "dealNegotiator";
  mode: "chat";
  runId: string | null;
  logicRowIds: string[];
  messages: Array<{ role: "system" | "assistant" | "user"; content: string }>;
  threadId?: string | null;
  provider?: string | null;
  model?: string | null;
  ok?: boolean;
};

export type AiChatRole = "user" | "assistant" | "system";

export interface AiChatMessage {
  id: string;
  role: AiChatRole;
  content: string;
  createdAt: string;
}
