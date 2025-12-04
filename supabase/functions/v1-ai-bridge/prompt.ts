export type PromptRunContext = {
  posture: string;
  output: unknown;
  trace: unknown;
  policy_snapshot: unknown;
};

export type PromptEvidence = {
  id?: string;
  kind?: string | null;
  storage_key?: string | null;
  bytes?: number | null;
};

export function buildPrompt(
  run: PromptRunContext,
  userPrompt: string,
  evidence: PromptEvidence[],
  guardrails: string[],
): string {
  const evidenceSummary = evidence.map((e) => ({
    id: e.id,
    kind: e.kind,
    storageKey: e.storage_key,
    bytes: e.bytes,
  }));

  return [
    "You are an underwriting strategist. Provide advisory guidance only.",
    "Guardrails:",
    ...guardrails,
    `Posture: ${run.posture}`,
    `User prompt: ${userPrompt}`,
    `Run output: ${JSON.stringify(run.output)}`,
    `Run trace: ${JSON.stringify(run.trace)}`,
    `Policy snapshot: ${JSON.stringify(run.policy_snapshot)}`,
    `Evidence (ids/kinds/filesize): ${JSON.stringify(evidenceSummary)}`,
  ].join("\n\n");
}
