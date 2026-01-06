# Slice 12: Field Mode View (Mobile) — Integration Guide

## 📁 Files Created

```
slice12/
├── app/(app)/deals/[id]/field/
│   ├── page.tsx              # Route entry point
│   ├── loading.tsx           # Suspense fallback skeleton
│   └── error.tsx             # Error boundary with recovery
│
├── components/field/
│   ├── FieldModeView.tsx     # Main container (composes all)
│   ├── FieldVerdictHero.tsx  # Verdict display with theming
│   ├── FieldPriceGeometry.tsx # 2x2 ZOPA/MAO/Floor grid
│   ├── FieldRiskSummary.tsx  # Top 3 risks with status
│   ├── FieldNetClearance.tsx # Horizontal exit strategy scroll
│   ├── FieldModeSkeleton.tsx # Loading skeleton
│   ├── index.ts              # Barrel export
│   └── field.test.tsx        # Component tests (40+ assertions)
│
└── lib/hooks/
    └── useFieldModeData.ts   # Data fetching/derivation hook
```

## 🎯 Integration Steps

### Step 1: Copy files to your repo

```powershell
# From project root
Copy-Item -Recurse "/home/claude/slice12/components/field" "apps/hps-dealengine/components/"
Copy-Item "/home/claude/slice12/lib/hooks/useFieldModeData.ts" "apps/hps-dealengine/lib/hooks/"
Copy-Item -Recurse "/home/claude/slice12/app/(app)/deals" "apps/hps-dealengine/app/(app)/"
```

### Step 2: Verify TypeScript

```powershell
pnpm -w typecheck
```

### Step 3: Run tests

```powershell
pnpm -w test -- components/field
```

### Step 4: Manual smoke test

1. Navigate to any deal: `/overview?dealId=<your-deal-id>`
2. Append `/field` to URL: `/deals/<deal-id>/field`
3. Verify:
   - [ ] Verdict displays correctly (PURSUE/NEEDS/PASS)
   - [ ] Price geometry shows ZOPA, MAO, Floor, Spread
   - [ ] Top 3 risks visible (or "All gates pass")
   - [ ] Exit strategy cards scroll horizontally
   - [ ] "View Full Dashboard" navigates back
   - [ ] All touch targets ≥ 48px
   - [ ] Loading skeleton appears on refresh

## 🔍 Principles Applied (101/100 Checklist)

| Principle | How Applied | Verified |
|-----------|-------------|----------|
| **Hick's Law** | Only 4 data zones | ☐ |
| **Miller's Law (7±2)** | Max 6-7 items visible | ☐ |
| **Fitts's Law** | All touch targets ≥ 48px | ☐ |
| **Gestalt (Proximity)** | Related metrics grouped in cards | ☐ |
| **Gestalt (Figure-Ground)** | Verdict has highest contrast | ☐ |
| **WCAG AA** | Contrast ≥ 4.5:1, touch ≥ 44px | ☐ |
| **Peak-End Rule** | Verdict is the "peak" moment | ☐ |
| **Progressive Disclosure** | Summary only; tap for full | ☐ |
| **Color Psychology** | Emerald=go, Amber=caution, Zinc=stop | ☐ |
| **prefers-reduced-motion** | Disables pulse/shimmer | ☐ |

## ⚠️ Edge Cases Handled

| Edge Case | Handling |
|-----------|----------|
| `NaN` in currency | Shows `—` |
| `Infinity` in currency | Shows `—` |
| `null` net clearance | Hides section |
| Empty exits array | Shows "No exit strategies" |
| All gates pass | Shows "All gates pass" ✅ |
| No analysis run | Shows empty state with CTA |
| Error loading | Shows retry + go back |

## 🧪 Test Coverage (40+ assertions)

- FieldVerdictHero: PURSUE/NEEDS/PASS theming, ARIA, null handling
- FieldPriceGeometry: 2x2 grid, no ZOPA state, null values
- FieldRiskSummary: Blocking/fail/warning, all-pass, empty state
- FieldNetClearance: Recommended star, negative values, empty state
- FieldModeSkeleton: Layout structure matching
- Touch Target Audit: 48px minimum heights
- Edge Cases: NaN, Infinity, empty strings, large numbers

## 📱 Mobile Viewport Layout

```
┌─────────────────────────────────────┐
│  ← Back         Field Mode      ⋮  │  48px header
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │       ██ PURSUE ✓ ██        │   │  ① VERDICT HERO
│  │      $18.5K net via DC      │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌──────────┐  ┌──────────┐       │
│  │ ZOPA $42K│  │Spread 14%│       │  ② PRICE GEOMETRY
│  └──────────┘  └──────────┘       │
│  ┌──────────┐  ┌──────────┐       │
│  │ MAO $185K│  │Floor $178K│      │
│  └──────────┘  └──────────┘       │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ TOP RISKS (3/8)             │   │  ③ RISK SUMMARY
│  │ ⚠ Open Permit (BLOCKING)    │   │
│  │ ⚠ No Title Commitment       │   │
│  │ ○ Evidence Stale            │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ NET BY EXIT → scroll        │   │  ④ NET CLEARANCE
│  │ [DC $18.5K][Assign $12K]... │   │
│  └─────────────────────────────┘   │
│                                     │
│  [ View Full Dashboard ]           │  ⑤ CTA (48px)
│                                     │
└─────────────────────────────────────┘
```

## ✅ Definition of Done

- [ ] Route `/deals/[id]/field` renders on mobile
- [ ] All 4 data zones visible without scroll
- [ ] All touch targets ≥ 48px
- [ ] Loading skeleton matches layout
- [ ] Error state shows retry CTA
- [ ] `pnpm -w typecheck` PASS
- [ ] `pnpm -w test` PASS
- [ ] Manual mobile viewport test
- [ ] Accessibility audit (keyboard, ARIA, contrast)

---

## Next Action

After integration and verification:

1. **pnpm -w typecheck** — Confirm no TS errors
2. **pnpm -w test** — Confirm tests pass
3. **pnpm -w build** — Confirm build succeeds
4. **Manual test** on mobile viewport

Then update:
- `docs/roadmap-v1-v2-v3.md` — Mark Slice 12 ✅
- `docs/devlog-hps-dealengine.md` — Add dated entry
