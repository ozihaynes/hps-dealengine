# Slice 1: Profile Settings — Code Manifest

## Collection Date
2026-01-07

## Files Included

### Migrations
- [x] `migrations/20260107200000_profiles_table.sql` (3,813 bytes)
- [x] `migrations/20260107200001_theme_constraint_fix.sql` (916 bytes)

### Edge Functions
- [x] `edge-functions/v1-profile-get/index.ts` (4,018 bytes)
- [x] `edge-functions/v1-profile-get/config.toml` (18 bytes)
- [x] `edge-functions/v1-profile-put/index.ts` (5,681 bytes)
- [x] `edge-functions/v1-profile-put/config.toml` (18 bytes)

### Contracts
- [x] `contracts/profile.ts` (2,442 bytes)
- [x] `contracts/profile.test.ts` (8,026 bytes)

### Client Library
- [x] `lib/profileSettings.ts` (4,066 bytes)

### UI
- [x] `ui/page.tsx` (28,919 bytes) — settings/user/page.tsx

## Verification Checklist

### Core Functionality
- [x] No "Jane Doe" in ui/page.tsx — **PASS** (none found)
- [x] fetchProfile imported in ui/page.tsx — **PASS** (line 9, 173)
- [x] profileLoading state exists in ui/page.tsx — **PASS** (line 96, 509, 521)

### Accessibility (WCAG 2.1 AA)
- [x] min-h-[44px] touch targets present — **PASS** (lines 552, 574)
- [x] htmlFor/id accessibility labels present — **PASS** (lines 539/543, 566/570)

## File Structure

```
code/
├── MANIFEST.md
├── contracts/
│   ├── profile.test.ts
│   └── profile.ts
├── edge-functions/
│   ├── v1-profile-get/
│   │   ├── config.toml
│   │   └── index.ts
│   └── v1-profile-put/
│       ├── config.toml
│       └── index.ts
├── lib/
│   └── profileSettings.ts
├── migrations/
│   ├── 20260107200000_profiles_table.sql
│   └── 20260107200001_theme_constraint_fix.sql
└── ui/
    └── page.tsx
```

## Total Files: 10
## Total Size: ~58 KB
