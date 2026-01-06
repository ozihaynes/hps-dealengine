import { promises as fs } from "fs";
import path from "path";
import type { AiDocMeta } from "./docRegistry";
import { loadDocRegistry } from "./docRegistry";

export type DocChunk = {
  docId: string;
  trustTier: 0 | 1 | 2 | 3;
  heading: string;
  content: string;
  path: string;
};

const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;
const HEADING_RE = /^#{2,3}\s+(.*)$/gm;

function stripFrontmatter(content: string): string {
  return content.replace(FRONTMATTER_RE, "");
}

function splitIntoChunks(
  docId: string,
  trustTier: DocChunk["trustTier"],
  filePath: string,
  body: string,
): DocChunk[] {
  const chunks: DocChunk[] = [];
  const headings: Array<{ title: string; start: number; text: string }> = [];

  let match: RegExpExecArray | null;
  while ((match = HEADING_RE.exec(body)) !== null) {
    headings.push({ title: match[1].trim(), start: match.index, text: match[0] });
  }

  if (headings.length === 0) {
    chunks.push({
      docId,
      trustTier,
      heading: "Introduction",
      content: body.trim(),
      path: filePath,
    });
    return chunks;
  }

  for (let i = 0; i < headings.length; i++) {
    const current = headings[i];
    const next = headings[i + 1];
    const startIndex = current.start + current.text.length;
    const sectionBody = body.slice(startIndex, next ? next.start : undefined).trim();
    chunks.push({
      docId,
      trustTier,
      heading: current.title,
      content: sectionBody,
      path: filePath,
    });
  }

  return chunks;
}

async function loadDocChunks(meta: AiDocMeta): Promise<DocChunk[]> {
  const absPath = path.resolve(process.cwd(), meta.path);
  const raw = await fs.readFile(absPath, "utf8");
  const body = stripFrontmatter(raw);
  return splitIntoChunks(meta.docId, meta.trustTier, meta.path, body);
}

export async function loadDocChunksForCategories(
  categories: Array<AiDocMeta["category"]>,
): Promise<DocChunk[]> {
  const registry = await loadDocRegistry();
  const docs = registry.filter((doc) => categories.includes(doc.category));
  const results: DocChunk[] = [];

  for (const doc of docs) {
    try {
      const chunks = await loadDocChunks(doc);
      results.push(...chunks);
    } catch (err) {
      console.warn("[docLoader] failed to load doc", { docId: doc.docId, path: doc.path, err });
    }
  }

  return results;
}
