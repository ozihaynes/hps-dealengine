import { promises as fs } from "fs";
import path from "path";
import process from "process";

import {
  ALL_GLOSSARY_KEYS,
  GLOSSARY,
  type GlossaryKey,
} from "../apps/hps-dealengine/lib/glossary";

interface ShortlistItem {
  key: string;
  term?: string;
  context?: string;
  reason?: string;
  [key: string]: unknown;
}

async function main() {
  const shortlistPath = path.join(
    process.cwd(),
    "docs",
    "glossary",
    "glossary_v1_shortlist.json",
  );

  const raw = await fs.readFile(shortlistPath, "utf8");
  const parsed = JSON.parse(raw) as ShortlistItem[];

  const allKeysSet = new Set<GlossaryKey>(ALL_GLOSSARY_KEYS);
  const missingInGlossary: string[] = [];
  const invalidKeys: string[] = [];

  for (const item of parsed) {
    const key = item.key;

    if (!key) {
      invalidKeys.push("(missing key field)");
      continue;
    }

    if (!allKeysSet.has(key as GlossaryKey)) {
      invalidKeys.push(key);
      continue;
    }

    if (!(key in GLOSSARY)) {
      missingInGlossary.push(key);
    }
  }

  if (invalidKeys.length > 0 || missingInGlossary.length > 0) {
    if (invalidKeys.length > 0) {
      console.error(
        "Glossary alignment check failed. These shortlist keys are not valid GlossaryKey values:",
      );
      console.error(invalidKeys.join(", "));
    }

    if (missingInGlossary.length > 0) {
      console.error(
        "Glossary alignment check failed. These shortlist keys are not present in GLOSSARY:",
      );
      console.error(missingInGlossary.join(", "));
    }

    process.exit(1);
  }

  console.log(
    `Glossary alignment OK. ${parsed.length} shortlist entries map to existing GlossaryKey values.`,
  );
}

main().catch((err) => {
  console.error("Error running check-glossary-alignment:", err);
  process.exit(1);
});

