# File Inventory

## Frontend Files

### Settings Pages

| File Path | Purpose | Status |
|-----------|---------|--------|
| `apps/hps-dealengine/app/(app)/settings/page.tsx` | Main settings hub with navigation cards | 🟢 Complete |
| `apps/hps-dealengine/app/(app)/settings/loading.tsx` | Loading skeleton for settings pages | 🟢 Complete |
| `apps/hps-dealengine/app/(app)/settings/user/page.tsx` | User, Business & Team settings (mixed real/stub) | 🟡 Partial |
| `apps/hps-dealengine/app/(app)/settings/sandbox/page.tsx` | Redirects to `/sandbox` | 🟢 Complete (redirect) |
| `apps/hps-dealengine/app/(app)/settings/overrides/page.tsx` | Policy overrides management | 🟢 Complete |
| `apps/hps-dealengine/app/(app)/settings/policy-overrides/page.tsx` | Policy overrides queue | 🟢 Complete |
| `apps/hps-dealengine/app/settings/policy/page.tsx` | Policy editor placeholder | 🟡 Partial |
| `apps/hps-dealengine/app/settings/policy-versions/page.tsx` | Policy version history | 🟢 Complete |
| `apps/hps-dealengine/app/logout/page.tsx` | Logout handler | 🟢 Complete |

### Settings Components

| File Path | Purpose | Status |
|-----------|---------|--------|
| `apps/hps-dealengine/components/settings/ThemeSwitcher.tsx` | Theme color picker with gradient buttons | 🟢 Complete |
| `apps/hps-dealengine/components/theme/ThemeProvider.tsx` | Theme context with localStorage + DB sync | 🟢 Complete |

### Shared UI Components

| File Path | Purpose | Status |
|-----------|---------|--------|
| `apps/hps-dealengine/components/ui.tsx` | GlassCard, Button, Icon, SelectField etc. | 🟢 Complete |
| `apps/hps-dealengine/components/AppTopNav.tsx` | Top nav with settings icon link | 🟢 Complete |

### Client Libraries

| File Path | Purpose | Status |
|-----------|---------|--------|
| `apps/hps-dealengine/lib/userSettings.ts` | Fetch/upsert user settings via Edge Function | 🟢 Complete |
| `apps/hps-dealengine/lib/themeTokens.ts` | Theme metadata and default definitions | 🟢 Complete |
| `apps/hps-dealengine/lib/supabaseClient.ts` | Supabase client singleton | 🟢 Complete |
| `apps/hps-dealengine/lib/policyOverrides.ts` | Policy override approval API | 🟢 Complete |
| `apps/hps-dealengine/lib/dealSessionContext.tsx` | Deal session context with membership role | 🟢 Complete |

## Backend Files

### Supabase Edge Functions

| File Path | Purpose | Status |
|-----------|---------|--------|
| `supabase/functions/v1-user-settings/index.ts` | GET/PUT user settings with RLS | 🟢 Complete |
| `supabase/functions/v1-sandbox-settings/index.ts` | Sandbox settings CRUD | 🟢 Complete |
| `supabase/functions/v1-policy-override-approve/index.ts` | Approve/reject policy overrides | 🟢 Complete |
| `supabase/functions/v1-policy-override-request/index.ts` | Request policy overrides | 🟢 Complete |
| `supabase/functions/v1-policy-get/index.ts` | Get policy configuration | 🟢 Complete |
| `supabase/functions/v1-policy-put/index.ts` | Update policy configuration | 🟢 Complete |

### Shared Edge Function Utilities

| File Path | Purpose | Status |
|-----------|---------|--------|
| `supabase/functions/_shared/cors.ts` | CORS and JSON response helpers | 🟢 Complete |
| `supabase/functions/_shared/email.ts` | Resend email integration | 🟢 Complete |

### Database Migrations

| File Path | Purpose | Status |
|-----------|---------|--------|
| `supabase/migrations/20251108001201_remote_schema.sql` | Core schema: orgs, memberships, audit_logs, RLS | 🟢 Applied |
| `supabase/migrations/20251128093000_user_settings.sql` | user_settings table + RLS policies | 🟢 Applied |
| `supabase/migrations/20251128143000_user_settings_ensure.sql` | Ensure user_settings exists | 🟢 Applied |
| `supabase/migrations/20251228143000_update_user_settings_theme_palette.sql` | Extended theme check constraint | 🟢 Applied |
| `supabase/migrations/20251127215900_membership_role_owner.sql` | Add 'owner' to membership_role enum | 🟢 Applied |
| `supabase/migrations/20251128171500_sandbox_settings.sql` | Sandbox settings table | 🟢 Applied |
| `supabase/migrations/20251126233123_create_policy_overrides.sql` | Policy overrides table | 🟢 Applied |
| `supabase/migrations/20251127220000_policy_overrides_manager_update_rls.sql` | Policy overrides RLS for managers | 🟢 Applied |

## Contract/Type Files

| File Path | Purpose | Status |
|-----------|---------|--------|
| `packages/contracts/src/userSettings.ts` | UserSettings schema + types (zod) | 🟢 Complete |
| `packages/contracts/src/settings.ts` | General settings exports | 🟢 Complete |
| `packages/contracts/src/sandboxSettings.ts` | Sandbox settings types | 🟢 Complete |
| `apps/hps-dealengine/lib/sandboxSettings.ts` | App-side sandbox settings | 🟢 Complete |
| `apps/hps-dealengine/constants/sandboxSettings.ts` | Sandbox settings constants | 🟢 Complete |

## Config Files

| File Path | Purpose | Status |
|-----------|---------|--------|
| `supabase/.env.example` | Edge Function env vars (RESEND_API_KEY, etc.) | 🟢 Complete |
| `supabase/functions/v1-user-settings/config.toml` | v1-user-settings function config | 🟢 Complete |
| `supabase/functions/v1-sandbox-settings/config.toml` | v1-sandbox-settings function config | 🟢 Complete |

## Missing Files (Need to be Created)

| Expected Path | Purpose | Priority |
|---------------|---------|----------|
| `supabase/migrations/NNNN_profiles.sql` | Create profiles table + RLS | P0 |
| `supabase/migrations/NNNN_invitations.sql` | Create invitations table + RLS | P0 |
| `supabase/migrations/NNNN_org_settings.sql` | Add logo_url to organizations | P1 |
| `supabase/functions/v1-profile-get/index.ts` | Get user profile | P1 |
| `supabase/functions/v1-profile-put/index.ts` | Update user profile | P1 |
| `supabase/functions/v1-invite-send/index.ts` | Send team invite via Resend | P1 |
| `supabase/functions/v1-invite-accept/index.ts` | Accept invite, create membership | P1 |
| `supabase/functions/v1-team-list/index.ts` | List team members for org | P1 |
| `supabase/functions/v1-team-remove/index.ts` | Remove team member | P1 |
| `apps/hps-dealengine/lib/profileSettings.ts` | Profile API client wrapper | P1 |
| `apps/hps-dealengine/lib/teamInvites.ts` | Invite API client wrapper | P1 |
| `packages/contracts/src/profile.ts` | Profile types + zod schemas | P1 |
| `packages/contracts/src/invite.ts` | Invite types + zod schemas | P1 |
