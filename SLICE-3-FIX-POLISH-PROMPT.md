# SLICE 3 FORENSIC REVIEW - FIX/POLISH PROMPT

**Date:** 2026-01-07  
**Reviewer:** Principal Architect  
**Status:** 🔴 FIXES REQUIRED BEFORE DEPLOYMENT

---

## EXECUTIVE SUMMARY

Slice 3 implementation has **2 P0 critical issues** that will cause runtime failures, **2 P1 high-priority issues** that affect reliability/UX, and **2 P2 medium issues** for polish. Must fix P0/P1 before deployment.

---

## 🔴 P0 - CRITICAL (RUNTIME FAILURES)

### P0-001: 'owner' role doesn't exist in DB enum

**Impact:** Schema validation failures, potential auth bypass if unknown role passed through  
**Root Cause:** Contracts define a role that doesn't exist in the database

**Files to fix:**
- `packages/contracts/src/organization.ts` line 52
- `packages/contracts/src/__tests__/organization.test.ts` line 208

**Current (BROKEN):**
```typescript
// organization.ts line 52
caller_role: z.enum(["analyst", "manager", "vp", "owner"]),
```

**Fixed:**
```typescript
// organization.ts line 52
caller_role: z.enum(["analyst", "manager", "vp"]),
```

**Test file fix (line 208):**
```typescript
// BEFORE
for (const role of ["analyst", "manager", "vp", "owner"]) {

// AFTER
for (const role of ["analyst", "manager", "vp"]) {
```

---

### P0-002: v1-org-update missing `created_at` in response

**Impact:** OrgUpdateResponseSchema validation will FAIL at runtime - `created_at` is required  
**Root Cause:** SELECT clause missing required field

**File to fix:** `supabase/functions/v1-org-update/index.ts` line 145

**Current (BROKEN):**
```typescript
.select("id, name, logo_url, updated_at")
```

**Fixed:**
```typescript
.select("id, name, logo_url, created_at, updated_at")
```

---

## 🟠 P1 - HIGH (RELIABILITY/UX)

### P1-001: Storage policies not idempotent

**Impact:** Migration will fail on re-run (policy already exists error)  
**Root Cause:** Missing DROP POLICY IF EXISTS before CREATE POLICY

**File to fix:** `supabase/migrations/20260107130000_org_assets_bucket.sql`

**Add before each CREATE POLICY:**
```sql
-- Before line 23
DROP POLICY IF EXISTS "VP can upload org logos" ON storage.objects;

-- Before line 37
DROP POLICY IF EXISTS "VP can update org logos" ON storage.objects;

-- Before line 60
DROP POLICY IF EXISTS "VP can delete org logos" ON storage.objects;

-- Before line 74
DROP POLICY IF EXISTS "Anyone can read org logos" ON storage.objects;
```

---

### P1-002: AppTopNav missing logo error handler

**Impact:** Broken image icon if logo URL returns 404  
**Root Cause:** No onError fallback on img element

**File to fix:** `apps/hps-dealengine/components/AppTopNav.tsx` lines 26-27 (add state), lines 92-96 (add handler)

**Add state (after line 27):**
```typescript
const [logoError, setLogoError] = useState(false);
```

**Reset error when URL changes (in useEffect after setting orgLogoUrl):**
```typescript
setOrgLogoUrl(orgResponse.organization.logo_url || null);
setLogoError(false); // Reset error state when URL changes
```

**Fix img element (lines 90-96):**
```tsx
) : orgLogoUrl && !logoError ? (
  /* eslint-disable-next-line @next/next/no-img-element -- org logo from storage */
  <img
    src={orgLogoUrl}
    alt="Organization logo"
    className="h-[3.25rem] w-auto max-w-[300px] object-contain"
    onError={() => setLogoError(true)}
  />
) : (
```

---

## 🟡 P2 - MEDIUM (POLISH)

### P2-001: Business section missing change tracking

**Impact:** Save button always enabled even with no changes (unnecessary API calls)  
**File:** `apps/hps-dealengine/app/(app)/settings/user/page.tsx`

**Add after line 129 (with other state):**
```typescript
const [initialBusiness, setInitialBusiness] = useState<OrgBusiness | null>(null);
```

**Set initial state when loading (around line 294):**
```typescript
const businessData = {
  name: orgResponse.organization.name,
  logoUrl: orgResponse.organization.logo_url || null,
};
setBusiness(businessData);
setInitialBusiness(businessData); // Track initial state
```

**Add change detection (after line 350):**
```typescript
const hasBusinessChanges = useMemo(() => {
  if (!business || !initialBusiness) return false;
  return business.name !== initialBusiness.name;
}, [business, initialBusiness]);
```

**Update button disabled condition (line 878):**
```typescript
disabled={businessSaving || !business?.name?.trim() || !hasBusinessChanges}
```

---

### P2-002: Logo URL cache busting

**Impact:** Browser may show cached old logo after upload  
**File:** `apps/hps-dealengine/lib/orgSettings.ts` function `uploadOrganizationLogo`

**Add cache buster to returned URL (after line 239):**
```typescript
// Add cache buster to force browser refresh
const cacheBustedUrl = `${uploadUrlResponse.public_url}?v=${Date.now()}`;

// Step 3: Update organization with new logo URL
await updateOrganization({
  org_id: orgId,
  logo_url: cacheBustedUrl,
});

return cacheBustedUrl;
```

---

## COMPLETE FIX FILES

### File 1: packages/contracts/src/organization.ts

```typescript
import { z } from "zod";

/**
 * Organization contracts for business settings
 * Slice 3: Business Settings & Logo Upload
 */

// ============================================================================
// Constants
// ============================================================================

export const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_LOGO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/webp",
  "image/gif",
] as const;
export type AllowedLogoType = (typeof ALLOWED_LOGO_TYPES)[number];

export const MAX_ORG_NAME_LENGTH = 100;
export const MIN_ORG_NAME_LENGTH = 1;

// ============================================================================
// Organization Schema
// ============================================================================

export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  logo_url: z.string().url().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string().nullable().optional(),
});

export type Organization = z.infer<typeof OrganizationSchema>;

// ============================================================================
// Get Organization
// ============================================================================

export const OrgGetRequestSchema = z.object({
  org_id: z.string().uuid("Invalid organization ID"),
});

export type OrgGetRequest = z.infer<typeof OrgGetRequestSchema>;

export const OrgGetResponseSchema = z.object({
  ok: z.literal(true),
  organization: OrganizationSchema,
  // P0-001 FIX: Remove 'owner' - doesn't exist in membership_role enum
  caller_role: z.enum(["analyst", "manager", "vp"]),
});

export type OrgGetResponse = z.infer<typeof OrgGetResponseSchema>;

// ============================================================================
// Update Organization
// ============================================================================

export const OrgUpdateRequestSchema = z.object({
  org_id: z.string().uuid("Invalid organization ID"),
  name: z.preprocess(
    (val) => (typeof val === "string" ? val.trim() : val),
    z
      .string()
      .min(MIN_ORG_NAME_LENGTH, "Organization name cannot be blank")
      .max(MAX_ORG_NAME_LENGTH, `Organization name cannot exceed ${MAX_ORG_NAME_LENGTH} characters`)
      .optional()
  ),
  logo_url: z.string().url().nullable().optional(),
});

export type OrgUpdateRequest = z.infer<typeof OrgUpdateRequestSchema>;

export const OrgUpdateResponseSchema = z.object({
  ok: z.literal(true),
  organization: OrganizationSchema,
  message: z.string(),
});

export type OrgUpdateResponse = z.infer<typeof OrgUpdateResponseSchema>;

// ============================================================================
// Logo Upload URL
// ============================================================================

export const LogoUploadUrlRequestSchema = z.object({
  org_id: z.string().uuid("Invalid organization ID"),
  content_type: z.enum(ALLOWED_LOGO_TYPES, {
    errorMap: () => ({
      message: `Invalid file type. Allowed: ${ALLOWED_LOGO_TYPES.join(", ")}`,
    }),
  }),
  file_size: z
    .number()
    .int()
    .positive("File size must be positive")
    .max(MAX_LOGO_SIZE, `File too large. Maximum size is ${MAX_LOGO_SIZE / 1024 / 1024}MB`),
});

export type LogoUploadUrlRequest = z.infer<typeof LogoUploadUrlRequestSchema>;

export const LogoUploadUrlResponseSchema = z.object({
  ok: z.literal(true),
  upload_url: z.string().url(),
  token: z.string(),
  path: z.string(),
  public_url: z.string().url(),
  expires_in: z.number().int().positive(),
});

export type LogoUploadUrlResponse = z.infer<typeof LogoUploadUrlResponseSchema>;

// ============================================================================
// Error Response
// ============================================================================

export const OrgErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  field: z.string().optional(),
});

export type OrgErrorResponse = z.infer<typeof OrgErrorResponseSchema>;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Validate if a file type is allowed for logo upload
 */
export function isAllowedLogoType(mimeType: string): mimeType is AllowedLogoType {
  return ALLOWED_LOGO_TYPES.includes(mimeType as AllowedLogoType);
}

/**
 * Validate if a file size is within limits
 */
export function isValidLogoSize(size: number): boolean {
  return size > 0 && size <= MAX_LOGO_SIZE;
}

/**
 * Get file extension from content type
 */
export function getLogoExtension(contentType: AllowedLogoType): string {
  const extMap: Record<AllowedLogoType, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/svg+xml": "svg",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return extMap[contentType];
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

---

### File 2: packages/contracts/src/__tests__/organization.test.ts

**Change line 208 from:**
```typescript
for (const role of ["analyst", "manager", "vp", "owner"]) {
```

**To:**
```typescript
for (const role of ["analyst", "manager", "vp"]) {
```

---

### File 3: supabase/migrations/20260107130000_org_assets_bucket.sql

```sql
-- Migration: Create org-assets storage bucket for logos
-- Slice: 3 (Business Settings & Logo)
-- Security: Public read (for header display), VP-only upload

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'org-assets',
  'org-assets',
  true,  -- Public read for logo display in header
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS: Only VP can upload/update/delete logos
-- Path format: {org_id}/logo.{ext}

-- P1-001 FIX: Add DROP IF EXISTS for idempotency
DROP POLICY IF EXISTS "VP can upload org logos" ON storage.objects;
CREATE POLICY "VP can upload org logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'org-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT m.org_id::text
    FROM memberships m
    WHERE m.user_id = auth.uid()
      AND m.role = 'vp'
  )
);

DROP POLICY IF EXISTS "VP can update org logos" ON storage.objects;
CREATE POLICY "VP can update org logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'org-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT m.org_id::text
    FROM memberships m
    WHERE m.user_id = auth.uid()
      AND m.role = 'vp'
  )
)
WITH CHECK (
  bucket_id = 'org-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT m.org_id::text
    FROM memberships m
    WHERE m.user_id = auth.uid()
      AND m.role = 'vp'
  )
);

DROP POLICY IF EXISTS "VP can delete org logos" ON storage.objects;
CREATE POLICY "VP can delete org logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'org-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT m.org_id::text
    FROM memberships m
    WHERE m.user_id = auth.uid()
      AND m.role = 'vp'
  )
);

DROP POLICY IF EXISTS "Anyone can read org logos" ON storage.objects;
CREATE POLICY "Anyone can read org logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'org-assets');
```

---

### File 4: supabase/functions/v1-org-update/index.ts

**Change line 145 from:**
```typescript
.select("id, name, logo_url, updated_at")
```

**To:**
```typescript
.select("id, name, logo_url, created_at, updated_at")
```

---

### File 5: apps/hps-dealengine/components/AppTopNav.tsx

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Icon } from "./ui";
import { Icons } from "../lib/ui-v2-constants";
import { usePathname } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { getOrganization, OrgError } from "@/lib/orgSettings";

/**
 * Top application header:
 * - Left: organization logo (if set) or default brand logo
 * - Right: sandbox + settings entrypoints + "Analyze with AI" CTA
 *
 * Still dispatches the global "hps:analyze-now" CustomEvent so
 * existing listeners keep working.
 */
export default function AppTopNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href ||
    (pathname?.startsWith(href + "/") ?? false) ||
    (pathname?.startsWith(href + "?") ?? false);

  // Organization logo state
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState(true);
  // P1-002 FIX: Track logo load errors for fallback
  const [logoError, setLogoError] = useState(false);

  // Load organization logo on mount
  useEffect(() => {
    let isMounted = true;

    async function loadOrgLogo() {
      try {
        const supabase = getSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (isMounted) setLogoLoading(false);
          return;
        }

        // Get user's first org membership
        const { data: membership } = await supabase
          .from("memberships")
          .select("org_id")
          .eq("user_id", user.id)
          .limit(1)
          .single();

        if (!membership?.org_id) {
          if (isMounted) setLogoLoading(false);
          return;
        }

        // Fetch organization details
        const orgResponse = await getOrganization(membership.org_id);
        if (isMounted) {
          setOrgLogoUrl(orgResponse.organization.logo_url || null);
          setLogoError(false); // Reset error when URL changes
          setLogoLoading(false);
        }
      } catch (err) {
        // Silently fail - just show default logo
        if (err instanceof OrgError) {
          console.debug("[AppTopNav] Could not load org logo:", err.message);
        }
        if (isMounted) {
          setLogoLoading(false);
        }
      }
    }

    loadOrgLogo();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="flex w-full items-center justify-between gap-4 text-[color:var(--text-primary)]">
      {/* Brand logo - show org logo if available, otherwise default */}
      <div className="flex items-center">
        {logoLoading ? (
          <div className="h-[3.25rem] w-[200px] animate-pulse bg-white/5 rounded" />
        ) : orgLogoUrl && !logoError ? (
          /* eslint-disable-next-line @next/next/no-img-element -- org logo from storage */
          <img
            src={orgLogoUrl}
            alt="Organization logo"
            className="h-[3.25rem] w-auto max-w-[300px] object-contain"
            onError={() => setLogoError(true)}
          />
        ) : (
          <Image
            src="/Picsart_25-12-19_19-44-12-204.png"
            alt="HPS DealEngine logo"
            width={3464}
            height={667}
            className="h-[3.25rem] w-auto"
            priority
          />
        )}
      </div>

      {/* Right-side controls */}
      <div className="flex items-center gap-3">
        {/* Icon cluster */}
        <div className="hidden sm:flex items-center gap-2 text-[color:var(--text-secondary)]">
          <Link
            href="/sandbox"
            className={`group relative flex h-12 w-12 items-center justify-center tab-trigger ${isActive("/sandbox") ? "active" : ""}`}
            aria-label="Business Logic Sandbox"
          >
            <Icon d={Icons.sliders} size={42} className="stroke-[2.5]" />
            <span className="sr-only">Business Logic Sandbox</span>
            <span className="pointer-events-none absolute -bottom-9 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-[11px] text-white shadow-lg group-hover:block">
              Business Logic Sandbox
            </span>
          </Link>
          <Link
            href="/settings/user"
            className={`group relative flex h-12 w-12 items-center justify-center tab-trigger ${isActive("/settings") ? "active" : ""}`}
            aria-label="User & Team Settings"
          >
            <Icon d={Icons.user} size={42} className="stroke-[2.5]" />
            <span className="sr-only">User/Team Settings</span>
            <span className="pointer-events-none absolute -bottom-9 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-[11px] text-white shadow-lg group-hover:block">
              User/Team Settings
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
```

---

## VERIFICATION CHECKLIST

Run these commands after applying fixes:

```powershell
# 1. Verify no 'owner' role in contracts
Select-String -Path "packages/contracts/src/organization.ts" -Pattern '"owner"'
# Expected: 0 matches

# 2. Verify v1-org-update has created_at
Select-String -Path "supabase/functions/v1-org-update/index.ts" -Pattern "created_at"
# Expected: 1 match in select clause

# 3. Verify storage policies are idempotent
Select-String -Path "supabase/migrations/20260107130000_org_assets_bucket.sql" -Pattern "DROP POLICY IF EXISTS"
# Expected: 4 matches

# 4. Verify AppTopNav has onError handler
Select-String -Path "apps/hps-dealengine/components/AppTopNav.tsx" -Pattern "onError"
# Expected: 1 match

# 5. Run contract tests
cd packages/contracts
pnpm test src/__tests__/organization.test.ts
# Expected: All tests pass

# 6. TypeCheck
pnpm -w typecheck
# Expected: PASS

# 7. Build check
pnpm -w build
# Expected: PASS
```

---

## STAGING LOCATION FOR CLAUDE CODE

Stage this prompt at:
```
C:\Users\oziha\Documents\hps-dealengine\.claude\prompts\SLICE-3-FIX-POLISH.md
```

---

## FINAL REPORT TEMPLATE

After fixes are applied, Claude Code should produce:

```
## SLICE 3 FIX/POLISH REPORT

### P0 Fixes Applied
- [x] P0-001: Removed 'owner' from caller_role enum in organization.ts
- [x] P0-001: Updated test to only test valid roles (analyst, manager, vp)
- [x] P0-002: Added created_at to v1-org-update SELECT clause

### P1 Fixes Applied
- [x] P1-001: Added DROP POLICY IF EXISTS for all 4 storage policies
- [x] P1-002: Added logoError state and onError handler in AppTopNav

### P2 Fixes Applied (Optional)
- [ ] P2-001: Business change tracking (deferred)
- [ ] P2-002: Logo URL cache busting (deferred)

### Verification Results
- [ ] No 'owner' in contracts: 0 matches
- [ ] created_at in v1-org-update: VERIFIED
- [ ] DROP POLICY IF EXISTS: 4 matches
- [ ] onError in AppTopNav: VERIFIED
- [ ] Contract tests: XX/XX passing
- [ ] TypeCheck: PASS
- [ ] Build: PASS

### Commit Message
fix(slice-3): P0/P1 critical fixes for business settings

- Remove non-existent 'owner' role from contracts (P0-001)
- Add created_at to v1-org-update response (P0-002)
- Make storage policies idempotent (P1-001)
- Add logo error fallback in AppTopNav (P1-002)
```

---

## EXECUTION INSTRUCTIONS FOR CLAUDE CODE

1. **Read SKILLS-LIBRARY.md first** at `C:\Users\oziha\Documents\hps-dealengine\.claude\rules\SKILLS-LIBRARY.md`

2. **Apply P0 fixes (CRITICAL - do these first):**
   - Fix organization.ts line 52
   - Fix organization.test.ts line 208
   - Fix v1-org-update/index.ts line 145

3. **Apply P1 fixes:**
   - Fix 20260107130000_org_assets_bucket.sql (add 4x DROP POLICY IF EXISTS)
   - Fix AppTopNav.tsx (add logoError state + onError handler)

4. **Run verification checklist**

5. **Report final status using template above**

6. **Stage commit but DO NOT push** - await OZi review
