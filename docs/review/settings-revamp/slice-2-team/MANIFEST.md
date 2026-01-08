# SLICE 2: Team Access & Invitations - Implementation Manifest

**Date:** 2026-01-07
**Status:** Complete
**Tests:** 43 passing (18 team + 25 invite)

---

## Gaps Addressed

| Gap ID | Description |
|--------|-------------|
| G-002 | Team member list shows fake/stub data |
| G-009 | Missing invite send functionality |
| G-010 | Missing invite accept flow |
| G-011 | Missing invite revoke functionality |
| G-013 | Missing team member removal |
| G-014 | No RLS policies for team data |

---

## Edge Cases Handled

| Code | Description | HTTP | Implementation |
|------|-------------|------|----------------|
| EC-2.2 | Duplicate invite | 409 | v1-invite-send checks existing pending |
| EC-2.3 | Expired token | 410 | v1-invite-accept checks expiry |
| EC-2.4 | Email mismatch | 403 | v1-invite-accept validates email |
| EC-2.5 | Already used | 400 | v1-invite-accept checks accepted_at |
| EC-2.6 | Already accepted | 400 | v1-invite-revoke checks status |
| EC-2.7 | Remove self | 400 | v1-team-remove prevents |
| EC-2.8 | Remove VP | 403 | v1-team-remove prevents |
| EC-2.9 | Non-manager | 403 | RLS + API checks |
| EC-2.10 | Email fails | 200 | Returns email_sent=false |
| EC-2.12 | Login redirect | - | Preserves token in URL |

---

## Files in This Review Folder

### Database Migration
```
code/migrations/
└── 20260107210000_invitations_table.sql
```

### Edge Functions (6 functions)
```
code/edge-functions/
├── _shared/
│   ├── email.ts              # Resend email utility
│   └── invite-email.ts       # Invite email template
├── v1-invite-send/
│   ├── index.ts
│   └── config.toml
├── v1-invite-accept/
│   ├── index.ts
│   └── config.toml
├── v1-invite-list/
│   ├── index.ts
│   └── config.toml
├── v1-invite-revoke/
│   ├── index.ts
│   └── config.toml
├── v1-team-list/
│   ├── index.ts
│   └── config.toml
└── v1-team-remove/
    ├── index.ts
    └── config.toml
```

### Contracts
```
code/contracts/
├── invite.ts            # Invite schemas & types
├── invite.test.ts       # 25 tests
├── team.ts              # Team schemas & types
└── team.test.ts         # 18 tests
```

### Client Libraries
```
code/lib/
├── teamInvites.ts       # Invite operations client
└── teamMembers.ts       # Team operations client
```

### UI Pages
```
code/ui/
├── invite-token/
│   └── page.tsx         # Invite acceptance page
└── settings-user-page.tsx  # Updated settings page
```

---

## Quality Gates

| Check | Status |
|-------|--------|
| No "(UI-only)" labels | PASS (0 matches) |
| Contracts build | PASS |
| Tests (43 total) | PASS |
| Typecheck | PASS |
| Build | PASS |

---

## service_role Justification

Two functions require `service_role`:

1. **v1-invite-accept**: Must create membership for any authenticated user accepting a valid token, regardless of their current org permissions.

2. **v1-team-remove**: Must delete membership records. The caller's permission is verified first (must be Manager+), then service_role executes the deletion.

Both functions validate authorization before using elevated privileges.

---

## Source File Locations

| Review File | Source Location |
|-------------|-----------------|
| `code/migrations/20260107210000_*.sql` | `supabase/migrations/` |
| `code/edge-functions/*` | `supabase/functions/` |
| `code/contracts/*` | `packages/contracts/src/` |
| `code/lib/*` | `apps/hps-dealengine/lib/` |
| `code/ui/invite-token/page.tsx` | `apps/hps-dealengine/app/invite/[token]/` |
| `code/ui/settings-user-page.tsx` | `apps/hps-dealengine/app/(app)/settings/user/` |
