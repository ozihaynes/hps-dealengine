# Supabase Schema — Settings Related

## Table: user_settings

**File:** `supabase/migrations/20251128093000_user_settings.sql`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Auto-generated |
| `user_id` | uuid | NOT NULL | References auth.users implicitly |
| `org_id` | uuid | NOT NULL, FK → organizations(id) ON DELETE CASCADE | Org scope |
| `default_posture` | text | NOT NULL, DEFAULT 'base', CHECK IN ('conservative','base','aggressive') | Underwriting default |
| `default_market` | text | NOT NULL, DEFAULT 'ORL' | Market default |
| `theme` | text | NOT NULL, DEFAULT 'system', CHECK constraint | Extended in later migration |
| `ui_prefs` | jsonb | NOT NULL, DEFAULT '{}' | Extensible UI preferences |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Auto-set |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | Trigger-updated |

**Constraints:**
- `user_settings_unique_user_org` UNIQUE (user_id, org_id)

**Indexes:**
- `idx_user_settings_user_org` ON (user_id, org_id)

**Theme Check Constraint (Updated):**
Migration `20251228143000_update_user_settings_theme_palette.sql` expanded allowed values:
```sql
CHECK (theme IN ('system','dark','light','navy','burgundy','green','black','white'))
```
Note: `violet` and `pink` are NOT in this constraint but ARE used in frontend. This is a **schema inconsistency**.

### RLS Policies

| Policy | Operation | Rule |
|--------|-----------|------|
| `user_settings_select` | SELECT | `user_id = auth.uid() AND EXISTS (SELECT 1 FROM memberships WHERE org_id = user_settings.org_id AND user_id = auth.uid())` |
| `user_settings_insert` | INSERT | Same membership check |
| `user_settings_update` | UPDATE | Same membership check |
| `user_settings_delete` | DELETE | Same membership check |

**Audit:** Trigger `audit_user_settings` logs all changes to `audit_logs`.

---

## Table: organizations

**File:** `supabase/migrations/20251108001201_remote_schema.sql`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Auto-generated |
| `name` | text | NOT NULL | Organization display name |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Auto-set |

**Missing Columns (Needed for Business Settings):**
- `logo_url` — For business logo storage
- `settings` or `metadata` — For additional org-level config

### RLS Policies

| Policy | Operation | Rule |
|--------|-----------|------|
| `org_select` | SELECT | `EXISTS (SELECT 1 FROM memberships WHERE org_id = organizations.id AND user_id = auth.uid())` |
| `orgs:select_by_membership` | SELECT | Same (duplicate policy) |

**Note:** No INSERT/UPDATE/DELETE policies for organizations — appears read-only for users.

---

## Table: memberships

**File:** `supabase/migrations/20251108001201_remote_schema.sql`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `org_id` | uuid | NOT NULL, FK → organizations(id) ON DELETE CASCADE | Part of PK |
| `user_id` | uuid | NOT NULL | Part of PK |
| `role` | membership_role | NOT NULL, DEFAULT 'analyst' | Enum type |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Auto-set |

**Primary Key:** (org_id, user_id)

**Enum Type: `membership_role`**
Migration `20251108001201_remote_schema.sql`:
```sql
CREATE TYPE public.membership_role AS ENUM ('analyst', 'manager', 'vp');
```
Migration `20251127215900_membership_role_owner.sql`:
```sql
ALTER TYPE public.membership_role ADD VALUE 'owner';
```

**Final Values:** `'analyst' | 'manager' | 'vp' | 'owner'`

### RLS Policies

| Policy | Operation | Rule |
|--------|-----------|------|
| `m_select` | SELECT | `user_id = auth.uid() OR is_org_manager(org_id, auth.uid())` |
| `m_select_own` | SELECT | `user_id = auth.uid()` |
| `mem_select` | SELECT | `user_id = auth.uid()` (duplicate) |
| `m_insert` | INSERT | `is_org_manager(org_id, auth.uid())` |
| `m_insert_self` | INSERT | `user_id = auth.uid()` |
| `m_update` | UPDATE | `is_org_manager(org_id, auth.uid())` |
| `m_update_self` | UPDATE | `user_id = auth.uid()` |

**Note:** Manager/VP can insert/update memberships. Users can insert themselves (self-signup flow).

---

## Table: audit_logs

**File:** `supabase/migrations/20251108001201_remote_schema.sql`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | bigint | PRIMARY KEY, SERIAL | Auto-increment |
| `org_id` | uuid | NOT NULL | Org scope |
| `actor_user_id` | uuid | NOT NULL | Who performed action |
| `action` | text | NOT NULL | INSERT/UPDATE/DELETE |
| `entity` | text | NOT NULL | Table name |
| `entity_id` | uuid | | Legacy column |
| `row_id_uuid` | uuid | | Current row ID column |
| `details` | jsonb | | Legacy details |
| `diff` | jsonb | | Current: {old, new} |
| `table_name` | text | | Current table name column |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | Auto-set |

### RLS Policies

| Policy | Operation | Rule |
|--------|-----------|------|
| `audit_select` | SELECT | Membership check |
| `audit_insert` | INSERT | Membership check |

---

## Table: policy_overrides

**File:** `supabase/migrations/20251126233123_create_policy_overrides.sql`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | uuid | PRIMARY KEY | Auto-generated |
| `org_id` | uuid | NOT NULL, FK → organizations(id) | Org scope |
| `deal_id` | uuid | | Optional deal reference |
| `run_id` | uuid | | Optional run reference |
| `posture` | text | NOT NULL | conservative/base/aggressive |
| `token_key` | text | NOT NULL | Policy token being overridden |
| `new_value` | jsonb | NOT NULL | Proposed new value |
| `justification` | text | | Reason for override |
| `status` | text | NOT NULL, DEFAULT 'pending' | pending/approved/rejected |
| `requested_by` | uuid | | User who requested |
| `requested_at` | timestamptz | DEFAULT now() | When requested |
| `approved_by` | uuid | | User who approved/rejected |
| `approved_at` | timestamptz | | When approved/rejected |

### RLS Policies

Manager/VP can approve; all members can view.

---

## Tables NOT Found (Needed)

### profiles

**Status:** ❌ Does Not Exist

**Proposed Schema:**
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES organizations(id),
  display_name text,
  email text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### invitations

**Status:** ❌ Does Not Exist

**Proposed Schema:**
```sql
CREATE TABLE invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role membership_role NOT NULL DEFAULT 'analyst',
  token text NOT NULL UNIQUE,
  invited_by uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

---

## Storage Buckets

### evidence

**File:** `supabase/migrations/20251109001136_evidence_bucket_and_policies.sql`

- **Purpose:** Store deal evidence files
- **Public:** false
- **Has Policies:** Yes (membership-based)

### intake

**File:** `supabase/migrations/20260101190000_intake_storage_bucket.sql`

- **Purpose:** Client intake file uploads
- **Public:** false
- **Size Limit:** 25MB
- **Allowed Types:** PDF, JPEG, PNG, DOCX, XLSX
- **Has Policies:** Yes (quarantine + staff access)

### logos / org-assets

**Status:** ❌ Does Not Exist

**Proposed:**
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'org-assets',
    'org-assets',
    false,
    5242880,  -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
);
```

---

## Helper Functions

### is_org_manager(_org uuid, _uid uuid)

**Returns:** boolean
**Purpose:** Check if user has manager or vp role in org

```sql
SELECT EXISTS (
  SELECT 1 FROM memberships
  WHERE org_id = _org AND user_id = _uid AND role IN ('manager','vp')
);
```

### is_org_member(_org uuid, _uid uuid)

**Returns:** boolean
**Purpose:** Check if user has any membership in org

```sql
SELECT EXISTS (
  SELECT 1 FROM memberships
  WHERE org_id = _org AND user_id = _uid
);
```

### ensure_membership_for_self_vp()

**Returns:** uuid (org_id)
**Purpose:** Bootstrap user as VP in default org (dev/onboarding helper)

---

## Schema Inconsistencies

1. **Theme constraint mismatch:**
   - DB allows: `system, dark, light, navy, burgundy, green, black, white`
   - Frontend uses: `burgundy, green, navy, violet, pink, black`
   - Missing from DB: `violet`, `pink`
   - Unused in DB: `white`

2. **Duplicate RLS policies:**
   - `org_select` and `orgs:select_by_membership` are identical
   - `m_select_own` and `mem_select` are identical
   - Should be deduplicated

3. **organizations.name** is the only brand field — no logo, description, or settings columns
