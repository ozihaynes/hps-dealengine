# After State - Slice 2: Team Access & Invitations

**Completed:** 2026-01-07

## Implementation Complete

### Settings Page Team Section

The settings page now has fully functional "Team access" card:

1. **Real API data** - Uses `TeamMember` and `InvitationDisplay` types from contracts
2. **No "(UI-only)" labels** - All functionality connected
3. **Working invite form** - Sends real invitations via Resend
4. **Working remove buttons** - Actually removes members via API

```typescript
// AFTER: Real API integration
import { TeamMember, InvitationDisplay, InviteRole } from "@hps-internal/contracts";
import { sendInvite, listInvites, revokeInvite } from "@/lib/teamInvites";
import { listMembers, removeMember } from "@/lib/teamMembers";

const [members, setMembers] = useState<TeamMember[]>([]);
const [pendingInvites, setPendingInvites] = useState<InvitationDisplay[]>([]);
const [canManageTeam, setCanManageTeam] = useState(false);
```

### New Infrastructure

| Component | Status | Location |
|-----------|--------|----------|
| `invitations` table | Created | `migrations/20260107210000_invitations_table.sql` |
| `v1-invite-send` | Created | `supabase/functions/v1-invite-send/` |
| `v1-invite-accept` | Created | `supabase/functions/v1-invite-accept/` |
| `v1-invite-list` | Created | `supabase/functions/v1-invite-list/` |
| `v1-invite-revoke` | Created | `supabase/functions/v1-invite-revoke/` |
| `v1-team-list` | Created | `supabase/functions/v1-team-list/` |
| `v1-team-remove` | Created | `supabase/functions/v1-team-remove/` |
| Invite contracts | Created | `packages/contracts/src/invite.ts` |
| Team contracts | Created | `packages/contracts/src/team.ts` |
| Client libraries | Created | `apps/hps-dealengine/lib/team*.ts` |
| Invite accept page | Created | `apps/hps-dealengine/app/invite/[token]/page.tsx` |

### RLS Policies

```sql
-- Manager+ can view invitations for their org
CREATE POLICY invitations_select ON public.invitations FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.memberships m
  WHERE m.org_id = invitations.org_id
  AND m.user_id = auth.uid()
  AND m.role IN ('manager', 'vp', 'owner')
));

-- Manager+ can create invitations
CREATE POLICY invitations_insert ON public.invitations FOR INSERT
WITH CHECK (...);

-- Manager+ can revoke invitations
CREATE POLICY invitations_update ON public.invitations FOR UPDATE
USING (...);
```

### Contract Tests

- **invite.test.ts**: 25 tests covering all request/response schemas
- **team.test.ts**: 18 tests covering all request/response schemas
- **Total**: 43 tests passing

### Edge Cases Covered

| Code | Description | Implementation |
|------|-------------|----------------|
| EC-2.2 | Duplicate invite | Returns 409 with `existing_expires_at` |
| EC-2.3 | Expired token | Returns 410 "Invitation has expired" |
| EC-2.4 | Email mismatch | Returns 403 with `expected_email` |
| EC-2.5 | Already used | Returns 400 "Invitation already accepted" |
| EC-2.6 | Already accepted | Returns 400 "Cannot revoke accepted invitation" |
| EC-2.7 | Remove self | Returns 400 "Cannot remove yourself" |
| EC-2.8 | Remove VP | Returns 403 "Cannot remove VP" |
| EC-2.9 | Non-manager | Returns 403 via RLS |
| EC-2.10 | Email fails | Returns 200 with `email_sent: false` |
| EC-2.12 | Login redirect | Preserves `?token=` in URL |

## Quality Verification

```bash
# No "(UI-only)" labels
grep -c "(UI-only)" apps/hps-dealengine/app/(app)/settings/user/page.tsx
# Result: 0

# Tests pass
pnpm --filter "@hps-internal/contracts" test
# Result: 43 tests passing

# Typecheck passes
pnpm -w typecheck
# Result: No errors

# Build passes
pnpm -w build
# Result: Success
```

## User Flow

### Send Invitation
1. Manager opens Settings > Team access
2. Enters email and selects role
3. Clicks "Send Invite"
4. API creates invitation record + sends email
5. Pending invite appears in list

### Accept Invitation
1. Recipient clicks link in email
2. `/invite/[token]` page loads
3. If not logged in → redirected to login (token preserved)
4. If logged in → invitation accepted automatically
5. Success message shown with link to dashboard

### Revoke Invitation
1. Manager sees pending invite
2. Clicks "Revoke"
3. API marks invitation as revoked
4. Invite removed from list

### Remove Member
1. Manager sees team member
2. Clicks "Remove"
3. Confirmation appears
4. Clicks "Confirm"
5. API removes membership
6. Member removed from list
