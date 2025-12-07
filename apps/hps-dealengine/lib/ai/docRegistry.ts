"use server";

import fs from "fs/promises";
import path from "path";

export type AiDocMeta = {
  docId: string;
  category:
    | "product"
    | "domain"
    | "engine"
    | "app"
    | "dashboard"
    | "glossary"
    | "examples"
    | "playbooks"
    | "ai"
    | "ops";
  trustTier: 0 | 1 | 2 | 3;
  summary: string;
  path: string;
};

let cachedDocs: AiDocMeta[] | null = null;

async function readRegistry(): Promise<AiDocMeta[]> {
  const root = process.cwd();
  const registryPath = path.join(root, "docs", "ai", "doc-registry.json");
  const raw = await fs.readFile(registryPath, "utf8");
  const parsed = JSON.parse(raw) as AiDocMeta[];
  return parsed.map((doc) => ({
    docId: doc.docId,
    category: doc.category,
    trustTier: doc.trustTier,
    summary: doc.summary,
    path: doc.path,
  }));
}

export async function loadDocRegistry(): Promise<AiDocMeta[]> {
  if (cachedDocs) return cachedDocs;
  cachedDocs = await readRegistry();
  return cachedDocs;
}

export async function findDocById(docId: string): Promise<AiDocMeta | undefined> {
  const registry = await loadDocRegistry();
  return registry.find((d) => d.docId === docId);
}
