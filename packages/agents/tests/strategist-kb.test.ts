import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  kbSearchStrategist,
  resolveKbRegistryPath,
  clearKbRegistryCache,
} from "../src/strategist/shared";

const originalEnv = { ...process.env };

beforeEach(() => {
  clearKbRegistryCache();
});

afterEach(() => {
  process.env = { ...originalEnv };
  clearKbRegistryCache();
});

async function writeTempRegistryWithDoc(opts: { queryText: string }) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-registry-"));
  const registryPath = path.join(tmpDir, "doc-registry.json");
  const docPath = path.join(tmpDir, "doc.md");
  await fs.writeFile(docPath, `# Heading\n${opts.queryText}\nMore text.`);
  await fs.writeFile(
    registryPath,
    JSON.stringify([
      {
        docId: "temp-doc",
        category: "test",
        trustTier: 1,
        summary: "temp",
        path: docPath,
      },
    ]),
  );
  return { registryPath, docPath };
}

describe("resolveKbRegistryPath", () => {
  it("prefers absolute env override", async () => {
    const { registryPath } = await writeTempRegistryWithDoc({ queryText: "hello world" });
    process.env.HPS_KB_REGISTRY_PATH = registryPath;
    const resolved = resolveKbRegistryPath();
    expect(resolved).toBe(registryPath);
    const chunks = await kbSearchStrategist({ query: "hello", limit: 5 });
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]?.docId).toBe("temp-doc");
  });

  it("finds repo docs/ai/doc-registry.json by walking upwards", () => {
    delete process.env.HPS_KB_REGISTRY_PATH;
    const resolved = resolveKbRegistryPath();
    const normalized = resolved.replace(/\\/g, "/");
    expect(normalized).toContain("/docs/ai/doc-registry.json");
});
});

describe("kbSearchStrategist", () => {
  it("returns empty when registry is missing (ENOENT tolerated)", async () => {
    const missing = path.join(os.tmpdir(), "kb-registry-missing", "doc-registry.json");
    process.env.HPS_KB_REGISTRY_PATH = missing;
    const chunks = await kbSearchStrategist({ query: "anything", limit: 5 });
    expect(chunks).toEqual([]);
  });
});
