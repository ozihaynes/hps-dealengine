import { describe, expect, it, beforeAll, afterAll } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { aggregateRiskGates, computeKpiSnapshot, type RunLite } from "../src/strategistTools";
import { kbSearch } from "../src/docSearch";

describe("computeKpiSnapshot", () => {
  it("aggregates spread, assignment fee, and readiness", () => {
    const runs: RunLite[] = [
      { id: "r1", deal_id: "d1", output: { outputs: { spread_cash: 2000, wholesale_fee: 4000, workflow_state: "ReadyForOffer", timeline_summary: { dtm_selected_days: 10 } } } },
      { id: "r2", deal_id: "d2", output: { outputs: { spread_cash: 12000, wholesale_fee: 20000, timeline_summary: { dtm_selected_days: 25 } } } },
      { id: "r3", deal_id: "d1", output: { outputs: { spread_cash: -1000, wholesale_fee: null, timeline_summary: { dtm_selected_days: 70 } } } },
    ];

    const snap = computeKpiSnapshot(runs);
    expect(snap.runCount).toBe(3);
    expect(snap.dealCount).toBe(2);
    expect(snap.readyForOfferCount).toBe(1);
    expect(snap.spreadBands.narrow).toBe(1);
    expect(snap.spreadBands.medium).toBe(1);
    expect(snap.spreadBands.negative).toBe(1);
    expect(snap.assignmentFeeBands["<5k"]).toBe(1);
    expect(snap.assignmentFeeBands["15k-30k"]).toBe(1);
    expect(snap.timelineUrgency.emergency).toBe(1);
    expect(snap.timelineUrgency.high).toBe(1);
    expect(snap.timelineUrgency.low).toBe(1);
  });
});

describe("aggregateRiskGates", () => {
  it("counts per gate statuses", () => {
    const runs: RunLite[] = [
      {
        id: "r1",
        output: { outputs: { risk_summary: { per_gate: { flood_50pct: { status: "fail" }, firpta: { status: "pass" } } } } },
      },
      {
        id: "r2",
        output: { outputs: { risk_summary: { per_gate: { flood_50pct: { status: "watch" } } } } },
      },
      {
        id: "r3",
        output: { outputs: { risk_summary: { per_gate: { firpta: { status: "watch" } } } } },
      },
    ];

    const stats = aggregateRiskGates(runs);
    expect(stats.totalRuns).toBe(3);
    expect(stats.gates.flood_50pct.fail).toBe(1);
    expect(stats.gates.flood_50pct.watch).toBe(1);
    expect(stats.gates.firpta.pass).toBe(1);
    expect(stats.gates.firpta.watch).toBe(1);
  });
});

describe("kbSearch", () => {
  const tmpRoot = path.join(os.tmpdir(), "hps-mcp-kbtest");
  const docsDir = path.join(tmpRoot, "docs/ai");
  const docAPath = path.join(tmpRoot, "docs/a.md");
  const docBPath = path.join(tmpRoot, "docs/b.md");
  const registryPath = path.join(docsDir, "doc-registry.json");

  beforeAll(async () => {
    await fs.mkdir(docsDir, { recursive: true });
    await fs.mkdir(path.dirname(docAPath), { recursive: true });
    await fs.writeFile(
      registryPath,
      JSON.stringify([
        { docId: "docA", category: "dashboard", trustTier: 1, summary: "", path: path.relative(tmpRoot, docAPath) },
        { docId: "docB", category: "dashboard", trustTier: 2, summary: "", path: path.relative(tmpRoot, docBPath) },
      ]),
      "utf8",
    );
    await fs.writeFile(docAPath, "# Alpha\nKPI spread cash guidance and dashboard bands.\n", "utf8");
    await fs.writeFile(docBPath, "# Beta\nRisk gates and FHA guidance for dashboard.\n", "utf8");
    process.env.HPS_KB_ROOT = tmpRoot;
    process.env.HPS_KB_REGISTRY_PATH = registryPath;
  });

  afterAll(async () => {
    delete process.env.HPS_KB_ROOT;
    delete process.env.HPS_KB_REGISTRY_PATH;
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  it("ranks chunks containing query terms", async () => {
    const results = await kbSearch({ query: "spread cash dashboard", category: "dashboard", trustTierMax: 2, limit: 5 });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].docId).toBe("docA");
  });
});
