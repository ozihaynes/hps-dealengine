# Initial Recommendations

## High Priority (Security/Data Loss Risk)

### 1. Fix theme constraint mismatch

**Issue:** Database theme check constraint doesn't include `violet` and `pink` which are used in frontend.

**Evidence:**
- DB constraint: `supabase/migrations/20251228143000_update_user_settings_theme_palette.sql:5`
- Frontend themes: `lib/themeTokens.ts:1` includes `violet`, `pink`

**Risk:** Users selecting `violet` or `pink` themes may get database errors.

**Fix:**
```sql
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_theme_check;
ALTER TABLE user_settings ADD CONSTRAINT user_settings_theme_check
  CHECK (theme IN ('system','dark','light','navy','burgundy','green','black','white','violet','pink'));
```

---

### 2. Remove misleading save buttons or add real persistence

**Issue:** Profile and Business "Save" buttons show success messages but don't persist data.

**Evidence:**
- `user/page.tsx:196-200` — onSaveProfile shows "Profile saved locally"
- `user/page.tsx:203-207` — onSaveBusiness shows "Business settings saved locally"
- Users may believe their data is saved when it isn't.

**Risk:** Data loss, user frustration, potential support tickets.

**Fix Options:**
1. **Short-term:** Disable save buttons and show "Coming soon" badge
2. **Long-term:** Implement real profile/business persistence (see P1 items)

---

### 3. Remove UI-only labels from production

**Issue:** Button labels include "(UI-only)" text intended for developers.

**Evidence:**
- `user/page.tsx:528` — "Send Invite (UI-only)"
- `user/page.tsx:566` — "Remove (UI-only)"

**Risk:** Unprofessional appearance, confusing to users.

**Fix:** Either hide team section entirely or implement real functionality.

---

## Medium Priority (Functionality Gaps)

### 4. Create profiles table and Edge Function

**Issue:** No storage for user profile data (display name, avatar).

**Evidence:**
- Hardcoded defaults: `user/page.tsx:85-88`
- No `profiles` table in any migration
- No `v1-profile-*` Edge Functions

**Impact:** Users cannot personalize their profiles.

**Recommended Implementation:**

```sql
-- profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (id = auth.uid());
```

---

### 5. Add organization branding columns

**Issue:** Organizations table only has `id`, `name`, `created_at`. No logo or branding fields.

**Evidence:** `supabase/migrations/20251108001201_remote_schema.sql:92-96`

**Impact:** Cannot store business logo or other org settings.

**Recommended Implementation:**

```sql
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}';
```

---

### 6. Create org-assets storage bucket

**Issue:** No storage bucket for organization logos/assets.

**Evidence:**
- `user/page.tsx:238-253` stores logo as data URL in React state
- No `org-assets` or `logos` bucket in migrations

**Impact:** Logo uploads are lost on page refresh.

**Recommended Implementation:**

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'org-assets',
    'org-assets',
    false,
    5242880,  -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
);

-- RLS: Org members can read
CREATE POLICY org_assets_select ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'org-assets'
    AND EXISTS (
        SELECT 1 FROM memberships m
        WHERE m.user_id = auth.uid()
        AND m.org_id::text = (storage.foldername(name))[1]
    )
);

-- RLS: Managers can upload
CREATE POLICY org_assets_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'org-assets'
    AND EXISTS (
        SELECT 1 FROM memberships m
        WHERE m.user_id = auth.uid()
        AND m.org_id::text = (storage.foldername(name))[1]
        AND m.role IN ('manager', 'vp', 'owner')
    )
);
```

---

### 7. Create invitations table and flow

**Issue:** Team invites are completely stubbed with no backend support.

**Evidence:**
- No `invitations` table in any migration
- `user/page.tsx:210-229` creates fake local team members
- Resend integration exists but not wired for invites

**Impact:** Cannot invite team members.

**Recommended Implementation:**

```sql
CREATE TABLE invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role membership_role NOT NULL DEFAULT 'analyst',
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Managers can insert/view
CREATE POLICY invitations_select ON invitations FOR SELECT
USING (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.org_id = invitations.org_id
    AND m.user_id = auth.uid()
    AND m.role IN ('manager', 'vp', 'owner')
));

CREATE POLICY invitations_insert ON invitations FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.org_id = invitations.org_id
    AND m.user_id = auth.uid()
    AND m.role IN ('manager', 'vp', 'owner')
));
```

---

### 8. Implement team management Edge Functions

**Issue:** No backend for listing team members, sending invites, or removing members.

**Evidence:** No `v1-team-*` or `v1-invite-*` Edge Functions exist.

**Impact:** Team management is completely non-functional.

**Recommended Edge Functions:**

| Function | Method | Purpose |
|----------|--------|---------|
| `v1-team-list` | GET | List all members + pending invites for org |
| `v1-invite-send` | POST | Create invitation + send email via Resend |
| `v1-invite-accept` | POST | Accept invite (public route with token) |
| `v1-invite-revoke` | DELETE | Cancel pending invite |
| `v1-team-remove` | DELETE | Remove member from org |
| `v1-team-update-role` | PATCH | Change member role |

---

## Low Priority (Polish/UX)

### 9. Remove TODO comments from production code

**Issue:** Developer comments visible in UI and code.

**Evidence:**
- `user/page.tsx:197-199` — "TODO: connect real profile API"
- `user/page.tsx:203-206` — "TODO: connect real business API"
- `user/page.tsx:226-228` — "TODO: send real invite via backend"
- `user/page.tsx:233-235` — "TODO: remove via backend"
- `user/page.tsx:248-249` — "TODO: persist in backend"

**Fix:** Replace with proper feature flags or remove sections entirely.

---

### 10. Deduplicate RLS policies

**Issue:** Multiple identical RLS policies on same tables.

**Evidence:**
- `organizations`: `org_select` and `orgs:select_by_membership` are identical
- `memberships`: `m_select_own` and `mem_select` are identical

**Fix:** Drop duplicate policies.

---

### 11. Add loading states to all sections

**Issue:** Some sections don't show loading indicators.

**Evidence:**
- Profile/Business sections load instantly with hardcoded data
- No skeleton states for these sections

**Fix:** Add consistent loading states when real data fetching is implemented.

---

### 12. Implement role-based UI permissions

**Issue:** All team management UI is visible regardless of user role.

**Evidence:**
- `user/page.tsx` shows invite form to all users
- Only policy-overrides page checks role: `policy-overrides/page.tsx:82-83`

**Fix:** Hide team management for non-managers using `membershipRole` check.

---

## Questions for OZi

1. **Profile source of truth:** Should user display name/email come from `auth.users.user_metadata` or a separate `profiles` table? The former is simpler but less flexible.

2. **Organization update permissions:** Should all managers be able to update org name/logo, or only owners/VPs?

3. **Invite expiry policy:** What should the default invite expiry be? Current placeholder suggests 7 days.

4. **Email domain:** The Resend integration uses `onboarding@resend.dev` as the sender. Should we set up a custom domain (e.g., `notifications@hpsdealengine.com`) before implementing invite emails?

5. **Multi-org users:** If a user belongs to multiple organizations, should we add an org switcher, or is one org per user the expected model?

6. **Feature flags:** Should we hide the Profile/Business/Team sections entirely until implemented, or show them in a disabled state with "Coming Soon"?
