import { z } from "zod";
import { Postures } from "./posture";

const AiToneSchema = z.enum(["neutral", "punchy", "visionary", "direct", "empathetic"]);
const NegotiatorToneSchema = z.enum(["objective", "empathetic", "assertive"]);

export const DealAnalystInputSchema = z.object({
  persona: z.literal("dealAnalyst"),
  dealId: z.string().uuid(),
  runId: z.string().uuid(),
  posture: z.enum(Postures).optional(),
  userPrompt: z.string().min(1),
  tone: AiToneSchema.optional(),
  isStale: z.boolean().optional(),
});
export type DealAnalystPayload = z.infer<typeof DealAnalystInputSchema>;

export const DealStrategistInputSchema = z.object({
  persona: z.literal("dealStrategist"),
  userPrompt: z.string().min(1),
  posture: z.string().optional(),
  sandboxSettings: z.unknown().optional(),
  route: z.string().optional(),
  tone: AiToneSchema.optional(),
});
export type DealStrategistPayload = z.infer<typeof DealStrategistInputSchema>;

export const DealNegotiatorInputSchema = z.object({
  persona: z.literal("dealNegotiator"),
  mode: z.enum(["generate_playbook", "chat"]),
  dealId: z.string().uuid(),
  runId: z.string().uuid().optional().nullable(),
  userMessage: z.string().optional(),
  logicRowIds: z.array(z.string()).optional(),
  tone: NegotiatorToneSchema.optional(),
});
export type DealNegotiatorPayload = z.infer<typeof DealNegotiatorInputSchema>;

export const AiBridgeInputSchema = z.discriminatedUnion("persona", [
  DealAnalystInputSchema,
  DealStrategistInputSchema,
  DealNegotiatorInputSchema,
]);

export type AiBridgeInput = z.infer<typeof AiBridgeInputSchema>;

export const AiBridgeSectionSchema = z.object({
  title: z.string(),
  body: z.string(),
});
export type AiBridgeSection = z.infer<typeof AiBridgeSectionSchema>;

export const AiSourceRefSchema = z.object({
  kind: z.enum(["run", "trace", "doc", "external"]),
  ref: z.string(),
  doc_id: z.string().optional(),
  title: z.string().optional(),
  trust_tier: z.number().optional(),
});
export type AiSourceRef = z.infer<typeof AiSourceRefSchema>;

export const AiBridgeResultSchema = z.object({
  persona: z.enum(["dealAnalyst", "dealStrategist", "dealNegotiator"]),
  summary: z.string(),
  key_numbers: AiBridgeSectionSchema.optional(),
  guardrails: AiBridgeSectionSchema.optional(),
  risk_and_evidence: AiBridgeSectionSchema.optional(),
  negotiation_playbook: AiBridgeSectionSchema.optional(),
  system_guidance: AiBridgeSectionSchema.optional(),
  followups: z.array(z.string()).optional(),
  sources: z.array(AiSourceRefSchema).default([]),
});
export type AiBridgeResult = z.infer<typeof AiBridgeResultSchema>;

export const NegotiationPlaybookSectionSchema = z.object({
  id: z.string(),
  module: z.enum(["competence", "price_anchor", "objection_pivot", "negative_reverse"]),
  scenarioLabel: z.string(),
  triggerPhrase: z.string(),
  scriptBody: z.string(),
  cushioningStatement: z.string().nullable().optional(),
  followupQuestion: z.string().nullable().optional(),
});

export const NegotiationPlaybookResultSchema = z.object({
  persona: z.literal("dealNegotiator"),
  mode: z.literal("generate_playbook"),
  runId: z.string(),
  logicRowIds: z.array(z.string()),
  sections: z.object({
    anchor: NegotiationPlaybookSectionSchema.nullable().optional(),
    script: NegotiationPlaybookSectionSchema.nullable().optional(),
    pivot: NegotiationPlaybookSectionSchema.nullable().optional(),
    all: z.array(NegotiationPlaybookSectionSchema),
  }),
});
export type NegotiationPlaybookResult = z.infer<typeof NegotiationPlaybookResultSchema>;

export const NegotiatorChatResultSchema = z.object({
  persona: z.literal("dealNegotiator"),
  mode: z.literal("chat"),
  runId: z.string().nullable(),
  logicRowIds: z.array(z.string()).default([]),
  messages: z.array(
    z.object({
      role: z.enum(["system", "assistant", "user"]),
      content: z.string(),
    }),
  ),
});
export type NegotiatorChatResult = z.infer<typeof NegotiatorChatResultSchema>;
