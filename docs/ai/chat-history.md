# AI Chat History (v1)

- **Storage:** `ai_chat_threads` + `ai_chat_messages` tables (Supabase/Postgres). Each thread carries `user_id`, `org_id`, `persona`, optional `deal_id`/`run_id`/`posture`, and a rolling `expires_at` (default now + 30 days). Messages copy `org_id`/`user_id`/`persona` from the parent thread via trigger.
- **RLS:** Caller must match `user_id` and have membership on `org_id` (mirrors other org-scoped tables). No `service_role` usage in UI.
- **Retention:** Daily `pg_cron` job `ai_chat_expiration_daily` deletes rows where `expires_at < now()`. `expires_at` is extended on every message insert.
- **UI hydration:** On load, clients pull threads for the active org and hydrate the Analyst/Strategist windows + Negotiator chat. New sessions/messages upsert immediately so history survives reloads/devices.
- **Layout:** Tone + History live together in a fixed header card; the chat stream sits in its own scroll area with auto-scroll to the latest message on send/receive (desktop/tablet/mobile).
