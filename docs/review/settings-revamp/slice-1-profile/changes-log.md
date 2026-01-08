# Slice 1: Profile Settings — Changes Log

## Summary
Transformed Profile Settings from a UI-only stub with hardcoded "Jane Doe" data to a fully functional feature with database persistence, RLS security, Edge Functions, and proper loading/saving/error states.

## Gap Addressed
- **G-001**: Profile uses useState with hardcoded data → Now uses real API with database persistence
- **G-006**: Theme constraint missing violet/pink → Fixed in migration

## Files Created

### Database Migrations
| File | Purpose |
|------|---------|
| `supabase/migrations/20260107200000_profiles_table.sql` | Creates profiles table with RLS, triggers, and backfill |
| `supabase/migrations/20260107200001_theme_constraint_fix.sql` | Adds violet/pink to theme constraint |

### Edge Functions
| File | Purpose |
|------|---------|
| `supabase/functions/v1-profile-get/index.ts` | GET endpoint for fetching user profile |
| `supabase/functions/v1-profile-put/index.ts` | PUT endpoint for updating user profile |

### Contracts
| File | Purpose |
|------|---------|
| `packages/contracts/src/profile.ts` | Zod schemas and TypeScript types for profile |
| `packages/contracts/src/profile.test.ts` | 24 tests for profile contracts |

### Client Library
| File | Purpose |
|------|---------|
| `apps/hps-dealengine/lib/profileSettings.ts` | API client functions and error handling |

## Files Modified

### Contracts Index
| File | Change |
|------|--------|
| `packages/contracts/src/index.ts` | Added `export * from "./profile"` |

### Settings Page
| File | Change |
|------|--------|
| `apps/hps-dealengine/app/(app)/settings/user/page.tsx` | Replaced hardcoded profile with API integration |

## Edge Cases Handled

| Code | Scenario | Implementation |
|------|----------|----------------|
| EC-1.1 | Profile doesn't exist | Returns skeleton with `is_new=true`, creates on first save |
| EC-1.2 | Empty display_name | Validation rejects, field error shown |
| EC-1.3 | display_name > 100 chars | Validation rejects with clear message |
| EC-1.4 | Invalid phone format | Regex validation, allows null/empty |
| EC-1.5 | Invalid timezone | Enum validation against allowed list |
| EC-1.6 | Network failure | ProfileError with retry suggestion |
| EC-1.7 | Unsaved changes lost | LocalStorage draft persistence |

## UI States Implemented

| State | Treatment |
|-------|-----------|
| Loading | Skeleton with shimmer animation |
| Error | Red banner with retry button |
| Saving | "Saving..." text, disabled inputs |
| Success | Normal form display |
| Field Error | Inline error below field |

## Schema Details

### profiles Table
```sql
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  phone text,
  timezone text DEFAULT 'America/New_York',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
```

### RLS Policies
- `profiles_select`: Users can only SELECT their own profile
- `profiles_insert`: Users can only INSERT their own profile
- `profiles_update`: Users can only UPDATE their own profile

### Triggers
- `set_profiles_updated_at`: Updates updated_at on changes
- `on_auth_user_created_profile`: Auto-creates profile on signup
- `audit_profiles`: Logs changes to audit table (if audit function exists)

## Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| display_name | 1-100 characters | "Display name must be 1-100 characters" |
| phone | Matches `/^[\d\s\-\+\(\)]{7,20}$/` or null/empty | "Invalid phone format" |
| timezone | One of allowed values | "Invalid timezone" |

## Timezone Options
- America/New_York (Eastern)
- America/Chicago (Central)
- America/Denver (Mountain)
- America/Los_Angeles (Pacific)
- America/Phoenix (Arizona)
- UTC

## Test Coverage

### Profile Contract Tests (24 tests)
- ProfileSchema validation (4 tests)
- ProfileUpdateSchema validation (9 tests)
- TimezoneSchema validation (2 tests)
- TIMEZONE_OPTIONS validation (2 tests)
- ProfileGetResponseSchema validation (3 tests)
- Edge case coverage (4 tests)

## Quality Gate Results
- `pnpm -w typecheck`: PASS
- `npx vitest run packages/contracts/src/profile.test.ts`: 24/24 PASS
- `pnpm -w build`: PASS

## Deployment Commands
```bash
# Apply database migrations
supabase db push

# Deploy Edge Functions
supabase functions deploy v1-profile-get
supabase functions deploy v1-profile-put
```

## Rollback
```sql
-- Rollback profiles table
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_profile();
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Rollback theme constraint (restore original)
ALTER TABLE public.user_settings DROP CONSTRAINT IF EXISTS user_settings_theme_check;
ALTER TABLE public.user_settings ADD CONSTRAINT user_settings_theme_check
  CHECK (theme IN ('system','dark','light','navy','burgundy','green','black','white'));
```
