# Before State — Slice 1

## Database
- [ ] profiles table exists: NO (not found in migrations)
- [ ] Theme constraint values: `('system','dark','light','navy','burgundy','green','black','white')` - missing violet/pink

## Edge Functions
- [ ] v1-profile-get exists: NO
- [ ] v1-profile-put exists: NO

## UI State
- [ ] Profile card shows: "Jane Doe" (hardcoded at line 85-88)
- [ ] No loading skeleton for profile
- [ ] No error handling for profile
- [ ] TODO comments present indicating stub implementation

## Current Profile Code (settings/user/page.tsx:84-88)
```typescript
const [profile, setProfile] = useState<LocalProfile>({
  name: "Jane Doe",
  email: "jane@example.com",
});
```

## Contract Exports
- [ ] profile.ts exists: NO
- [ ] No profile types in contracts/src/index.ts
