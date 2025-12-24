import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const lockPath = resolve(process.cwd(), "supabase", "functions", "deno.lock");

if (!existsSync(lockPath)) {
  console.log("deno.lock not found; skipping.");
  process.exit(0);
}

let payload;
try {
  payload = JSON.parse(readFileSync(lockPath, "utf8"));
} catch (err) {
  console.error("Failed to parse supabase/functions/deno.lock as JSON.");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

const version = String(payload?.version ?? "");

if (version === "5") {
  console.error(
    "Supabase Edge does not support Deno lockfile v5. Use Deno 2.0-2.2.x to generate v4.",
  );
  process.exit(1);
}

console.log(`deno.lock version ${version || "unknown"} ok.`);
