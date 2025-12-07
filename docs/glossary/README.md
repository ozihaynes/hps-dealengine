# Glossary Inventory & In‑App Usage

This folder, together with `apps/hps-dealengine/lib/glossary.ts`, defines the glossary used across the HPS DealEngine app.

The goal is to keep **all in‑app definitions centralized and deterministic**:

- No ad‑hoc tooltip strings scattered through components.
- Every tooltip/help definition lives behind a stable `GlossaryKey`.
- JSON inventories here are planning aids; the **TypeScript module is the source of truth**.

---

## Files in this folder

- `glossary_candidates.json`  
  Raw candidate terms discovered from UI labels, sandbox knobs, and underwriting manuals. This is a broad inventory, including medium/low‑priority items.

- `glossary_v1_shortlist.json`  
  Filtered **v1 set** of terms we intend to expose via in‑app tooltips. Each entry includes:
  - `key` – stable snake_case glossary key.
  - `term` – human‑readable label.
  - `category` – valuation, profit/spread, timeline/carry, risk/evidence, repairs, sandbox, etc.
  - `priority` – high/medium/low.
  - `reason` – why this term gets a tooltip in v1.

> These JSON files are **planning artifacts**, not runtime dependencies. They are kept in sync with the TypeScript glossary via a small alignment script (see below).

---

## Single Source of Truth: `apps/hps-dealengine/lib/glossary.ts`

All runtime glossary definitions live in:

- `apps/hps-dealengine/lib/glossary.ts`

This module defines:

- `ALL_GLOSSARY_KEYS` – an array of every allowed glossary key.
- `export type GlossaryKey` – a union of those keys (used by UI components).
- `export interface GlossaryEntry` – shape for each entry:
  - `term` – label as shown in the UI.
  - `shortLabel?` – optional shorter label, when needed.
  - `description` – 1–2 sentence tooltip copy (“what it is + why it matters”).
  - `contextTags` – tags like `["valuation", "risk", "sandbox"]`.
- `export const GLOSSARY: Record<GlossaryKey, GlossaryEntry>` – the actual definitions.
- `export function getGlossaryEntry(key: GlossaryKey): GlossaryEntry` – deterministic accessor used by the tooltip component.

**Rules:**

- **No inline tooltip copy** in components. If you need a definition, add a `GlossaryKey` + `GLOSSARY` entry and use `helpKey`.
- Keys are **stable snake_case** (e.g., `respect_floor`, `buyer_ceiling`, `fha_90_day_rule`).
- Entries must be short, plain‑language, and consistent with the SoTruth underwriting manuals.

---

## Tests & Alignment Checks

The glossary has guardrails:

- `apps/hps-dealengine/lib/glossary.test.ts`
  - Asserts that every `GlossaryKey` has a matching `GLOSSARY` entry.
  - Enforces that `description` is non‑empty and tooltip‑length (min length / max length).
  - Optionally checks that a few core `helpKey` usages resolve correctly.

- `scripts/check-glossary-alignment.ts`
  - Loads `docs/glossary/glossary_v1_shortlist.json`.
  - Imports `{ GLOSSARY }` from `apps/hps-dealengine/lib/glossary.ts`.
  - Fails (non‑zero exit) if:
    - Any shortlist `key` is missing from `GLOSSARY`.
    - Any shortlist `key` is not a valid `GlossaryKey`.

- `package.json` script:
  - `"check:glossary": "tsx scripts/check-glossary-alignment.ts"`

Run all checks with:

```powershell
pnpm -w test
pnpm run check:glossary
```

---

## Adding or Updating Glossary Entries

When you need a new tooltip or want to adjust copy:

### 1) Add or update the key in TypeScript

- Edit `apps/hps-dealengine/lib/glossary.ts`.
- Add the key to `ALL_GLOSSARY_KEYS`.
- Add a corresponding entry in `GLOSSARY`.
- Keep `description` to 1–2 sentences, focused on:
  - What the thing is.
  - Why it matters for an acquisitions analyst / wholesaler.

### 2) (Optional) Update the shortlist JSON

- If the term is part of the v1 (or future) tooltip set, update `docs/glossary/glossary_v1_shortlist.json` with the new key and metadata.
- Run:

```powershell
pnpm run check:glossary
```

to ensure the JSON and TS stay aligned.

### 3) Use the key in the UI

- Pass `helpKey?: GlossaryKey` into shared components (e.g., StatCard, InputField, SelectField, headers).
- Let `InfoTooltip` pull the definition via `getGlossaryEntry(helpKey)`.

### 4) Run tests

```powershell
pnpm -w test
pnpm run check:glossary
```

If you are not sure whether a term deserves a tooltip, prefer to:

- Add it to `glossary_candidates.json` and/or `glossary_v1_shortlist.json` with a clear reason.
- Review with the product owner before wiring it into the UI.

