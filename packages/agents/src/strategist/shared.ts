import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { SupabaseClient } from "@supabase/supabase-js";
import type {
  StrategistTimeRange,
  KpiSnapshot,
  RiskGateStats,
  SandboxSettings,
  KbChunk,
} from "./types";

type RunLite = {
  id: string;
  deal_id?: string | null;
  created_at?: string | null;
  output?: any;
};

function classifySpread(spread: number | null | undefined): string {
  if (spread == null) return "unknown";
  if (spread < 0) return "negative";
  if (spread < 5000) return "narrow";
  if (spread < 15000) return "medium";
  return "wide";
}

function classifyAssignmentFee(fee: number | null | undefined): string {
  if (fee == null) return "unknown";
  if (fee < 5000) return "<5k";
  if (fee < 15000) return "5k-15k";
  if (fee < 30000) return "15k-30k";
  return "30k+";
}

function classifyUrgency(days: number | null | undefined): string {
  if (days == null) return "unknown";
  if (days <= 14) return "emergency";
  if (days <= 30) return "high";
  if (days <= 60) return "medium";
  return "low";
}

export function computeKpiSnapshot(runs: RunLite[]): KpiSnapshot {
  const spreadBands: Record<string, number> = {};
  const assignmentFeeBands: Record<string, number> = {};
  const timelineUrgency: Record<string, number> = {};
  let readyForOfferCount = 0;
  const dealIds = new Set<string>();

  for (const run of runs) {
    if (run.deal_id) dealIds.add(run.deal_id);
    const outputs = (run.output as any)?.outputs ?? run.output ?? {};
    if ((outputs as any)?.workflow_state === "ReadyForOffer") readyForOfferCount += 1;

    const spread = (outputs as any)?.spread_cash ?? (outputs as any)?.spread_wholesale ?? null;
    const spreadBand = classifySpread(typeof spread === "number" ? spread : null);
    spreadBands[spreadBand] = (spreadBands[spreadBand] ?? 0) + 1;

    const fee = (outputs as any)?.wholesale_fee ?? (outputs as any)?.wholesale_fee_dc ?? null;
    const feeBand = classifyAssignmentFee(typeof fee === "number" ? fee : null);
    assignmentFeeBands[feeBand] = (assignmentFeeBands[feeBand] ?? 0) + 1;

    const dtm = (outputs as any)?.timeline_summary?.dtm_selected_days ?? null;
    const urgencyBand = classifyUrgency(typeof dtm === "number" ? dtm : null);
    timelineUrgency[urgencyBand] = (timelineUrgency[urgencyBand] ?? 0) + 1;
  }

  return {
    dealCount: dealIds.size,
    runCount: runs.length,
    readyForOfferCount,
    spreadBands,
    assignmentFeeBands,
    timelineUrgency,
  };
}

export function aggregateRiskGates(runs: RunLite[]): RiskGateStats {
  const gates: RiskGateStats["gates"] = {};
  const ensureGate = (key: string) => {
    if (!gates[key]) gates[key] = { pass: 0, watch: 0, fail: 0, missing: 0 };
    return gates[key];
  };

  for (const run of runs) {
    const outputs = (run.output as any)?.outputs ?? run.output ?? {};
    const risk = outputs?.risk_summary ?? {};
    const perGate: Record<string, { status?: string }> = risk?.per_gate ?? {};
    const keys = Object.keys(perGate);

    if (keys.length === 0) {
      ensureGate("risk_summary").missing += 1;
      continue;
    }

    for (const [gate, val] of Object.entries(perGate)) {
      const status = (val?.status ?? "").toString().toLowerCase();
      const bucket = ensureGate(gate);
      if (status === "pass") bucket.pass += 1;
      else if (status === "watch") bucket.watch += 1;
      else if (status === "fail") bucket.fail += 1;
      else bucket.missing += 1;
    }
  }

  return { totalRuns: runs.length, gates };
}

async function fetchRuns(
  supabase: SupabaseClient,
  orgId: string,
  timeRange?: StrategistTimeRange | null,
): Promise<RunLite[]> {
  let query = supabase
    .from("runs")
    .select("id, deal_id, created_at, output")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (timeRange?.from) query = query.gte("created_at", timeRange.from);
  if (timeRange?.to) query = query.lte("created_at", timeRange.to);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as RunLite[];
}

export async function getKpiSnapshot(
  supabase: SupabaseClient,
  opts: { orgId: string; timeRange?: StrategistTimeRange | null },
): Promise<KpiSnapshot> {
  const runs = await fetchRuns(supabase, opts.orgId, opts.timeRange);
  return computeKpiSnapshot(runs);
}

export async function getRiskGateStats(
  supabase: SupabaseClient,
  opts: { orgId: string; timeRange?: StrategistTimeRange | null },
): Promise<RiskGateStats> {
  const runs = await fetchRuns(supabase, opts.orgId, opts.timeRange);
  return aggregateRiskGates(runs);
}

export async function getSandboxSettings(
  supabase: SupabaseClient,
  opts: { orgId: string; posture?: string | null },
): Promise<SandboxSettings | null> {
  const posture = opts.posture ?? "base";
  const { data, error } = await supabase
    .from("sandbox_settings")
    .select("posture, config")
    .eq("org_id", opts.orgId)
    .eq("posture", posture)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data
    ? {
        posture: data.posture,
        config: data.config ?? {},
        presetName: null,
      }
    : null;
}

type DocMeta = {
  docId: string;
  category: string;
  trustTier: number;
  summary: string;
  path: string;
};

let registryCache: DocMeta[] | null = null;

function resolveKbRegistryPath(
  override?: string | null,
  rootDir?: string | null,
): string {
  const envPath = (override ?? process.env.HPS_KB_REGISTRY_PATH ?? "").trim();
  if (envPath.length > 0) {
    return path.isAbsolute(envPath)
      ? envPath
      : path.join(process.cwd(), envPath);
  }

  // __dirname is expected to be packages/agents/dist/strategist at runtime.
  // Walk up to repo root, then docs/ai/doc-registry.json.
  const fromRepoRoot = path.join(
    __dirname,
    "..", // strategist
    "..", // dist or src
    "..", // packages/agents
    "..", // repo root
    "docs",
    "ai",
    "doc-registry.json",
  );

  if (existsSync(fromRepoRoot)) {
    return fromRepoRoot;
  }

  // Fallback for tests or alternate environments
  const root = rootDir ?? process.env.HPS_KB_ROOT ?? process.cwd();
  return path.join(root, "docs", "ai", "doc-registry.json");
}

function resolveDocPath(docPath: string, rootDir?: string | null): string {
  const root = rootDir ?? process.env.HPS_KB_ROOT ?? process.cwd();
  return path.resolve(root, docPath);
}

async function loadRegistry(
  registryOverride?: string | null,
  rootDir?: string | null,
): Promise<DocMeta[]> {
  if (registryCache) return registryCache;
  const registryFile = resolveKbRegistryPath(registryOverride, rootDir);
  const raw = await fs.readFile(registryFile, "utf8");
  registryCache = JSON.parse(raw) as DocMeta[];
  return registryCache;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function scoreText(queryTokens: string[], text: string): number {
  const textTokens = tokenize(text);
  const counts = new Map<string, number>();
  for (const t of textTokens) counts.set(t, (counts.get(t) ?? 0) + 1);
  return queryTokens.reduce((acc, qt) => acc + (counts.get(qt) ?? 0), 0);
}

function splitIntoChunks(content: string): { heading?: string; text: string }[] {
  const lines = content.split(/\r?\n/);
  const chunks: { heading?: string; text: string }[] = [];
  let currentHeading: string | undefined;
  let buffer: string[] = [];

  const flush = () => {
    if (buffer.length === 0) return;
    chunks.push({ heading: currentHeading, text: buffer.join(" ").trim() });
    buffer = [];
  };

  for (const line of lines) {
    if (/^#{1,6}\s+/.test(line)) {
      flush();
      currentHeading = line.replace(/^#{1,6}\s+/, "").trim();
      continue;
    }
    if (line.trim() === "") {
      flush();
      continue;
    }
    buffer.push(line.trim());
  }
  flush();
  return chunks;
}

export async function kbSearchStrategist(opts: {
  query: string;
  category?: string | null;
  trustTierMax?: number | null;
  kbRootDir?: string | null;
  registryPath?: string | null;
  limit?: number | null;
}): Promise<KbChunk[]> {
  const { query, category, trustTierMax = 2, kbRootDir, registryPath: registryOverride, limit = 10 } =
    opts;
  const registry = await loadRegistry(registryOverride, kbRootDir);
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const docs = registry.filter(
    (d) =>
      (!category || d.category === category) &&
      (typeof trustTierMax !== "number" || d.trustTier <= trustTierMax),
  );

  const results: Array<{ score: number; chunk: KbChunk }> = [];

  for (const doc of docs) {
    const fullPath = resolveDocPath(doc.path, kbRootDir ?? undefined);
    let content: string;
    try {
      content = await fs.readFile(fullPath, "utf8");
    } catch {
      continue;
    }
    const chunks = splitIntoChunks(content);
    for (const chunk of chunks) {
      const score = scoreText(queryTokens, `${chunk.text} ${chunk.heading ?? ""}`);
      if (score <= 0) continue;
      results.push({
        score,
        chunk: {
          docId: doc.docId,
          trustTier: doc.trustTier,
          heading: chunk.heading,
          text: chunk.text,
        },
      });
    }
  }

  results.sort((a, b) => b.score - a.score || a.chunk.docId.localeCompare(b.chunk.docId));
  return results.slice(0, limit ?? 10).map((r) => r.chunk);
}
