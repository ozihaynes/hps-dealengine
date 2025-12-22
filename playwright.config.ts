import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const qaEnvPath = path.resolve(__dirname, ".env.qa");
const qaEnv: Record<string, string> = {};

if (fs.existsSync(qaEnvPath)) {
  for (const rawLine of fs.readFileSync(qaEnvPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const [key, ...rest] = line.split("=");
    if (!key || rest.length === 0) continue;

    const value = rest.join("=");
    qaEnv[key] = value;

    // Only set if not already present (lets CI or shells override)
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// Default to NOT running QA-gated specs unless .env.qa (or env) sets it.
if (!process.env.PLAYWRIGHT_ENABLE) {
  process.env.PLAYWRIGHT_ENABLE = qaEnv.PLAYWRIGHT_ENABLE ?? "false";
}

export default defineConfig({
  testDir: "./tests/e2e",

  // Critical: your tests wait up to 60s+ for nav. Give the suite room.
  timeout: 120_000,

  // Deterministic QA: avoid parallel mutation of the same seeded user/deals.
  fullyParallel: false,
  workers: 1,

  expect: {
    timeout: 15_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: "disabled",
    },
  },

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    navigationTimeout: 60_000,
    actionTimeout: 30_000,
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    command: 'pnpm --filter "./apps/hps-dealengine" dev',
    port: 3000,
    reuseExistingServer: false,
    stdout: "pipe",
    stderr: "pipe",

    // Give Next dev enough time to compile on a cold start.
    timeout: 180_000,

    env: { ...process.env, ...qaEnv },
  },
});
