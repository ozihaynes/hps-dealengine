# Settings Audit Report

**Date:** 2026-01-07
**Auditor:** Claude Code
**Scope:** User/Business & Team Settings

## Executive Summary

The HPS DealEngine settings system has a mixed implementation state. The **underwriting defaults** (posture, market, theme) are fully functional with proper RLS-protected database persistence via the `v1-user-settings` Edge Function. However, the **Profile**, **Business**, and **Team Access** sections are **UI-only placeholders** with local React state that does not persist to any backend.

Critical gaps include:
1. **No `profiles` table** — User profile data (name, avatar) has no storage
2. **No `invitations` table** — Team invite flow is completely stubbed
3. **No storage bucket for logos/avatars** — Business logo upload has no backend
4. **Resend integration exists but is not wired** to team invites

The theme system is sophisticated, with both localStorage caching and database persistence, making it the most complete settings feature.

## Key Findings

### What Works

| Section | Status | Evidence |
|---------|--------|----------|
| **Theme Preference** | 🟢 Complete | `ThemeProvider.tsx:191-203` saves to `v1-user-settings`, localStorage fallback |
| **Default Posture** | 🟢 Complete | `user/page.tsx:162-192` → `v1-user-settings` → `user_settings.default_posture` |
| **Default Market** | 🟢 Complete | Same flow as posture, persists to `user_settings.default_market` |
| **Policy Overrides** | 🟢 Complete | `policy-overrides/page.tsx` queries `policy_overrides` table with RLS |
| **Policy Versions** | 🟢 Complete | `policy-versions/page.tsx` queries `policy_versions_api` view |
| **Sign Out** | 🟢 Complete | `logout/page.tsx:13-28` calls `supabase.auth.signOut()` |
| **RLS Enforcement** | 🟢 Complete | All settings tables use membership-based RLS |

### Partial Implementations

| Section | Status | What's Missing |
|---------|--------|----------------|
| **Policy Editor** | 🟡 Partial | `settings/policy/page.tsx:92-95` shows placeholder "coming soon" |
| **Sandbox Settings** | 🟡 Redirect | `settings/sandbox/page.tsx` redirects to `/sandbox` page |

### Critical Gaps

| Section | Status | Evidence |
|---------|--------|----------|
| **Profile Settings** | 🔴 UI-Only | `user/page.tsx:84-88` uses local `useState`, no API call |
| **Business Settings** | 🔴 UI-Only | `user/page.tsx:90-93` local state, TODO comments at line 203-206 |
| **Team Access** | 🔴 UI-Only | `user/page.tsx:95-108` local state, no `invitations` table |
| **Business Logo Upload** | 🔴 UI-Only | `user/page.tsx:238-253` stores as data URL in React state only |
| **Team Invites** | 🔴 Stubbed | Button says "Send Invite (UI-only)" at line 528 |

## Risk Assessment

### Security Risks

| Risk | Severity | Description |
|------|----------|-------------|
| None Identified | - | RLS is properly configured on existing tables |

### Data Loss Risks

| Risk | Severity | Description |
|------|----------|-------------|
| Profile data loss | **High** | User name/email changes are lost on page refresh |
| Business name loss | **High** | Business name changes are not persisted |
| Logo upload loss | **High** | Uploaded logos exist only in memory |
| Team member additions | **High** | Fake invites disappear on page refresh |

### UX Issues

| Issue | Severity | Description |
|-------|----------|-------------|
| Misleading Save buttons | **High** | Profile/Business "Save" buttons show success but don't persist |
| Fake invite flow | **Medium** | Users may believe invites were sent when they weren't |
| TODO messages shown | **Low** | Development notes visible to users (lines 197-206, 226-228, 233-235, 248-249) |

## Recommended Priority Order

### P0 — Security/Data Integrity (Ship Blockers)

1. **Create `profiles` table** with RLS
2. **Create `invitations` table** with token-based access
3. **Create `logos` or `org-assets` storage bucket** with signed URL policies

### P1 — Core Functionality

4. **Wire Profile save** to Edge Function + `profiles` table
5. **Wire Business save** to `organizations` table (add name/logo columns)
6. **Implement real invite flow** using Resend integration
7. **Add team member management** (list, remove, role change)

### P2 — Polish

8. Remove TODO comments from user-facing code
9. Add proper loading/success/error states for all save actions
10. Implement role-based UI permissions for team management

## Architecture Summary

```
Frontend Flow:
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  ThemeSwitcher  │ ──► │  ThemeProvider   │ ──► │  localStorage   │
│  Component      │     │  (Context)       │     │  + DB persist   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │
                                ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  User Settings  │ ──► │  userSettings.ts │ ──► │  v1-user-       │
│  Page           │     │  (lib)           │     │  settings (EF)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                 ┌─────────────────┐
                                                 │  user_settings  │
                                                 │  (Supabase)     │
                                                 └─────────────────┘

Broken Flows (UI-Only):
┌─────────────────┐     ┌──────────────────┐
│  Profile Card   │ ──► │  useState only   │ ──► ❌ No persistence
└─────────────────┘     └──────────────────┘

┌─────────────────┐     ┌──────────────────┐
│  Business Card  │ ──► │  useState only   │ ──► ❌ No persistence
└─────────────────┘     └──────────────────┘

┌─────────────────┐     ┌──────────────────┐
│  Team Card      │ ──► │  useState only   │ ──► ❌ No persistence
└─────────────────┘     └──────────────────┘
```

## Files Requiring Changes (Phase 1 Estimates)

| File | Changes Needed |
|------|----------------|
| `supabase/migrations/new_profiles.sql` | Create `profiles` table + RLS |
| `supabase/migrations/new_invitations.sql` | Create `invitations` table + RLS |
| `supabase/functions/v1-profile-*` | New Edge Functions for profile CRUD |
| `supabase/functions/v1-invite-*` | New Edge Functions for invite send/accept |
| `apps/.../lib/profileSettings.ts` | New client-side API wrapper |
| `apps/.../lib/teamInvites.ts` | New client-side invite API wrapper |
| `apps/.../app/(app)/settings/user/page.tsx` | Wire real APIs, remove TODOs |
| `packages/contracts/src/profile.ts` | Add profile/invite type definitions |

## Questions for OZi

1. **Profile source of truth**: Should profile data (name, email) come from `auth.users` metadata or a separate `profiles` table?
2. **Organization columns**: Should we add `logo_url` and other brand fields to the existing `organizations` table or create a separate `org_settings` table?
3. **Invite expiry**: What should the default expiry time be for team invites? (24h, 7d, 30d?)
4. **Role permissions**: Which roles should be able to invite new members? (Currently UI shows Manager+ can approve overrides)
5. **Email domain**: Should we set up a custom domain for Resend, or continue using `onboarding@resend.dev`?
