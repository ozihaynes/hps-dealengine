import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const PLAYWRIGHT_ENABLED = process.env.PLAYWRIGHT_ENABLE === "true";
const describeMaybe = PLAYWRIGHT_ENABLED ? test.describe : test.describe.skip;

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

const API_URL = "http://127.0.0.1:54321";
const ANON_KEY = PLAYWRIGHT_ENABLED ? loadAnonKey() : "";

// This uses the same local dev user + org/policy we already wired:
//   email: local-dev@example.com
//   org_id: 00000000-0000-0000-0000-000000000001
describeMaybe("v1-analyze deterministic slice", () => {
  test("AIV=250k, DOM=45", async ({ request }) => {
    // 1) Log in to get an access token
    const authResponse = await request.post(
      `${API_URL}/auth/v1/token?grant_type=password`,
      {
        headers: {
          apikey: ANON_KEY,
          "Content-Type": "application/json",
        },
        data: {
          email: "local-dev@example.com",
          password: "LocalDev123!",
        },
      }
    );

    expect(authResponse.ok()).toBeTruthy();
    const authBody = await authResponse.json();
    const accessToken = authBody.access_token as string;
    expect(accessToken).toBeTruthy();

    // 2) Call v1-analyze with the same payload you proved via curl
    const analyzeResponse = await request.post(
      `${API_URL}/functions/v1/v1-analyze`,
      {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        data: {
          org_id: "00000000-0000-0000-0000-000000000001",
          posture: "base",
          deal: {
            aiv: 250000,
            dom: 45,
          },
        },
      }
    );

    expect(analyzeResponse.ok()).toBeTruthy();
    const body = await analyzeResponse.json();

    // 3) Assert deterministic outputs
    expect(body.ok).toBe(true);

    // aivCapped = 242,500 (0.97 cap on 250,000)
    expect(body.outputs.aivCapped).toBeCloseTo(242500, 2);

    // carryMonths = ceil(45 / 30) = 2, capped at 6
    expect(body.outputs.carryMonths).toBe(2);
  });
});
