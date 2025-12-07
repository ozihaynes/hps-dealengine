import { promises as fs } from "fs";
import path from "path";
import { parse } from "yaml";

const allowedCategories = new Set([
  "product",
  "domain",
  "engine",
  "app",
  "dashboard",
  "glossary",
  "examples",
  "playbooks",
  "ai",
  "ops",
]);

type Frontmatter = {
  doc_id?: string;
  category?: string;
  trust_tier?: number;
};

const warnings: string[] = [];
const docIdToFile = new Map<string, string>();

const warn = (file: string, message: string) => {
  warnings.push(`${file}: ${message}`);
};

const extractFrontmatter = (content: string) => {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : null;
};

const walkMarkdown = async (dir: string): Promise<string[]> => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkMarkdown(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
};

const main = async () => {
  const docsDir = path.join(process.cwd(), "docs");
  const files = await walkMarkdown(docsDir);

  for (const file of files) {
    const content = await fs.readFile(file, "utf8");
    const fmBlock = extractFrontmatter(content);
    if (!fmBlock) {
      warn(file, "missing or malformed frontmatter");
      continue;
    }

    let data: Frontmatter;
    try {
      data = parse(fmBlock) as Frontmatter;
    } catch (err) {
      warn(file, `could not parse frontmatter: ${(err as Error).message}`);
      continue;
    }

    if (!data.doc_id) {
      warn(file, "doc_id missing");
    } else if (docIdToFile.has(data.doc_id)) {
      warn(file, `doc_id "${data.doc_id}" duplicates ${docIdToFile.get(data.doc_id)}`);
    } else {
      docIdToFile.set(data.doc_id, file);
    }

    if (!data.category) {
      warn(file, "category missing");
    } else if (!allowedCategories.has(data.category)) {
      warn(file, `category "${data.category}" not in allowed set`);
    }

    if (data.trust_tier === undefined || data.trust_tier === null) {
      warn(file, "trust_tier missing");
    } else if (
      typeof data.trust_tier !== "number" ||
      Number.isNaN(data.trust_tier) ||
      data.trust_tier < 0 ||
      data.trust_tier > 3
    ) {
      warn(file, "trust_tier must be a number between 0 and 3");
    }
  }

  if (warnings.length === 0) {
    console.log("check-doc-frontmatter: no warnings");
    return;
  }

  console.log("check-doc-frontmatter warnings:");
  for (const w of warnings) {
    console.log(`- ${w}`);
  }
};

main().catch((err) => {
  console.error("check-doc-frontmatter encountered an unexpected error:", err);
});
