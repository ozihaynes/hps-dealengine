import { test, expect, type APIRequestContext } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const PLAYWRIGHT_ENABLED = process.env.PLAYWRIGHT_ENABLE === "true";

function loadAnonKey(): string {
  // Go up two levels from tests/e2e -> project root, then into supabase/.env
  const envPath = path.resolve(__dirname, "..", "..", "supabase", ".env");
  const raw = fs.readFileSync(envPath, "utf8");
  const match = raw.match(/SUPABASE_ANON_KEY\s*=\s*([^\r\n]+)/);
  if (!match) {
    throw new Error("SUPABASE_ANON_KEY not found in supabase/.env");
  }
  return match[1].trim();
}

const API_URL =
  process.env.DEALENGINE_QA_API_URL ??
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "http://127.0.0.1:54321";
const QA_EMAIL = process.env.DEALENGINE_QA_USER_EMAIL ?? "local-dev@example.com";
const QA_PASSWORD = process.env.DEALENGINE_QA_USER_PASSWORD ?? "LocalDev123!";
const QA_ORG_ID =
  process.env.DEALENGINE_QA_ORG_ID ?? "00000000-0000-0000-0000-000000000001";
const QA_POSTURE = process.env.DEALENGINE_QA_POSTURE ?? "base";

const envAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ANON_KEY = PLAYWRIGHT_ENABLED ? envAnonKey ?? loadAnonKey() : "";
// If API_URL or ANON_KEY are missing, skip the suite: these tests hit Supabase v1-analyze directly.
const hasSupabaseEnv = !!API_URL && !!ANON_KEY;
const describeMaybe = hasSupabaseEnv ? test.describe : test.describe.skip;

async function getAccessToken(request: APIRequestContext) {
  const authResponse = await request.post(`${API_URL}/auth/v1/token?grant_type=password`, {
    headers: {
      apikey: ANON_KEY,
      "Content-Type": "application/json",
    },
    data: {
      email: QA_EMAIL,
      password: QA_PASSWORD,
    },
  });

  expect(authResponse.ok()).toBeTruthy();
  const authBody = await authResponse.json();
  const accessToken = authBody.access_token as string;
  expect(accessToken).toBeTruthy();
  return accessToken;
}

const isBorderlineEnvMissing =
  !process.env.DEALENGINE_QA_BORDERLINE_MIN_SPREAD ||
  !process.env.DEALENGINE_QA_BORDERLINE_SPREAD_CASH;
const borderlineTest = isBorderlineEnvMissing ? test.skip : test;

// Deterministic v1-analyze slices against QA org + seeded policy.
describeMaybe("v1-analyze deterministic slice", () => {
  test("happy path: AIV=250k, DOM=45 yields capped AIV and carry months", async ({ request }) => {
    const accessToken = await getAccessToken(request);

    const analyzeResponse = await request.post(`${API_URL}/functions/v1/v1-analyze`, {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      data: {
        org_id: QA_ORG_ID,
        posture: QA_POSTURE,
        deal: {
          aiv: 250000,
          dom: 45,
        },
      },
    });

    expect(analyzeResponse.ok()).toBeTruthy();
    const body = await analyzeResponse.json();

    expect(body.ok).toBe(true);
    expect(body.outputs.aivCapped).toBeCloseTo(242500, 2); // 0.97 cap on 250,000
    expect(body.outputs.carryMonths).toBe(2); // ceil(45/30) = 2, capped at 6
  });

  borderlineTest(
    "borderline spread but passing evidence: min spread ladder and borderline flag",
    async ({ request }) => {
    const accessToken = await getAccessToken(request);
    const payload = {
      org_id: QA_ORG_ID,
      posture: QA_POSTURE,
      deal: {
        aiv: Number(process.env.DEALENGINE_QA_BORDERLINE_AIV ?? 180000),
        arv: Number(process.env.DEALENGINE_QA_BORDERLINE_ARV ?? 180000),
        dom: Number(process.env.DEALENGINE_QA_BORDERLINE_DOM ?? 30),
        payoff: Number(process.env.DEALENGINE_QA_BORDERLINE_PAYOFF ?? 99000),
      },
    };
    const expectedMinSpread = Number(process.env.DEALENGINE_QA_BORDERLINE_MIN_SPREAD);
    const expectedSpreadCash = Number(process.env.DEALENGINE_QA_BORDERLINE_SPREAD_CASH);
    const expectedBorderline =
      (process.env.DEALENGINE_QA_BORDERLINE_FLAG ?? "true").toLowerCase() === "true";

    const analyzeResponse = await request.post(`${API_URL}/functions/v1/v1-analyze`, {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      data: payload,
    });

    expect(analyzeResponse.ok()).toBeTruthy();
    const body = await analyzeResponse.json();

    expect(body.ok).toBe(true);
    expect(body.outputs.min_spread_required).toBeCloseTo(expectedMinSpread, 0);
    expect(body.outputs.spread_cash).toBeCloseTo(expectedSpreadCash, 0);
    expect(body.outputs.borderline_flag).toBe(expectedBorderline);
  },
  );
});
