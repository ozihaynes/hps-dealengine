# v1 Gap Scan (field-ready readiness)

- 🟢 Engine & runs determinism: `v1-analyze` + `v1-runs-save` path exists with hash-based dedupe; runs table, policy snapshots, and replay plumbing are present.
- 🟡 Auth & deal entry: `(app)` shell and DealSession are wired, but `/deals` still needs to be the canonical entry plus guaranteed `deal_id` on every run path and redirect hardening.
- 🟡 Evidence flows: `v1-evidence-start/url` and EvidenceUpload exist; needs deployment verification, more error surfacing, and tighter UI wiring for trace/info-needed coverage.
- 🟡 Repairs stack: Live `repair_rate_sets` and `v1-repair-rates` feed the UI; caching/TTL via `useRepairRates` and meta display (market/version/as_of) remain open.
- 🟡 Policy overrides governance: Table + request/approve edge functions are in place; UI lock states, modal flows, and trace visibility for approved overrides still need implementation.
- 🟡 User settings: Table/contracts/client helper and new `v1-user-settings` edge function are implemented; `/settings/user` should persist/apply defaults across tabs and be validated with RLS.
- 🔴 Sandbox settings: No org/posture sandbox settings table or edge function yet; `/sandbox` still lacks persisted scenario ranges/toggles.
- 🔴 AI strategist: `v1-ai-bridge` code exists but UI/UX, guardrails, and deployment verification are outstanding.
- 🟡 UI & pixel parity: Shared shell/navigation is live and Playwright specs exist, but snapshots likely need refresh and some routes (runs/trace/settings) require final polish.
- 🟡 Logging/audit coverage: Core tables use `audit_logs` triggers; new/auxiliary flows (evidence, overrides, settings) should be rechecked for consistent audit + org/user attribution.
- 🟡 Testing/CI: Typecheck/build/test commands are standard; a consolidated `scripts/local-ci.ps1` and broader automated coverage (including Playwright) are still pending.
