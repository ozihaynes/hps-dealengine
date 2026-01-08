# Settings Page Changes — Slice 5

**File:** `apps/hps-dealengine/app/(app)/settings/user/page.tsx`

## Changes Made

### 1. Page Container (Line 668)
```diff
- <div className="space-y-6">
+ <div className="space-y-6" data-testid="settings-page">
```

### 2. Profile Card (Line 818)
```diff
- <GlassCard className="p-5 space-y-4 border border-white/5 bg-surface-elevated/70">
+ <GlassCard className="p-5 space-y-4 border border-white/5 bg-surface-elevated/70" data-testid="settings-card-profile">
```

### 3. Save Profile Button (Lines 830-838)
```diff
  <Button
    size="sm"
    variant="neutral"
    onClick={onSaveProfile}
    disabled={profileSaving || !profile?.name?.trim()}
+   data-testid="save-profile-button"
  >
    {profileSaving ? "Saving..." : "Save Profile"}
  </Button>
```

### 4. Profile Name Input (Lines 862-881)
```diff
  <input
    id="profile-name"
    type="text"
    value={profile?.name || ""}
    onChange={(e) => {
      setProfile((prev) =>
        prev ? { ...prev, name: e.target.value } : null,
      );
      setProfileFieldError(null);
    }}
    className={`input-base min-h-[44px] ${
      profileFieldError
        ? "border-accent-red/50 focus:ring-accent-red/50"
        : ""
    }`}
    placeholder="Your display name"
    maxLength={100}
    disabled={profileSaving}
+   data-testid="profile-name-input"
  />
```

### 5. Business Card (Line 907)
```diff
- <GlassCard className="p-5 space-y-4 border border-white/5 bg-surface-elevated/70">
+ <GlassCard className="p-5 space-y-4 border border-white/5 bg-surface-elevated/70" data-testid="settings-card-business">
```

### 6. Team Card (Line 1023)
```diff
- <GlassCard className="p-5 space-y-4 border border-white/5 bg-surface-elevated/70">
+ <GlassCard className="p-5 space-y-4 border border-white/5 bg-surface-elevated/70" data-testid="settings-card-team">
```

## Summary

Added 6 `data-testid` attributes for E2E testing:
- `settings-page` — Page container
- `settings-card-profile` — Profile settings card
- `save-profile-button` — Save profile button
- `profile-name-input` — Profile name input field
- `settings-card-business` — Business settings card
- `settings-card-team` — Team access card
