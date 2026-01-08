# Data Flow Analysis

## 1. Theme Preference

**UI Location:** `components/settings/ThemeSwitcher.tsx:11-71`

### Current Flow

```
1. User clicks theme swatch
   └─► ThemeSwitcher.tsx:48-50
       └─► setTheme(key) from useTheme()

2. ThemeProvider handles change
   └─► ThemeProvider.tsx:206-210
       └─► Sets pendingPersistRef.current = true
       └─► Updates themeSetting state

3. Effect triggers persistence
   └─► ThemeProvider.tsx:111-116
       └─► Resolves theme, updates DOM attributes
       └─► Writes to localStorage ('dealengine.theme')

4. If user logged in, persist to DB
   └─► ThemeProvider.tsx:192-204
       └─► upsertUserSettings({ theme: themeSetting })
           └─► lib/userSettings.ts:71-104
               └─► PUT /functions/v1/v1-user-settings
                   └─► v1-user-settings/index.ts:176-238
                       └─► UPSERT user_settings (user_id, org_id)

5. On page load, hydrate from:
   └─► First: localStorage (immediate)
   └─► Then: fetchUserSettings() (async)
       └─► Overwrites if remote differs from local
```

### Status: 🟢 Complete

**Evidence:**
- localStorage write: `ThemeProvider.tsx:62-68`
- DB upsert: `ThemeProvider.tsx:196`
- RLS enforced: `v1-user-settings/index.ts:151` (resolveOrgId checks memberships)

---

## 2. Default Posture

**UI Location:** `app/(app)/settings/user/page.tsx:368-384`

### Current Flow

```
1. Page loads, fetches current settings
   └─► user/page.tsx:117-143
       └─► fetchUserSettings()
           └─► GET /functions/v1/v1-user-settings
               └─► Returns { settings: { defaultPosture, ... } }

2. User changes posture dropdown
   └─► user/page.tsx:370-376
       └─► setForm({ ...prev, defaultPosture: e.target.value })
       └─► Local state only (hasChanges = true)

3. User clicks "Save defaults"
   └─► user/page.tsx:162-193
       └─► onSave()
           └─► upsertUserSettings({ defaultPosture: form.defaultPosture })
               └─► PUT /functions/v1/v1-user-settings
                   └─► UPSERT user_settings.default_posture

4. On success, update local state + show success message
   └─► user/page.tsx:183-186
       └─► setSuccess("Settings saved.")
```

### Status: 🟢 Complete

**Evidence:**
- Fetch on mount: `user/page.tsx:123`
- Save mutation: `user/page.tsx:182`
- DB column: `user_settings.default_posture`

---

## 3. Default Market

**UI Location:** `app/(app)/settings/user/page.tsx:386-403`

### Current Flow

Same as Default Posture — both saved in single `onSave()` call.

### Status: 🟢 Complete

---

## 4. Profile Settings

**UI Location:** `app/(app)/settings/user/page.tsx:411-444`

### Current Flow

```
1. Page loads with hardcoded defaults
   └─► user/page.tsx:85-88
       └─► useState({ name: "Jane Doe", email: "jane@example.com" })

2. User edits name/email
   └─► user/page.tsx:431-441
       └─► setProfile({ ...prev, name: e.target.value })
       └─► Local state only

3. User clicks "Save Profile"
   └─► user/page.tsx:196-200
       └─► onSaveProfile()
           └─► setLocalMessage("Profile saved locally. (TODO: connect real profile API.)")

4. ❌ No API call, no persistence
   └─► Data lost on page refresh
```

### Status: 🔴 UI-Only

**Gap:** No `profiles` table, no Edge Function, no API call.

**Evidence:**
- Hardcoded defaults: `user/page.tsx:85-88`
- TODO comment: `user/page.tsx:195-199`
- No fetch on mount for profile data

---

## 5. Business Settings

**UI Location:** `app/(app)/settings/user/page.tsx:446-492`

### Current Flow

```
1. Page loads with hardcoded defaults
   └─► user/page.tsx:90-93
       └─► useState({ name: "HPS Investments LLC", logoDataUrl: null })

2. User edits business name
   └─► user/page.tsx:466
       └─► setBusiness({ ...prev, name: e.target.value })

3. User uploads logo
   └─► user/page.tsx:238-253
       └─► FileReader reads file as data URL
       └─► setBusiness({ ...prev, logoDataUrl: result })
       └─► setLocalMessage("Logo staged locally. (TODO: persist in backend.)")

4. User clicks "Save Business"
   └─► user/page.tsx:203-207
       └─► onSaveBusiness()
           └─► setLocalMessage("Business settings saved locally. (TODO: connect real business API.)")

5. ❌ No API call, no persistence, no storage upload
   └─► Data lost on page refresh
```

### Status: 🔴 UI-Only

**Gap:**
- No `logo_url` column on `organizations`
- No `org-assets` storage bucket
- No Edge Function for org updates
- Logo stored as data URL in React state only

**Evidence:**
- Hardcoded defaults: `user/page.tsx:90-93`
- TODO comments: `user/page.tsx:203-206, 248-249`

---

## 6. Team Access

**UI Location:** `app/(app)/settings/user/page.tsx:494-578`

### Current Flow

```
1. Page loads with hardcoded team members
   └─► user/page.tsx:95-108
       └─► useState([
             { id: 1, name: "Alex Analyst", role: "Underwriter" },
             { id: 2, name: "Casey Manager", role: "Manager" }
           ])

2. User enters invite email + selects role
   └─► user/page.tsx:510-526
       └─► setInviteEmail(), setInviteRole()

3. User clicks "Send Invite (UI-only)"
   └─► user/page.tsx:210-229
       └─► onInvite()
           └─► Creates fake team member with id: Date.now()
           └─► setTeam([...prev, newMember])
           └─► setLocalMessage("Invite staged locally. (TODO: send real invite via backend.)")

4. User clicks "Remove (UI-only)"
   └─► user/page.tsx:231-236
       └─► onRemoveMember(id)
           └─► setTeam(prev.filter(m => m.id !== id))
           └─► setLocalMessage("Member removed locally. (TODO: remove via backend.)")

5. ❌ No invitations table, no Resend call, no memberships update
   └─► Data lost on page refresh
```

### Status: 🔴 UI-Only

**Gap:**
- No `invitations` table
- Resend integration exists (`_shared/email.ts`) but not wired for invites
- No Edge Function for team management
- Frontend button literally says "(UI-only)"

**Evidence:**
- Hardcoded team: `user/page.tsx:95-108`
- Button text: `user/page.tsx:528` "Send Invite (UI-only)"
- TODO comments: `user/page.tsx:209, 226-228, 233-235`

---

## 7. Policy Overrides

**UI Location:** `app/(app)/settings/policy-overrides/page.tsx`

### Current Flow

```
1. Page loads, fetches pending overrides
   └─► policy-overrides/page.tsx:17-61
       └─► supabase.from("policy_overrides").select("*").eq("status", "pending")
       └─► RLS filters to user's org

2. Manager/VP clicks Approve or Reject
   └─► policy-overrides/page.tsx:64-80
       └─► handleDecision(id, decision)
           └─► approvePolicyOverride({ overrideId, decision })
               └─► lib/policyOverrides.ts
                   └─► POST /functions/v1/v1-policy-override-approve
                       └─► UPDATE policy_overrides SET status = decision

3. UI updates to remove approved/rejected item
   └─► policy-overrides/page.tsx:73-75
```

### Status: 🟢 Complete

**Evidence:**
- Direct Supabase query with RLS: `policy-overrides/page.tsx:23-29`
- Edge Function approval: `policyOverrides.ts`

---

## 8. Policy Versions History

**UI Location:** `app/settings/policy-versions/page.tsx`

### Current Flow

```
1. Page loads, fetches latest 50 versions
   └─► policy-versions/page.tsx:19-39
       └─► supabase.from("policy_versions_api").select("*").limit(50)
       └─► RLS filters to user's org

2. Renders list of version cards
   └─► policy-versions/page.tsx:115-140
```

### Status: 🟢 Complete

**Evidence:**
- Uses `policy_versions_api` view with RLS: `policy-versions/page.tsx:31`

---

## 9. Sign Out

**UI Location:** `app/(app)/settings/user/page.tsx:632-645`

### Current Flow

```
1. User clicks "Sign out" button
   └─► user/page.tsx:643
       └─► Link href="/logout"

2. Logout page runs signout
   └─► logout/page.tsx:11-28
       └─► supabase.auth.signOut()
       └─► Clear auth cookie
       └─► clearAiWindowsStorage()
       └─► router.replace("/login")
```

### Status: 🟢 Complete

**Evidence:**
- Cookie clear: `logout/page.tsx:20-25`
- Supabase signout: `logout/page.tsx:14`

---

## Summary Matrix

| Section | Fetch | Local State | API Save | DB Persist | Status |
|---------|-------|-------------|----------|------------|--------|
| Theme | ✅ | ✅ | ✅ | ✅ | 🟢 Complete |
| Default Posture | ✅ | ✅ | ✅ | ✅ | 🟢 Complete |
| Default Market | ✅ | ✅ | ✅ | ✅ | 🟢 Complete |
| Profile | ❌ | ✅ | ❌ | ❌ | 🔴 UI-Only |
| Business | ❌ | ✅ | ❌ | ❌ | 🔴 UI-Only |
| Team Access | ❌ | ✅ | ❌ | ❌ | 🔴 UI-Only |
| Policy Overrides | ✅ | ✅ | ✅ | ✅ | 🟢 Complete |
| Policy Versions | ✅ | ✅ | N/A | N/A | 🟢 Complete |
| Sign Out | N/A | N/A | ✅ | ✅ | 🟢 Complete |
