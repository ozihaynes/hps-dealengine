import { promises as fs } from "fs";
import path from "path";
import { parse } from "yaml";

type Frontmatter = {
  doc_id?: string;
  category?:
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
  trust_tier?: number;
  summary?: string;
};

type DocMeta = {
  docId: string;
  category: NonNullable<Frontmatter["category"]>;
  trustTier: 0 | 1 | 2 | 3;
  summary: string;
  path: string;
};

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

async function walkDocs(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkDocs(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files;
}

function parseFrontmatter(content: string): Frontmatter | null {
  const match = content.match(FRONTMATTER_RE);
  if (!match) return null;
  try {
    return parse(match[1]) as Frontmatter;
  } catch (err) {
    console.warn("[doc-registry] failed to parse frontmatter", err);
    return null;
  }
}

async function main() {
  const docsRoot = path.join(process.cwd(), "docs");
  const files = await walkDocs(docsRoot);
  const metas: DocMeta[] = [];

  for (const file of files) {
    const raw = await fs.readFile(file, "utf8");
    const fm = parseFrontmatter(raw);
    if (!fm?.doc_id || !fm?.category || typeof fm.trust_tier !== "number" || !fm.summary) {
      continue;
    }
    metas.push({
      docId: fm.doc_id,
      category: fm.category,
      trustTier: fm.trust_tier as 0 | 1 | 2 | 3,
      summary: fm.summary,
      path: path.relative(process.cwd(), file).replace(/\\/g, "/"),
    });
  }

  metas.sort((a, b) => a.docId.localeCompare(b.docId));
  const outPath = path.join(process.cwd(), "docs", "ai", "doc-registry.json");
  await fs.writeFile(outPath, JSON.stringify(metas, null, 2) + "\n", "utf8");
  console.log(`[doc-registry] wrote ${metas.length} docs to ${outPath}`);
}

main().catch((err) => {
  console.error("[doc-registry] failed", err);
  process.exitCode = 1;
});
