# Before State - Slice 2: Team Access & Invitations

**Captured:** 2026-01-07

## Current State Analysis

### Settings Page Team Section

The settings page at `apps/hps-dealengine/app/(app)/settings/user/page.tsx` has a "Team access" card that:

1. **Uses fake/stub data** - `LocalTeamMember` type with hardcoded members
2. **Shows "(UI-only)" label** - Indicates functionality is not connected
3. **Invite form is non-functional** - Button does nothing
4. **Remove buttons are non-functional** - Just update local state

```tsx
// BEFORE: Fake team data
type LocalTeamMember = {
  id: string;
  name: string;
  role: string;
  email: string;
};

const [team, setTeam] = useState<LocalTeamMember[]>([
  { id: "1", name: "Jane Doe", role: "Manager", email: "jane@hps.com" },
  { id: "2", name: "John Smith", role: "Analyst", email: "john@hps.com" },
]);
```

### Missing Infrastructure

| Component | Status |
|-----------|--------|
| `invitations` table | Missing |
| `v1-invite-send` | Missing |
| `v1-invite-accept` | Missing |
| `v1-invite-list` | Missing |
| `v1-invite-revoke` | Missing |
| `v1-team-list` | Missing |
| `v1-team-remove` | Missing |
| Invite contracts | Missing |
| Team contracts | Missing |
| Client libraries | Missing |
| Invite accept page | Missing |

### Existing Infrastructure

- `memberships` table exists with `membership_role` enum: `('analyst', 'manager', 'vp')`
- `organizations` table exists
- `profiles` table exists with `display_name`
- `email.ts` shared utility exists for Resend integration
- `cors.ts` shared utility exists

### RLS Status

- No RLS policies for team management operations
- Manager+ cannot invite or manage members
- No authorization checks on team operations

## Gaps to Address

- G-002: Team member list shows fake/stub data
- G-009: Missing invite send functionality
- G-010: Missing invite accept flow
- G-011: Missing invite revoke functionality
- G-013: Missing team member removal
- G-014: No RLS policies for team data
