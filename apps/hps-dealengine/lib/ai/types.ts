"use client";

export type AiPersona = "dealAnalyst" | "dealStrategist";
export type AiTone = "neutral" | "punchy" | "visionary" | "direct" | "empathetic";

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
  key_numbers?: AiBridgeSection;
  guardrails?: AiBridgeSection;
  risk_and_evidence?: AiBridgeSection;
  negotiation_playbook?: AiBridgeSection;
  system_guidance?: AiBridgeSection;
  followups?: string[];
  sources: AiSourceRef[];
};
