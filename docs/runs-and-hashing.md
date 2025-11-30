# Runs & Hashing Contract (v1.1)

## 1. Purpose
The `public.runs` table is the audit trail for underwriting runs (who, posture, policy, inputs, outputs, trace, when). Contract goal: determinism + idempotency (same inputs + same policy snapshot ⇒ same hashes ⇒ same run identity).

## 2. Table schema (public.runs)
- id uuid PK default gen_random_uuid() NOT NULL
- org_id uuid NOT NULL
- created_by uuid NOT NULL
- posture text NOT NULL ("conservative" | "base" | "aggressive")
- policy_version_id uuid NULL
- input jsonb NOT NULL
- output jsonb NOT NULL
- trace jsonb NOT NULL
- input_hash text NOT NULL
- output_hash text NOT NULL
- policy_hash text NULL
- created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())

Unique index (run identity):
CREATE UNIQUE INDEX runs_uni_org_posture_iohash_polhash
  ON public.runs (org_id, posture, input_hash, policy_hash);

## 3. Envelopes (what we hash)
PolicyPosture: "conservative" | "base" | "aggressive"

RunInputEnvelope:
{
  posture,                    // PolicyPosture
  deal,                       // DealSnapshot | null
  analyze_input,              // AnalyzeInput
  options                     // { scenario_label?, ui_version?, engine_version? }
}

PolicySnapshot:
{ posture, policy_json }      // policy_json is the exact policy used

RunOutputEnvelope:
{
  outputs,                    // AnalyzeResult.outputs
  infoNeeded,                 // SORTED lexicographically before hashing
  engine_version?, ui_version?
}

## 4. Canonical JSON & hashing
- Sort all object keys recursively (arrays keep order).
- JSON.stringify the sorted structure.
- SHA-256 over UTF-8; output lower-case hex.
- Always sort `infoNeeded` before hashing.

## 5. Building a run (sequence)
1) inputEnvelope ← { posture, deal, analyze_input, options }
2) outputEnvelope ← { outputs, sorted(infoNeeded), engine_version?, ui_version? }
3) policySnapshot ← { posture, policy_json }
4) input_hash  ← SHA256(canonical(inputEnvelope))
   output_hash ← SHA256(canonical(outputEnvelope))
   policy_hash ← SHA256(canonical(policySnapshot))
5) Insert row into public.runs with those hashes.
   Uniqueness guard: (org_id, posture, input_hash, policy_hash).

## 6. Idempotency
Same org + same posture + same input envelope + same policy snapshot ⇒ same identity.
Second insert with same identity hits unique index.

## 7. Code references
@hps-internal/contracts exports:
- runs.ts: envelopes + schemas + sort/canonical helpers
- runsSave.ts: hashJson + buildRunRowPayload
- runsPersist.ts: saveRunWithClient(client, args)
