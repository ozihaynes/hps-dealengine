#!/usr/bin/env node
/**
 * Script to remove DROP_BACKLOG entries from sandboxKnobAudit.ts
 * Phase 7 Slice A - Schema Cleanup
 */

const fs = require('fs');
const path = require('path');

const auditFile = path.join(__dirname, '../apps/hps-dealengine/lib/sandboxKnobAudit.ts');

console.log(`Reading ${auditFile}...`);
const content = fs.readFileSync(auditFile, 'utf8');
const lines = content.split('\n');

// Find SANDBOX_KNOB_METADATA object
let inMetadata = false;
let metadataStartLine = -1;
let metadataEndLine = -1;
let braceDepth = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.includes('export const SANDBOX_KNOB_METADATA')) {
    inMetadata = true;
    metadataStartLine = i;
  }

  if (inMetadata) {
    for (const char of line) {
      if (char === '{') braceDepth++;
      if (char === '}') braceDepth--;
    }

    // End when we close the main object
    if (braceDepth === 0 && i !== metadataStartLine && line.includes('}')) {
      metadataEndLine = i;
      break;
    }
  }
}

console.log(`Metadata object from line ${metadataStartLine + 1} to ${metadataEndLine + 1}`);

// Extract before, metadata, and after sections
const beforeMetadata = lines.slice(0, metadataStartLine);
const metadataLines = lines.slice(metadataStartLine, metadataEndLine + 1);
const afterMetadata = lines.slice(metadataEndLine + 1);

// Parse entries in metadata object
// Each entry is: key: { ... },
let entries = [];
let currentEntry = [];
let entryDepth = 0;
let inEntry = false;

for (let i = 1; i < metadataLines.length - 1; i++) { // Skip first and last lines (object braces)
  const line = metadataLines[i];

  // Track brace depth
  for (const char of line) {
    if (char === '{') {
      if (!inEntry) inEntry = true;
      entryDepth++;
    }
    if (char === '}') entryDepth--;
  }

  if (inEntry) {
    currentEntry.push(line);
  }

  // Entry ends when depth returns to 0
  if (inEntry && entryDepth === 0) {
    entries.push(currentEntry.join('\n'));
    currentEntry = [];
    inEntry = false;
  }
}

console.log(`Found ${entries.length} entries in metadata object`);

// Filter to keep only KEEP entries
const keepEntries = entries.filter(entry => {
  const isKeep = entry.includes('recommendedAction: "KEEP"');
  if (!isKeep) {
    const keyMatch = entry.match(/key: "([^"]+)"/);
    if (keyMatch) {
      console.log(`  Removing DROP_BACKLOG: ${keyMatch[1]}`);
    }
  }
  return isKeep;
});

console.log(`\nKept ${keepEntries.length} KEEP entries (removed ${entries.length - keepEntries.length} DROP_BACKLOG entries)`);

// Reconstruct metadata object with proper formatting
const cleanedEntries = keepEntries.map((entry, i) => {
  const trimmed = entry.trimEnd();
  // Ensure trailing comma except for last entry
  if (i < keepEntries.length - 1) {
    if (!trimmed.endsWith(',')) {
      return trimmed + ',';
    }
  } else {
    // Last entry - ensure no trailing comma before closing brace
    if (trimmed.endsWith('},')) {
      return trimmed.slice(0, -1); // Remove comma
    }
  }
  return entry;
});

// Build new metadata section
const newMetadataLines = [
  metadataLines[0], // export const SANDBOX_KNOB_METADATA: Record<...> = {
  ...cleanedEntries,
  '};', // closing brace
];

// Rebuild file
const newContent = [
  ...beforeMetadata,
  ...newMetadataLines,
  ...afterMetadata,
].join('\n');

// Write back
fs.writeFileSync(auditFile, newContent);
console.log(`\nWrote updated file to ${auditFile}`);

// Verify
const verification = fs.readFileSync(auditFile, 'utf8');
const keepCount = (verification.match(/recommendedAction: "KEEP"/g) || []).length;
const dropCount = (verification.match(/recommendedAction: "DROP_BACKLOG"/g) || []).length;
console.log(`Verification: ${keepCount} KEEP entries, ${dropCount} DROP_BACKLOG entries`);
