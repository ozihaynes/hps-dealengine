import docRegistry from "../../../docs/ai/doc-registry.json" assert { type: "json" };

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

export type DocChunk = {
  docId: string;
  trustTier: 0 | 1 | 2 | 3;
  heading: string;
  content: string;
  path: string;
};

const ALL_AI_DOCS: AiDocMeta[] = (docRegistry as AiDocMeta[]).map((doc) => ({
  docId: doc.docId,
  category: doc.category,
  trustTier: doc.trustTier,
  summary: doc.summary,
  path: doc.path,
}));

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
  const root = new URL("../../..", import.meta.url);
  const docUrl = new URL(meta.path, root);
  const raw = await Deno.readTextFile(docUrl);
  const body = stripFrontmatter(raw);
  return splitIntoChunks(meta.docId, meta.trustTier, meta.path, body);
}

export async function loadDocChunksForCategories(
  categories: Array<AiDocMeta["category"]>,
): Promise<DocChunk[]> {
  const docs = ALL_AI_DOCS.filter((doc) => categories.includes(doc.category));
  const chunks: DocChunk[] = [];

  for (const doc of docs) {
    try {
      const parts = await loadDocChunks(doc);
      chunks.push(...parts);
    } catch (err) {
      console.warn("[ai-docLoader] failed to load doc", { docId: doc.docId, path: doc.path, err });
    }
  }

  return chunks;
}
