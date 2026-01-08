# After State — Slice 1

## Database
- [x] profiles table exists: YES (migration 20260107200000_profiles_table.sql)
- [x] RLS policies: profiles_select, profiles_insert, profiles_update
- [x] Auto-create trigger: on_auth_user_created_profile
- [x] Backfill existing users: YES
- [x] Theme constraint values: `('system','dark','light','navy','burgundy','green','black','white','violet','pink')` - includes violet/pink (migration 20260107200001_theme_constraint_fix.sql)

## Edge Functions
- [x] v1-profile-get exists: YES (supabase/functions/v1-profile-get/index.ts)
- [x] v1-profile-put exists: YES (supabase/functions/v1-profile-put/index.ts)

## UI State
- [x] Profile card shows: Real user data from API
- [x] Loading skeleton for profile: YES
- [x] Error handling for profile: YES (with retry)
- [x] Saving state indicator: YES
- [x] TODO comments removed: YES

## Current Profile Code (settings/user/page.tsx)
```typescript
// State from API
const [profile, setProfile] = useState<ProfileGetResponse["profile"] | null>(null);
const [profileEmail, setProfileEmail] = useState<string>("");
const [profileLoading, setProfileLoading] = useState(true);
const [profileError, setProfileError] = useState<string | null>(null);
const [profileFieldError, setProfileFieldError] = useState<string | null>(null);
const [profileSaving, setProfileSaving] = useState(false);

// Load from API on mount
useEffect(() => {
  loadProfile();
}, [loadProfile]);
```

## Contract Exports
- [x] profile.ts exists: YES (packages/contracts/src/profile.ts)
- [x] Profile types in contracts/src/index.ts: YES (export * from "./profile")

## Client Library
- [x] profileSettings.ts exists: YES (apps/hps-dealengine/lib/profileSettings.ts)
- [x] fetchProfile(): YES
- [x] updateProfile(): YES
- [x] saveProfileDraft(): YES (EC-1.7 draft recovery)
- [x] getProfileDraft(): YES
- [x] clearProfileDraft(): YES
- [x] ProfileError class: YES (with field-specific errors)

## Tests
- [x] Profile contract tests: 24 tests passing
- [x] Edge case coverage:
  - EC-1.1: New profile returns is_new=true
  - EC-1.2: Empty display_name rejected
  - EC-1.3: display_name > 100 chars rejected
  - EC-1.4: Invalid phone format rejected
  - EC-1.5: Invalid timezone rejected

## Quality Gates
- [x] pnpm -w typecheck: PASSING
- [x] Profile tests: 24/24 PASSING
- [x] pnpm -w build: PASSING

## Pending Deployment
- [ ] supabase db push (apply migrations)
- [ ] supabase functions deploy v1-profile-get
- [ ] supabase functions deploy v1-profile-put
