# Valuation Eval Harness (Slice 0)

Internal guide for collecting ground truth, running the accuracy harness, and interpreting hashes for determinism and audit.

## Add Ground Truth (Admin Only)
- Route: `/admin/valuation-qa` (requires manager/vp/owner membership; anon Supabase client under caller JWT, RLS enforced).
- Fields: `deal_id` (uuid), `source` (e.g., `sale_price`, `appraisal`), `realized_price`, `realized_date` (optional), `notes` (optional).
- Upsert behavior: on conflict for `(org_id, subject_key=deal:<id>, source, realized_date)`; `realized_date` can be null (coalesced to sentinel in the unique constraint).
- Recent entries are shown with links back to `/underwrite?dealId=<id>` for review.

## Run the Eval Harness
- Script: `scripts/valuation/eval-harness.ps1`
- Prereqs: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` available in env or `.env.local`/`supabase/.env*`; caller JWT via `HPS_CALLER_JWT` or `SUPABASE_CALLER_JWT` (password grant prompt allowed).
- Replay mode (no recompute, uses latest valuation_run per deal):
  ```powershell
  pwsh scripts/valuation/eval-harness.ps1 -DatasetName orlando -DealIdsPath scripts/valuation/datasets/orlando-dealids.json -Posture base
  ```
- Recompute mode (forces v1-valuation-run with eval tags and optional refresh):
  ```powershell
  pwsh scripts/valuation/eval-harness.ps1 -DatasetName orlando -DealIdsPath scripts/valuation/datasets/orlando-dealids.json -Posture base -Recompute:$true -ForceRefresh:$false
  ```
- Outputs: per-case abs/pct errors, confidence grade, comp kind/count; aggregates MAE, MAPE, median, p90, by-confidence MAE. Inserts one `valuation_eval_runs` row with `params`, `metrics`, and deterministic `output_hash`. Full payload logged to `scripts/valuation/logs/`.

## Determinism & Hashes
- Stable canonicalization: object keys sorted recursively; hashes are SHA-256 hex of that canonical JSON.
- `policy_hash`: `stableHash(policy_row.policy_json)`.
- `snapshot_hash`: `stableHash` of a deterministic snapshot subset (address fingerprint, comps, market/raw payload, provider/source/as_of/window/sample, stub flag, resolved subject) excluding DB ids/timestamps.
- `output_hash`: `stableHash` of the valuation output payload (includes `policy_hash`, `snapshot_hash`, sorted `warning_codes`, optional `eval_tags`; excludes DB ids/timestamps).
- `run_hash`: `stableHash({ input_hash, output_hash, policy_hash })`. Replays with the same snapshot + policy produce identical hashes.

## RLS and Safety
- Script and UI use anon key + caller JWT only; no `service_role` anywhere in user/admin flows.
- RLS:
  - `valuation_ground_truth`: members can SELECT; only manager/vp/owner can INSERT/UPDATE; no DELETE.
  - `valuation_eval_runs`: members can SELECT/INSERT; append-only (no UPDATE/DELETE).
- Audit triggers (`audit_log_row_change`) and `tg_set_updated_at` are enabled on both tables for traceability.

## Verify Slice 2 (market_time_adjustment) without force_refresh
Run this SQL in Supabase SQL editor to confirm market time adjustment engaged on the latest run (replace `ORG_ID`/`DEAL_ID` as needed):
```sql
select
  id,
  output->'selection_summary'->'market_time_adjustment' as mta
from valuation_runs
where org_id = 'ORG_ID' and deal_id = 'DEAL_ID'
order by created_at desc
limit 1;
```

## Public Records (ATTOM) setup
- Provider: ATTOM only (public-records subject enrichment).
- Secret: `ATTOM_API_KEY` (no placeholders, read only in Edge).
  - Local dev: add to `supabase/functions/.env.local` (not committed).
  - Deploy: `supabase secrets set --env-file supabase/functions/.env.local`.
- Endpoint pattern used: `https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/detail?address=<encoded-address>`
- Required headers: `Accept: application/json`, `apikey: <ATTOM_API_KEY>`
- Enrichment is best-effort: valuation proceeds even if ATTOM is missing/fails. Subject sources will include `attom` when attempted.
