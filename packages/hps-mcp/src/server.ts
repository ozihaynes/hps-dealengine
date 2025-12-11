import { z } from "zod";
import { createSupabaseRlsClient } from "@hps/agents";
import {
  deriveDealFactsFromRun,
  loadNegotiationDataset,
  matchNegotiationRow,
  negotiationDealFactsInputSchema,
  negotiationMatrixRowSchema,
  type NegotiationDealFacts,
} from "./negotiationMatrix";
import { kbSearch } from "./docSearch";
import {
  aggregateRiskGates,
  computeKpiSnapshot,
  kpiSnapshotSchema,
  type RunLite,
  type TimeRange,
} from "./strategistTools";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");

export type HpsContextParams = {
  orgId: string;
  userId: string;
  accessToken: string;
};

const server = new McpServer({ name: "hps-mcp", version: "0.1.0" }, {});

const hpsContextSchema = z.object({
  orgId: z.string(),
  userId: z.string(),
  accessToken: z.string(),
});

const dealInputSchema = hpsContextSchema.extend({
  dealId: z.string(),
});
type DealInput = z.infer<typeof dealInputSchema>;

const runInputSchema = hpsContextSchema.extend({
  dealId: z.string(),
});
type RunInput = z.infer<typeof runInputSchema>;

const evidenceInputSchema = hpsContextSchema.extend({
  runId: z.string(),
});
type EvidenceInput = z.infer<typeof evidenceInputSchema>;

const dealRowSchema = z.object({
  id: z.string(),
  org_id: z.string(),
  created_by: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  payload: z.unknown().optional(),
});
type DealRow = z.infer<typeof dealRowSchema>;

const runRowSchema = z.object({
  id: z.string(),
  org_id: z.string(),
  deal_id: z.string().nullable().optional(),
  created_by: z.string().nullable().optional(),
  posture: z.string().nullable().optional(),
  policy_version_id: z.string().nullable().optional(),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  trace: z.unknown().optional(),
  input_hash: z.string().nullable().optional(),
  output_hash: z.string().nullable().optional(),
  policy_hash: z.string().nullable().optional(),
  policy_snapshot: z.unknown().optional(),
  created_at: z.string().nullable().optional(),
});
type RunRow = z.infer<typeof runRowSchema>;

const evidenceRowSchema = z.object({
  id: z.string(),
  org_id: z.string(),
  deal_id: z.string().nullable().optional(),
  run_id: z.string().nullable().optional(),
  kind: z.string(),
  filename: z.string().nullable().optional(),
  storage_key: z.string().nullable().optional(),
  sha256: z.string().nullable().optional(),
  bytes: z.number().nullable().optional(),
  mime_type: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  created_by: z.string().nullable().optional(),
});
type EvidenceRow = z.infer<typeof evidenceRowSchema>;

const dealResultSchema = z.object({
  ok: z.boolean(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  deal: dealRowSchema.nullable().optional(),
});

const runResultSchema = z.object({
  ok: z.boolean(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  run: runRowSchema.nullable().optional(),
});

const evidenceResultSchema = z.object({
  ok: z.boolean(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  evidence: z.array(evidenceRowSchema).optional(),
});

const timeRangeSchema = z
  .object({
    from: z.string().optional(),
    to: z.string().optional(),
  })
  .optional();

const negotiationInputSchema = hpsContextSchema.extend({
  dealId: z.string(),
  runId: z.string().optional(),
  dealFacts: negotiationDealFactsInputSchema.optional(),
});
type NegotiationInput = z.infer<typeof negotiationInputSchema>;

const negotiationPlanSchema = negotiationMatrixRowSchema.extend({
  matchScore: z.number(),
  matchedFacts: z.array(z.string()),
  unmatchedFacts: z.array(z.string()),
});

const negotiationResultSchema = z.object({
  ok: z.boolean(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  negotiationPlan: negotiationPlanSchema.nullable().optional(),
});

const kpiInputSchema = hpsContextSchema.extend({
  timeRange: timeRangeSchema,
});
type KpiInput = z.infer<typeof kpiInputSchema>;

const kpiResultSchema = z.object({
  ok: z.boolean(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  kpiSnapshot: kpiSnapshotSchema.optional(),
});

const riskGateResultSchema = z.object({
  ok: z.boolean(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  riskGateStats: z
    .object({
      totalRuns: z.number(),
      gates: z.record(
        z.object({
          pass: z.number(),
          watch: z.number(),
          fail: z.number(),
          missing: z.number(),
        }),
      ),
    })
    .optional(),
});

const sandboxResultSchema = z.object({
  ok: z.boolean(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  sandboxSettings: z
    .object({
      posture: z.string(),
      config: z.record(z.string(), z.unknown()),
      presetName: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

const kbSearchInputSchema = hpsContextSchema.extend({
  query: z.string(),
  category: z.string().optional(),
  trustTierMax: z.number().optional(),
});
type KbSearchInput = z.infer<typeof kbSearchInputSchema>;

const kbSearchResultSchema = z.object({
  ok: z.boolean(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  kbChunks: z
    .array(
      z.object({
        docId: z.string(),
        trustTier: z.number(),
        heading: z.string().optional(),
        text: z.string(),
      }),
    )
    .optional(),
});

function toContent(payload: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(payload) }] };
}

function errorPayload(errorCode: string, errorMessage: string) {
  return { ok: false, errorCode, errorMessage };
}

server.registerTool(
  "hps_get_deal_by_id",
  {
    description: "Fetch a deal record (RLS enforced).",
    inputSchema: dealInputSchema,
    outputSchema: dealResultSchema,
  },
  async ({ orgId, userId: _userId, accessToken, dealId }: DealInput) => {
    try {
      const supabase = createSupabaseRlsClient(accessToken);
      const { data, error } = await supabase
        .from("deals")
        .select(
          "id, org_id, created_by, created_at, updated_at, address, city, state, zip, payload",
        )
        .eq("org_id", orgId)
        .eq("id", dealId)
        .maybeSingle();

      if (error) return toContent(errorPayload("deal_query_failed", error.message));
      if (!data) return toContent(errorPayload("deal_not_found", "Deal not found or not accessible."));

      const parsed = dealRowSchema.safeParse(data);
      if (!parsed.success) {
        return toContent(errorPayload("deal_schema_mismatch", parsed.error.message));
      }

      const payload: z.infer<typeof dealResultSchema> = { ok: true, deal: parsed.data };
      return toContent(payload);
    } catch (err: any) {
      return toContent(errorPayload("deal_unexpected_error", err?.message ?? "Unknown error"));
    }
  },
);

server.registerTool(
  "hps_get_latest_run_for_deal",
  {
    description: "Load the latest underwriting run row for a deal (RLS enforced).",
    inputSchema: runInputSchema,
    outputSchema: runResultSchema,
  },
  async ({ orgId, userId: _userId, accessToken, dealId }: RunInput) => {
    try {
      const supabase = createSupabaseRlsClient(accessToken);
      const { data, error } = await supabase
        .from("runs")
        .select(
          "id, org_id, deal_id, created_by, posture, policy_version_id, policy_snapshot, input, output, trace, input_hash, output_hash, policy_hash, created_at",
        )
        .eq("org_id", orgId)
        .eq("deal_id", dealId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return toContent(errorPayload("run_query_failed", error.message));
      if (!data) return toContent(errorPayload("run_not_found", "Run not found for deal or not accessible."));

      const parsed = runRowSchema.safeParse(data);
      if (!parsed.success) {
        return toContent(errorPayload("run_schema_mismatch", parsed.error.message));
      }

      const payload: z.infer<typeof runResultSchema> = { ok: true, run: parsed.data };
      return toContent(payload);
    } catch (err: any) {
      return toContent(errorPayload("run_unexpected_error", err?.message ?? "Unknown error"));
    }
  },
);

server.registerTool(
  "hps_list_evidence_for_run",
  {
    description: "List evidence rows attached to a run (RLS enforced).",
    inputSchema: evidenceInputSchema,
    outputSchema: evidenceResultSchema,
  },
  async ({ orgId, userId: _userId, accessToken, runId }: EvidenceInput) => {
    try {
      const supabase = createSupabaseRlsClient(accessToken);
      const { data, error } = await supabase
        .from("evidence")
        .select(
          "id, org_id, deal_id, run_id, kind, filename, storage_key, sha256, bytes, mime_type, created_at, updated_at, created_by",
        )
        .eq("org_id", orgId)
        .eq("run_id", runId)
        .order("created_at", { ascending: false });

      if (error) return toContent(errorPayload("evidence_query_failed", error.message));

      const parsed = evidenceRowSchema.array().safeParse(data ?? []);
      if (!parsed.success) {
        return toContent(errorPayload("evidence_schema_mismatch", parsed.error.message));
      }

      const payload: z.infer<typeof evidenceResultSchema> = { ok: true, evidence: parsed.data };
      return toContent(payload);
    } catch (err: any) {
      return toContent(errorPayload("evidence_unexpected_error", err?.message ?? "Unknown error"));
    }
  },
);

async function fetchRunRow(
  supabase: ReturnType<typeof createSupabaseRlsClient>,
  orgId: string,
  dealId: string,
  runId?: string,
) {
  let query = supabase
    .from("runs")
    .select(
      "id, org_id, deal_id, created_by, posture, policy_version_id, policy_snapshot, input, output, trace, input_hash, output_hash, policy_hash, created_at",
    )
    .eq("org_id", orgId)
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (runId) {
    query = query.eq("id", runId).limit(1);
  }

  return query.maybeSingle();
}

server.registerTool(
  "hps_get_negotiation_strategy",
  {
    description:
      "Select a negotiation strategy matrix row for a deal using normalized deal facts (RLS enforced for runs).",
    inputSchema: negotiationInputSchema,
    outputSchema: negotiationResultSchema,
  },
  async ({ orgId, userId: _userId, accessToken, dealId, runId, dealFacts }: NegotiationInput) => {
    try {
      const supabase = createSupabaseRlsClient(accessToken);
      const { data: runData, error: runError } = await fetchRunRow(supabase, orgId, dealId, runId);
      if (runError) return toContent(errorPayload("run_query_failed", runError.message));
      if (!runData) return toContent(errorPayload("run_not_found", "Run not found for deal or not accessible."));

      const parsedRun = runRowSchema.safeParse(runData);
      if (!parsedRun.success) {
        return toContent(errorPayload("run_schema_mismatch", parsedRun.error.message));
      }

      const derivedFacts = deriveDealFactsFromRun(parsedRun.data);
      const mergedFacts: Partial<NegotiationDealFacts> = { ...derivedFacts, ...(dealFacts ?? {}) };

      const dataset = await loadNegotiationDataset();
      const match = matchNegotiationRow(dataset, mergedFacts);
      if (!match) {
        return toContent(errorPayload("negotiation_no_match", "No negotiation matrix row matched the deal facts."));
      }

      const payload: z.infer<typeof negotiationResultSchema> = {
        ok: true,
        negotiationPlan: {
          ...match.row,
          matchScore: match.matchScore,
          matchedFacts: match.matchedFacts,
          unmatchedFacts: match.unmatchedFacts,
        },
      };

      return toContent(payload);
    } catch (err: any) {
      return toContent(errorPayload("negotiation_unexpected_error", err?.message ?? "Unknown error"));
    }
  },
);

async function fetchRunsForOrg(
  supabase: ReturnType<typeof createSupabaseRlsClient>,
  orgId: string,
  timeRange?: TimeRange,
): Promise<{ data: RunLite[] | null; error: any }> {
  let query = supabase
    .from("runs")
    .select("id, deal_id, created_at, output")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (timeRange?.from) query = query.gte("created_at", timeRange.from);
  if (timeRange?.to) query = query.lte("created_at", timeRange.to);

  return query;
}

server.registerTool(
  "hps_get_kpi_snapshot",
  {
    description: "Compute org-level KPI snapshot over runs (dashboard-aligned, RLS enforced).",
    inputSchema: kpiInputSchema,
    outputSchema: kpiResultSchema,
  },
  async ({ orgId, userId: _userId, accessToken, timeRange }: KpiInput) => {
    try {
      const supabase = createSupabaseRlsClient(accessToken);
      const { data, error } = await fetchRunsForOrg(supabase, orgId, timeRange ?? undefined);
      if (error) return toContent(errorPayload("runs_query_failed", error.message));
      const runs = (data ?? []) as RunLite[];
      const snapshot = computeKpiSnapshot(runs);
      return toContent({ ok: true, kpiSnapshot: snapshot });
    } catch (err: any) {
      return toContent(errorPayload("kpi_unexpected_error", err?.message ?? "Unknown error"));
    }
  },
);

server.registerTool(
  "hps_get_risk_gate_stats",
  {
    description: "Aggregate risk gate statuses across runs (RLS enforced).",
    inputSchema: kpiInputSchema,
    outputSchema: riskGateResultSchema,
  },
  async ({ orgId, userId: _userId, accessToken, timeRange }: KpiInput) => {
    try {
      const supabase = createSupabaseRlsClient(accessToken);
      const { data, error } = await fetchRunsForOrg(supabase, orgId, timeRange ?? undefined);
      if (error) return toContent(errorPayload("runs_query_failed", error.message));
      const runs = (data ?? []) as RunLite[];
      const stats = aggregateRiskGates(runs);
      return toContent({ ok: true, riskGateStats: stats });
    } catch (err: any) {
      return toContent(errorPayload("risk_unexpected_error", err?.message ?? "Unknown error"));
    }
  },
);

server.registerTool(
  "hps_get_sandbox_settings",
  {
    description: "Fetch sandbox settings for an org/posture (RLS enforced).",
    inputSchema: hpsContextSchema.extend({ posture: z.string().optional() }),
    outputSchema: sandboxResultSchema,
  },
  async ({
    orgId,
    userId: _userId,
    accessToken,
    posture,
  }: {
    orgId: string;
    userId: string;
    accessToken: string;
    posture?: string;
  }) => {
    try {
      const supabase = createSupabaseRlsClient(accessToken);
      const targetPosture = posture ?? "base";
      const { data, error } = await supabase
        .from("sandbox_settings")
        .select("posture, config")
        .eq("org_id", orgId)
        .eq("posture", targetPosture)
        .maybeSingle();

      if (error) return toContent(errorPayload("sandbox_query_failed", error.message));

      const sandboxSettings = data
        ? {
            posture: data.posture,
            config: data.config ?? {},
            presetName: null,
          }
        : null;

      return toContent({ ok: true, sandboxSettings });
    } catch (err: any) {
      return toContent(errorPayload("sandbox_unexpected_error", err?.message ?? "Unknown error"));
    }
  },
);

server.registerTool(
  "hps_kb_search_strategist",
  {
    description: "Search strategist knowledge base docs with simple keyword scoring.",
    inputSchema: kbSearchInputSchema,
    outputSchema: kbSearchResultSchema,
  },
  async ({
    orgId: _orgId,
    userId: _userId,
    accessToken: _accessToken,
    query,
    category,
    trustTierMax,
  }: KbSearchInput) => {
    try {
      const chunks = await kbSearch({ query, category, trustTierMax, limit: 10 });
      return toContent({ ok: true, kbChunks: chunks });
    } catch (err: any) {
      return toContent(errorPayload("kb_search_failed", err?.message ?? "Unknown error"));
    }
  },
);

export async function startServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.info("hps-mcp server running on stdio (analyst tools enabled).");
}

export { server };
