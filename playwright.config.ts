import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const qaEnvPath = path.resolve(__dirname, ".env.qa");
const qaEnv: Record<string, string> = {};

if (fs.existsSync(qaEnvPath)) {
  for (const line of fs.readFileSync(qaEnvPath, "utf8").split(/\r?\n/)) {
    if (!line.trim() || line.startsWith("#")) continue;
    const [key, ...rest] = line.split("=");
    if (key && rest.length > 0) {
      const value = rest.join("=");
      qaEnv[key] = value;
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

if (!process.env.PLAYWRIGHT_ENABLE) {
  process.env.PLAYWRIGHT_ENABLE = qaEnv.PLAYWRIGHT_ENABLE ?? "true";
}

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,      // tighten as you approach exact parity
      animations: "disabled",
    },
  },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm --filter \"./apps/hps-dealengine\" dev",
    port: 3000,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { ...process.env, ...qaEnv },
  },
});
