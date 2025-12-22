import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type EnvMap = Record<string, string>;

type DealSeed = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  contactName: string;
  county?: string;
  occupancy?: string;
};

type RunSeed = {
  id: string;
  dealId: string;
  posture: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  trace: Record<string, unknown>[];
};

const ORG_ID = "ed6ae332-2d15-44be-a8fb-36005522ad60";
const ORG_NAME = "QA Org (ed6a)";

const QA_EMAIL = "qa@hps.test.local";
const QA_PASSWORD = "QaTest!2025";
const QA_POSTURE = "base";
const QA_READY_CLIENT_NAME = "QA Ready Client";

const READY_DEAL_ID = "11111111-1111-4111-8111-111111111111";
const AUTOSAVE_DEAL_ID = "55555555-5555-4555-8555-555555555555";
const TIMELINE_DEAL_ID = "22222222-2222-4222-8222-222222222222";
const STALE_DEAL_ID = "33333333-3333-4333-8333-333333333333";
const HARD_GATE_DEAL_ID = "44444444-4444-4444-8444-444444444444";

const TIMELINE_DTM_DAYS = 42;
const TIMELINE_CARRY_MONTHS = 3;
const TIMELINE_SPEED_BAND = "balanced";

function parseStatusEnv(): EnvMap {
  const raw = execSync("supabase status -o env", { encoding: "utf8" });
  const env: EnvMap = {};
  raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .forEach((line) => {
      const normalized = line.replace(/^export\s+/, "");
      const [key, ...rest] = normalized.split("=");
      if (key && rest.length > 0) {
        const rawVal = rest.join("=").trim();
        env[key.trim()] = rawVal.replace(/^"+|"+$/g, "");
      }
    });
  // Normalize common aliases from supabase CLI output
  if (!env.SUPABASE_URL && env.API_URL) env.SUPABASE_URL = env.API_URL;
  if (!env.SUPABASE_ANON_KEY && env.ANON_KEY) env.SUPABASE_ANON_KEY = env.ANON_KEY;
  if (!env.SUPABASE_SERVICE_ROLE_KEY && env.SERVICE_ROLE_KEY) {
    env.SUPABASE_SERVICE_ROLE_KEY = env.SERVICE_ROLE_KEY;
  }
  return env;
}

function hashJson(value: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function findUserId(
  client: SupabaseClient,
  email: string,
): Promise<string | null> {
  let page = 1;
  const perPage = 100;

  // listUsers pagination is cheap locally; stop once no results remain
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match =
      data?.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase(),
      ) ?? null;
    if (match) return match.id;
    if (!data?.users || data.users.length < perPage) break;
    page += 1;
  }
  return null;
}

async function ensureUser(
  client: SupabaseClient,
  email: string,
  password: string,
): Promise<string> {
  const existingId = await findUserId(client, email);
  if (existingId) return existingId;

  const { data, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data?.user?.id) {
    throw error ?? new Error("Failed to create QA user");
  }
  return data.user.id;
}

async function ensureOrg(client: SupabaseClient): Promise<void> {
  const { error } = await client
    .from("organizations")
    .upsert({ id: ORG_ID, name: ORG_NAME }, { onConflict: "id" });
  if (error) {
    throw error;
  }
}

async function ensureMembership(
  client: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await client
    .from("memberships")
    .upsert(
      { org_id: ORG_ID, user_id: userId, role: "owner" },
      { onConflict: "org_id,user_id" },
    );
  if (error) {
    throw error;
  }
}

function buildDeals(): DealSeed[] {
  return [
    {
      id: READY_DEAL_ID,
      name: QA_READY_CLIENT_NAME,
      address: "123 Ready St",
      city: "Orlando",
      state: "FL",
      zip: "32801",
      contactName: QA_READY_CLIENT_NAME,
      county: "Orange",
      occupancy: "tenant",
    },
    {
      id: AUTOSAVE_DEAL_ID,
      name: "QA Autosave Deal",
      address: "987 Autosave Dr",
      city: "Orlando",
      state: "FL",
      zip: "32805",
      contactName: "Autosave Client",
      county: "Orange",
      occupancy: "vacant",
    },
    {
      id: TIMELINE_DEAL_ID,
      name: "QA Timeline Deal",
      address: "456 Timeline Ave",
      city: "Orlando",
      state: "FL",
      zip: "32802",
      contactName: "Timeline Client",
      county: "Orange",
      occupancy: "vacant",
    },
    {
      id: STALE_DEAL_ID,
      name: "QA Stale Evidence Deal",
      address: "789 Evidence Rd",
      city: "Orlando",
      state: "FL",
      zip: "32803",
      contactName: "Evidence Client",
      county: "Orange",
      occupancy: "vacant",
    },
    {
      id: HARD_GATE_DEAL_ID,
      name: "QA Hard Gate Deal",
      address: "321 Gate Ln",
      city: "Orlando",
      state: "FL",
      zip: "32804",
      contactName: "Gate Client",
      county: "Orange",
      occupancy: "owner",
    },
  ];
}

function buildTraceFrames(params: {
  evidence: Record<string, unknown>;
  risk: Record<string, unknown>;
  confidence: Record<string, unknown>;
  workflow: Record<string, unknown>;
}): Record<string, unknown>[] {
  return [
    { rule: "EVIDENCE_FRESHNESS_POLICY", details: params.evidence },
    { rule: "RISK_GATES_POLICY", details: params.risk },
    { rule: "CONFIDENCE_POLICY", details: params.confidence },
    { rule: "WORKFLOW_STATE_POLICY", details: params.workflow },
  ];
}

function buildRuns(): RunSeed[] {
  const commonInput = (dealId: string) => ({
    dealId,
    posture: QA_POSTURE,
    deal: { market: { arv: 320000, aiv: 300000, dom_zip_days: 30 } },
    sandbox: {},
    repairProfile: null,
    meta: {},
  });

  const readyEvidenceFreshness = {
    freshness_by_kind: {
      payoff_letter: { status: "fresh", age_days: 5, blocking_for_ready: false },
      title_quote: { status: "fresh", age_days: 2, blocking_for_ready: false },
      comps: { status: "fresh", age_days: 7, blocking_for_ready: false },
    },
    allow_placeholders_when_evidence_missing: false,
    placeholders_used: false,
    placeholder_kinds: [],
  };

  const staleEvidenceFreshness = {
    freshness_by_kind: {
      payoff_letter: { status: "missing", age_days: null, blocking_for_ready: true },
      title_quote: { status: "stale", age_days: 120, blocking_for_ready: true },
      comps: { status: "stale", age_days: 90, blocking_for_ready: false },
    },
    allow_placeholders_when_evidence_missing: true,
    placeholders_used: true,
    placeholder_kinds: ["payoff_letter"],
  };

  const readyRun: RunSeed = {
    id: "55555555-1111-4111-8111-111111111111",
    dealId: READY_DEAL_ID,
    posture: QA_POSTURE,
    input: commonInput(READY_DEAL_ID),
    output: {
      outputs: {
        primary_offer: 215000,
        instant_cash_offer: 210000,
        timeline_summary: {
          days_to_money: 30,
          carry_months: 2,
          carry_months_raw: 2,
          speed_band: TIMELINE_SPEED_BAND,
          urgency: "normal",
          hold_monthly_dollars: 3000,
          carry_total_dollars: 6000,
          dtm_selected_days: 30,
          dom_zip_days: 30,
          carry_months_capped: 2,
        },
        risk_summary: {
          overall: "pass",
          per_gate: {
            insurability: { status: "pass" },
            payoff: { status: "pass" },
          },
          reasons: ["All gates passing"],
        },
        evidence_summary: {
          confidence_grade: "A",
          confidence_reasons: ["All evidence fresh"],
          freshness_by_kind: readyEvidenceFreshness.freshness_by_kind,
        },
        workflow_state: "ReadyForOffer",
        workflow_reasons: ["Evidence complete", "Risk gates passing"],
        confidence_grade: "A",
        confidence_reasons: ["Policy confidence A"],
      },
    },
    trace: buildTraceFrames({
      evidence: readyEvidenceFreshness,
      risk: {
        per_gate: {
          insurability: { status: "pass", enabled: true, reasons: [] },
          payoff: { status: "pass", enabled: true, reasons: [] },
        },
      },
      confidence: {
        grade: "A",
        reasons: ["Evidence fresh"],
        rubric_raw: '{"A":"excellent","B":"strong"}',
      },
      workflow: {
        workflow_state: "ReadyForOffer",
        reasons: ["All signals green"],
        allow_placeholders_when_evidence_missing: false,
        placeholders_used: false,
      },
    }),
  };

  const timelineRun: RunSeed = {
    id: "55555555-2222-4222-8222-222222222222",
    dealId: TIMELINE_DEAL_ID,
    posture: QA_POSTURE,
    input: commonInput(TIMELINE_DEAL_ID),
    output: {
      outputs: {
        primary_offer: 205000,
        timeline_summary: {
          days_to_money: TIMELINE_DTM_DAYS,
          dtm_selected_days: TIMELINE_DTM_DAYS,
          carry_months: TIMELINE_CARRY_MONTHS,
          carry_months_raw: TIMELINE_CARRY_MONTHS,
          carry_months_capped: TIMELINE_CARRY_MONTHS,
          speed_band: TIMELINE_SPEED_BAND,
          urgency: "standard",
          hold_monthly_dollars: 2500,
          carry_total_dollars: TIMELINE_CARRY_MONTHS * 2500,
          dom_zip_days: 45,
        },
        risk_summary: {
          overall: "pass",
          per_gate: { insurability: { status: "pass" } },
          reasons: [],
        },
        evidence_summary: {
          confidence_grade: "B",
          freshness_by_kind: readyEvidenceFreshness.freshness_by_kind,
        },
        workflow_state: "ReadyForOffer",
        workflow_reasons: ["Timeline seeded"],
        confidence_grade: "B",
        confidence_reasons: ["Timeline QA run"],
      },
    },
    trace: buildTraceFrames({
      evidence: readyEvidenceFreshness,
      risk: { per_gate: { insurability: { status: "pass", enabled: true } } },
      confidence: { grade: "B", reasons: ["Timeline QA run"] },
      workflow: {
        workflow_state: "ReadyForOffer",
        reasons: ["Timeline QA run"],
        allow_placeholders_when_evidence_missing: false,
        placeholders_used: false,
      },
    }),
  };

  const staleRun: RunSeed = {
    id: "55555555-3333-4333-8333-333333333333",
    dealId: STALE_DEAL_ID,
    posture: QA_POSTURE,
    input: commonInput(STALE_DEAL_ID),
    output: {
      outputs: {
        primary_offer: 180000,
        risk_summary: {
          overall: "watch",
          per_gate: {
            insurability: { status: "watch", reasons: ["Title quote stale"] },
            payoff: { status: "watch", reasons: ["Payoff letter missing"] },
          },
          reasons: ["Evidence stale or missing"],
        },
        evidence_summary: {
          confidence_grade: "B",
          confidence_reasons: ["Stale evidence present"],
          freshness_by_kind: staleEvidenceFreshness.freshness_by_kind,
        },
        workflow_state: "NeedsReview",
        workflow_reasons: ["Evidence stale or missing"],
        confidence_grade: "B",
        confidence_reasons: ["Stale evidence"],
      },
    },
    trace: buildTraceFrames({
      evidence: staleEvidenceFreshness,
      risk: {
        per_gate: {
          insurability: { status: "watch", enabled: true, reasons: ["Title quote stale"] },
          payoff: { status: "watch", enabled: true, reasons: ["Payoff letter missing"] },
        },
        reasons: ["Evidence stale or missing"],
      },
      confidence: {
        grade: "B",
        reasons: ["Stale evidence"],
      },
      workflow: {
        workflow_state: "NeedsReview",
        reasons: ["Evidence stale or missing"],
        allow_placeholders_when_evidence_missing: true,
        placeholders_used: true,
        placeholder_kinds: ["payoff_letter"],
      },
    }),
  };

  const hardGateRun: RunSeed = {
    id: "55555555-4444-4444-8444-444444444444",
    dealId: HARD_GATE_DEAL_ID,
    posture: QA_POSTURE,
    input: commonInput(HARD_GATE_DEAL_ID),
    output: {
      outputs: {
        primary_offer: 165000,
        risk_summary: {
          overall: "fail",
          per_gate: {
            insurability: {
              status: "fail",
              reasons: ["Flood zone high risk"],
              enabled: true,
            },
            payoff: { status: "watch", reasons: ["Pending payoff clarification"], enabled: true },
          },
          reasons: ["Insurability gate failed"],
        },
        evidence_summary: {
          confidence_grade: "C",
          confidence_reasons: ["Hard gate failure"],
          freshness_by_kind: {
            payoff_letter: { status: "fresh", age_days: 10, blocking_for_ready: false },
            insurance: { status: "fresh", age_days: 5, blocking_for_ready: false },
          },
        },
        workflow_state: "NeedsReview",
        workflow_reasons: ["Risk gates failing"],
        confidence_grade: "C",
        confidence_reasons: ["Hard gate failure"],
      },
    },
    trace: buildTraceFrames({
      evidence: {
        freshness_by_kind: {
          payoff_letter: { status: "fresh", age_days: 10, blocking_for_ready: false },
          insurance: { status: "fresh", age_days: 5, blocking_for_ready: false },
        },
        allow_placeholders_when_evidence_missing: false,
        placeholders_used: false,
      },
      risk: {
        per_gate: {
          insurability: { status: "fail", enabled: true, reasons: ["Flood zone high risk"] },
          payoff: { status: "watch", enabled: true, reasons: ["Pending payoff clarification"] },
        },
        reasons: ["Insurability gate failed"],
      },
      confidence: { grade: "C", reasons: ["Hard gate failure"] },
      workflow: {
        workflow_state: "NeedsReview",
        reasons: ["Risk gates failing"],
        allow_placeholders_when_evidence_missing: false,
        placeholders_used: false,
      },
    }),
  };

  return [readyRun, timelineRun, staleRun, hardGateRun];
}

async function upsertDeals(
  client: SupabaseClient,
  deals: DealSeed[],
  userId: string,
): Promise<void> {
  const rows = deals.map((deal) => ({
    id: deal.id,
    org_id: ORG_ID,
    created_by: userId,
    client_name: deal.contactName,
    client_phone: "407-555-0100",
    client_email: "seller@test.local",
    address: deal.address,
    city: deal.city,
    state: deal.state,
    zip: deal.zip,
    payload: {
      contact: {
        name: deal.contactName,
        phone: "407-555-0100",
        email: "seller@test.local",
        owner: { name: deal.contactName, phone: "407-555-0100", email: "seller@test.local" },
      },
      client: {
        name: deal.contactName,
        phone: "407-555-0100",
        email: "seller@test.local",
      },
      property: {
        address: deal.address,
        city: deal.city,
        state: deal.state,
        zip: deal.zip,
        county: deal.county ?? null,
        occupancy: deal.occupancy ?? null,
      },
    },
  }));

  const { error } = await client.from("deals").upsert(rows, { onConflict: "id" });
  if (error) {
    throw error;
  }
}

async function upsertRuns(
  client: SupabaseClient,
  runs: RunSeed[],
  userId: string,
): Promise<void> {
  const rows = runs.map((run) => {
    const createdAt = new Date().toISOString();
    const inputHash = hashJson(run.input);
    const outputHash = hashJson(run.output);
    return {
      id: run.id,
      org_id: ORG_ID,
      deal_id: run.dealId,
      created_by: userId,
      posture: run.posture,
      input: run.input,
      input_hash: inputHash,
      output: run.output,
      output_hash: outputHash,
      policy_hash: hashJson({ policy: "qa-v1" }),
      policy_snapshot: {},
      trace: run.trace,
      created_at: createdAt,
    };
  });

  const { error } = await client.from("runs").upsert(rows, { onConflict: "id" });
  if (error) {
    throw error;
  }
}

async function computeBorderlineExpectations(apiUrl: string, anonKey: string) {
  const userClient = createClient(apiUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: session, error: signInError } = await userClient.auth.signInWithPassword({
    email: QA_EMAIL,
    password: QA_PASSWORD,
  });
  if (signInError || !session?.session?.access_token) {
    throw signInError ?? new Error("Failed to sign in QA user for borderline expectations");
  }

  const accessToken = session.session.access_token;

  const response = await fetch(`${apiUrl}/functions/v1/v1-analyze`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      org_id: ORG_ID,
      posture: QA_POSTURE,
      deal: {
        aiv: 180000,
        arv: 180000,
        dom: 30,
        payoff: 99000,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`v1-analyze call failed (${response.status})`);
  }
  const body = (await response.json()) as any;
  const outputs = (body?.result?.outputs ?? {}) as Record<string, any>;
  return {
    minSpread: Number(outputs.min_spread_required ?? outputs.min_spread ?? 0),
    spreadCash: Number(outputs.spread_cash ?? 0),
    flag: Boolean(outputs.borderline_flag ?? outputs.borderline ?? false),
  };
}

function writeEnvFile(env: EnvMap, overrides: Record<string, string | number | boolean>) {
  const lines = [
    `PLAYWRIGHT_ENABLE=true`,
    `NEXT_PUBLIC_SUPABASE_URL=${env.SUPABASE_URL}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${env.SUPABASE_ANON_KEY}`,
    `SUPABASE_URL=${env.SUPABASE_URL}`,
    `SUPABASE_ANON_KEY=${env.SUPABASE_ANON_KEY}`,
    `DEALENGINE_QA_API_URL=${env.SUPABASE_URL}`,
    `DEALENGINE_QA_USER_EMAIL=${QA_EMAIL}`,
    `DEALENGINE_QA_USER_PASSWORD=${QA_PASSWORD}`,
    `DEALENGINE_QA_ORG_ID=${ORG_ID}`,
    `DEALENGINE_QA_POSTURE=${QA_POSTURE}`,
    `DEALENGINE_QA_READY_DEAL_ID=${READY_DEAL_ID}`,
    `DEALENGINE_QA_READY_CLIENT_NAME=${QA_READY_CLIENT_NAME}`,
    `DEALENGINE_QA_AUTOSAVE_DEAL_ID=${AUTOSAVE_DEAL_ID}`,
    `DEALENGINE_QA_TIMELINE_DEAL_ID=${TIMELINE_DEAL_ID}`,
    `DEALENGINE_QA_TIMELINE_DTM_DAYS=${TIMELINE_DTM_DAYS}`,
    `DEALENGINE_QA_TIMELINE_CARRY_MONTHS=${TIMELINE_CARRY_MONTHS}`,
    `DEALENGINE_QA_TIMELINE_SPEED_BAND=${TIMELINE_SPEED_BAND}`,
    `DEALENGINE_QA_STALE_EVIDENCE_DEAL_ID=${STALE_DEAL_ID}`,
    `DEALENGINE_QA_HARD_GATE_DEAL_ID=${HARD_GATE_DEAL_ID}`,
    `DEALENGINE_QA_BORDERLINE_MIN_SPREAD=${overrides.DEALENGINE_QA_BORDERLINE_MIN_SPREAD}`,
    `DEALENGINE_QA_BORDERLINE_SPREAD_CASH=${overrides.DEALENGINE_QA_BORDERLINE_SPREAD_CASH}`,
    `DEALENGINE_QA_BORDERLINE_AIV=180000`,
    `DEALENGINE_QA_BORDERLINE_ARV=180000`,
    `DEALENGINE_QA_BORDERLINE_DOM=30`,
    `DEALENGINE_QA_BORDERLINE_PAYOFF=99000`,
    `DEALENGINE_QA_BORDERLINE_FLAG=${overrides.DEALENGINE_QA_BORDERLINE_FLAG}`,
  ];

  const envPath = path.join(process.cwd(), ".env.qa");
  fs.writeFileSync(envPath, lines.join("\n") + "\n", "utf8");
}

async function main() {
  const env = parseStatusEnv();
  const required = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
  for (const key of required) {
    if (!env[key]) {
      throw new Error(`Missing ${key} from supabase status -o env output.`);
    }
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  await ensureOrg(supabase);
  const userId = await ensureUser(supabase, QA_EMAIL, QA_PASSWORD);
  await ensureMembership(supabase, userId);

  const deals = buildDeals();
  await upsertDeals(supabase, deals, userId);
  const runs = buildRuns();
  await upsertRuns(supabase, runs, userId);

  const borderline = await computeBorderlineExpectations(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
  );
  writeEnvFile(env, {
    DEALENGINE_QA_BORDERLINE_MIN_SPREAD: borderline.minSpread.toString(),
    DEALENGINE_QA_BORDERLINE_SPREAD_CASH: borderline.spreadCash.toString(),
    DEALENGINE_QA_BORDERLINE_FLAG: String(borderline.flag),
  });

  console.log("Seeded QA fixtures for org", ORG_ID);
  console.log("User:", QA_EMAIL);
  console.log(
    "Deals:",
    `READY=${READY_DEAL_ID}, AUTOSAVE=${AUTOSAVE_DEAL_ID}, TIMELINE=${TIMELINE_DEAL_ID}, STALE_EVIDENCE=${STALE_DEAL_ID}, HARD_GATE=${HARD_GATE_DEAL_ID}`,
  );
  console.log("Wrote .env.qa with QA variables (values not shown).");
}

main().catch((err) => {
  console.error("QA seed failed:", err.message ?? err);
  process.exit(1);
});
