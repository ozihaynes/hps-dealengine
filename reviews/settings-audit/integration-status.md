# Integration Status

## Resend API

### Configuration

| Item | Value | Location |
|------|-------|----------|
| API URL | `https://api.resend.com/emails` | `_shared/email.ts:22` |
| Default From | `HPS DealEngine <onboarding@resend.dev>` | `_shared/email.ts:24` |
| API Key Env | `RESEND_API_KEY` | `supabase/.env.example:12` |
| Fallback | Console.log stub when key missing | `_shared/email.ts:36-42` |

### Implementation

**File:** `supabase/functions/_shared/email.ts`

```typescript
export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult>
```

**Features:**
- ✅ Generic email sending function
- ✅ Graceful fallback for local dev (console.log stub)
- ✅ Error handling with success/failure result
- ✅ Support for reply-to header

### Usage in Codebase

| Function | Uses Resend | Purpose |
|----------|-------------|---------|
| `v1-intake-send-link` | ✅ Yes | Send intake form links to clients |
| Team invites | ❌ No | Not implemented |

### Status: 🟡 Partial

**What Works:**
- Resend integration is fully implemented and functional
- Used for intake link emails

**What's Missing:**
- No invite email template
- No Edge Function wired to send team invites
- No invite acceptance flow

### Required for Team Invites

1. Create `v1-invite-send` Edge Function
2. Create invite email template (HTML)
3. Wire to Resend via `sendEmail()`
4. Handle invite token generation

---

## Supabase Storage

### Existing Buckets

| Bucket | Purpose | Public | Size Limit | Status |
|--------|---------|--------|------------|--------|
| `evidence` | Deal evidence files | false | - | 🟢 Active |
| `intake` | Client intake uploads | false | 25MB | 🟢 Active |

### Evidence Bucket

**File:** `supabase/migrations/20251109001136_evidence_bucket_and_policies.sql`

- Created conditionally (checks if storage schema exists)
- Used for deal evidence attachments
- Private bucket with RLS

### Intake Bucket

**File:** `supabase/migrations/20260101190000_intake_storage_bucket.sql`

- 25MB file size limit
- Allowed MIME types: PDF, JPEG, PNG, DOCX, XLSX
- RLS policies:
  - Anon can upload to `quarantine/` folder
  - Staff can read files for their org
  - Staff can delete files for their org

### Missing Buckets

| Bucket | Purpose | Status |
|--------|---------|--------|
| `org-assets` or `logos` | Business logo uploads | ❌ Does Not Exist |
| `avatars` | User profile pictures | ❌ Does Not Exist |

### Logo Upload Implementation Gap

**Current State:**
- `user/page.tsx:238-253` reads file as data URL
- Stored in React `useState` only
- Lost on page refresh

**Required:**
1. Create `org-assets` bucket with policies
2. Create `v1-org-logo-upload` Edge Function
3. Return signed URL for upload
4. Store URL in `organizations.logo_url` column
5. Display from storage URL, not data URL

### Status: 🔴 Not Implemented

---

## Supabase Auth

### Current Implementation

**Sign In:**
- Email/password via Supabase Auth
- Session stored in Supabase client
- Cookie set: `hps_auth_token`

**Sign Out:**
- `logout/page.tsx:11-28`
- Calls `supabase.auth.signOut()`
- Clears cookie manually
- Clears AI windows storage
- Redirects to `/login`

**Session Check:**
- `middleware.ts` checks for auth cookie
- Redirects unauthenticated users to `/login`

### Membership Role Loading

**File:** `lib/dealSessionContext.tsx`

```typescript
// Loaded from memberships table
const { membershipRole } = useDealSession();
```

- Role checked for policy override approval: `policy-overrides/page.tsx:82-83`
- Used to show/hide approval buttons

### Status: 🟢 Complete

**What Works:**
- Sign in/out flow
- Session persistence
- Role loading from memberships
- Protected routes via middleware

**What's Missing:**
- No multi-org switching UI (if user has multiple memberships)
- No role-based route protection (all routes accessible)

---

## Supabase Edge Functions (Settings-Related)

### v1-user-settings

| Method | Purpose | Status |
|--------|---------|--------|
| GET | Fetch user settings for org | 🟢 Complete |
| PUT | Upsert user settings | 🟢 Complete |

**RLS:** Validates membership before read/write

**File:** `supabase/functions/v1-user-settings/index.ts`

### v1-sandbox-settings

| Method | Purpose | Status |
|--------|---------|--------|
| GET | Fetch sandbox settings | 🟢 Complete |
| PUT | Update sandbox settings | 🟢 Complete |

**File:** `supabase/functions/v1-sandbox-settings/index.ts`

### v1-policy-override-approve

| Method | Purpose | Status |
|--------|---------|--------|
| POST | Approve/reject policy override | 🟢 Complete |

**File:** `supabase/functions/v1-policy-override-approve/index.ts`

### v1-policy-override-request

| Method | Purpose | Status |
|--------|---------|--------|
| POST | Request new policy override | 🟢 Complete |

**File:** `supabase/functions/v1-policy-override-request/index.ts`

### Missing Edge Functions

| Function | Purpose | Priority |
|----------|---------|----------|
| `v1-profile-get` | Get user profile | P1 |
| `v1-profile-put` | Update user profile | P1 |
| `v1-invite-send` | Send team invite email | P1 |
| `v1-invite-accept` | Accept invite, create membership | P1 |
| `v1-team-list` | List org team members | P1 |
| `v1-team-remove` | Remove team member | P1 |
| `v1-org-logo-upload` | Get signed URL for logo upload | P2 |
| `v1-org-settings-put` | Update org settings | P2 |

---

## Summary

| Integration | Component | Status |
|-------------|-----------|--------|
| **Resend** | Email library | 🟢 Implemented |
| **Resend** | Intake emails | 🟢 Working |
| **Resend** | Team invites | 🔴 Not wired |
| **Storage** | Evidence bucket | 🟢 Working |
| **Storage** | Intake bucket | 🟢 Working |
| **Storage** | Logo bucket | 🔴 Missing |
| **Storage** | Avatar bucket | 🔴 Missing |
| **Auth** | Sign in/out | 🟢 Working |
| **Auth** | Session management | 🟢 Working |
| **Auth** | Role loading | 🟢 Working |
| **Auth** | Multi-org switch | 🟡 Not implemented |
| **Edge Functions** | User settings | 🟢 Working |
| **Edge Functions** | Sandbox settings | 🟢 Working |
| **Edge Functions** | Policy overrides | 🟢 Working |
| **Edge Functions** | Profile CRUD | 🔴 Missing |
| **Edge Functions** | Team management | 🔴 Missing |
