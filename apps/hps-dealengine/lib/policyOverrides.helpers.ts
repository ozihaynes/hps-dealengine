export function buildOverrideOrFilter(args: {
  dealId?: string;
  runId?: string | null;
  includeDealIdNullForPosture?: boolean;
  posture?: string | null;
}): string | null {
  const parts: string[] = [];
  if (args.runId) {
    parts.push(`run_id.eq.${args.runId}`);
  }
  if (args.dealId) {
    parts.push(`deal_id.eq.${args.dealId}`);
  }
  if (args.includeDealIdNullForPosture && args.posture) {
    parts.push("deal_id.is.null");
  }
  return parts.length ? parts.join(",") : null;
}
