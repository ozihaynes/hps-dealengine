# SLICE 24 DESIGN SYSTEM AUDIT PACKAGE

**Generated:** 2026-01-05
**Purpose:** Complete design system discovery for Apple Liquid Glass implementation
**Status:** READY FOR ARCHITECTURAL REVIEW

---

## EXECUTIVE SUMMARY

| Metric | Count |
|--------|-------|
| **Total Component Files** | 177 |
| **Zinc Usages (to migrate)** | ~750 instances |
| **Slate Usages (current)** | ~440 instances |
| **Components WITH backdrop-blur** | 27 files |
| **Components WITHOUT backdrop-blur** | ~150 files |
| **White Border Usages** | 184 instances |
| **Framer Motion Files** | 36 files |
| **Hover States** | 189 instances |
| **Focus States** | 62 instances |

### Migration Scope Estimate
- **HIGH PRIORITY:** Dashboard components using zinc colors
- **MEDIUM PRIORITY:** Components needing backdrop-blur
- **LOW PRIORITY:** Spacing/typography normalization

---

## SECTION 1: COMPONENT INVENTORY

### Largest Components (by lines)
```
1486 apps/hps-dealengine/components/underwrite/UnderwriteTab.tsx
1019 apps/hps-dealengine/components/sandbox/BusinessLogicSandbox.tsx
862 apps/hps-dealengine/components/ui.tsx
806 apps/hps-dealengine/components/dashboard/comps/CompsEvidencePack.tsx
766 apps/hps-dealengine/components/repairs/RepairsTab.tsx
715 apps/hps-dealengine/components/dashboard/evidence/CompsEvidencePack.tsx
688 apps/hps-dealengine/components/dashboard/trading/TradingStrip.tsx
682 apps/hps-dealengine/components/v25/V25Dashboard.tsx
613 apps/hps-dealengine/components/underwrite/DoubleCloseCalculator.tsx
599 apps/hps-dealengine/components/sandbox/RepairsSandbox.tsx
592 apps/hps-dealengine/components/intake/IntakeForm.tsx
552 apps/hps-dealengine/components/empty/ErrorState.tsx
548 apps/hps-dealengine/components/dashboard/arv/ArvBandWidget.tsx
546 apps/hps-dealengine/components/dashboard/evidence/EvidenceHealthStrip.tsx
516 apps/hps-dealengine/components/loading/DashboardSkeleton.tsx
501 apps/hps-dealengine/components/offerChecklist/OfferChecklistPanel.tsx
494 apps/hps-dealengine/components/dashboard/risk/RiskGatesStrip.tsx
489 apps/hps-dealengine/components/command-center/ExceptionsStack.tsx
487 apps/hps-dealengine/components/dashboard/hero/KeyMetricsTrio.tsx
462 apps/hps-dealengine/components/dashboard/pricing/PriceGeometryBar.tsx
```

### Component Directory Structure
```
apps/hps-dealengine/components/
├── ai/                    # AI-related components
├── animations/            # Animation primitives
├── auth/                  # Authentication UI
├── command-center/        # Command center panels
├── dashboard/             # V2.5 Dashboard components
│   ├── arv/              # ARV band widgets
│   ├── comps/            # Comps evidence
│   ├── confidence/       # Confidence indicators
│   ├── drawer/           # Detail drawer
│   ├── evidence/         # Evidence health
│   ├── hero/             # Decision hero zone
│   ├── liquidity/        # Liquidity cards
│   ├── market/           # Market velocity
│   ├── pricing/          # Price geometry
│   ├── risk/             # Risk gates
│   ├── status/           # Status cards
│   ├── trading/          # Trading strip
│   ├── validation/       # Comp quality
│   └── verdict/          # Verdict components
├── dealflowGuide/         # Deal flow guide
├── deals/                 # Deal list/cards
├── empty/                 # Empty/error states
├── field/                 # Field mode components
├── import/                # Bulk import wizard
├── intake/                # Client intake forms
├── loading/               # Skeleton loaders
├── offers/                # Offer components
├── overview/              # Overview tab
├── providers/             # React providers
├── repairs/               # Repairs components
├── sandbox/               # Test sandbox
├── settings/              # Settings UI
├── shared/                # Shared components
├── theme/                 # Theme provider
├── trace/                 # Trace viewer
├── ui/                    # UI primitives
├── underwrite/            # Underwriting tab
└── v25/                   # V2.5 dashboard
```

---

## SECTION 2: COLOR AUDIT

### Zinc Usage (MUST MIGRATE TO SLATE)
**Total zinc instances: ~750**

#### Files with Most Zinc Usage (sorted by count)
```
apps/hps-dealengine/components/dashboard/comps/CompsEvidencePack.tsx:42
apps/hps-dealengine/components/v25/V25Dashboard.tsx:29
apps/hps-dealengine/components/dashboard/trading/TradingStrip.tsx:28
apps/hps-dealengine/components/dashboard/liquidity/LiquidityBuyerFitCard.tsx:27
apps/hps-dealengine/components/dashboard/evidence/EvidenceHealthStrip.tsx:25
apps/hps-dealengine/components/dashboard/arv/ArvBandWidget.tsx:25
apps/hps-dealengine/components/dashboard/risk/RiskGatesStrip.tsx:24
apps/hps-dealengine/components/empty/ErrorState.tsx:17
apps/hps-dealengine/components/dashboard/status/EvidenceStatusCard.tsx:17
apps/hps-dealengine/components/dashboard/hero/DecisionHero.tsx:17
apps/hps-dealengine/components/empty/EmptyState.tsx:16
apps/hps-dealengine/components/deals/DealCard.tsx:16
apps/hps-dealengine/components/dashboard/market/MarketVelocityPanel.tsx:16
apps/hps-dealengine/components/dashboard/confidence/cards/MarketVelocityContent.tsx:14
apps/hps-dealengine/components/dashboard/pricing/PriceGeometryBar.tsx:13
```

#### Zinc Pattern Distribution
```
    139 zinc-500
     88 zinc-700
     87 zinc-400
     70 zinc-300
     68 zinc-800/50
     63 zinc-700/50
     32 zinc-600
     28 zinc-100
     20 zinc-800
     14 zinc-500/20
     11 zinc-900
     10 zinc-700/30
     10 zinc-200
      9 zinc-500/40
      7 zinc-900/80
      7 zinc-800/30
      6 zinc-900/50
```

### Slate Usage (Target Color)
**Total slate instances: ~440**

#### Slate Pattern Distribution
```
     99 slate-400
     59 slate-500
     57 slate-700
     50 slate-300
     50 slate-
     21 slate-700/50
     20 slate-600
     18 slate-800/50
     18 slate-800
     15 slate-200
     13 slate-800/30
      8 slate-900/50
```

### Semantic Color Usage

#### Emerald (GO/Positive) - ~320 instances
```
    106 emerald-400      (primary text color for GO)
     44 emerald-500/20   (background tint)
     32 emerald-500/30   (border)
     29 emerald-500      (solid color)
     25 emerald-500/10   (subtle background)
     16 emerald-500/40   (border strong)
     11 emerald-200
     10 emerald-600
```

#### Amber (CAUTION/Review) - ~290 instances
```
     81 amber-400        (primary text color)
     35 amber-500/20     (background tint)
     32 amber-500        (solid)
     26 amber-500/30     (border)
     25 amber-500/10     (subtle)
     16 amber-200
     14 amber-500/40     (border strong)
     14 amber-100
     10 amber-400/40
```

#### Red (STOP/Critical) - ~370 instances
```
    123 red-400          (primary text color)
     47 red-500/20       (background tint)
     36 red-500/10       (subtle)
     35 red-500/30       (border)
     22 red-500          (solid)
     17 red-500/40       (border strong)
     12 red-300
```

### Potentially Problematic Colors
- **blue-**: ~50 instances (review if needed beyond links)
- **gray-**: ~10 instances (should be slate or zinc)
- **purple-**: ~6 instances (special cases only)

---

## SECTION 3: GLASS EFFECTS AUDIT

### Components WITH Backdrop Blur (27 files)
```
apps/hps-dealengine/components/dashboard/confidence/ConfidenceCard.tsx
apps/hps-dealengine/components/dashboard/drawer/DetailDrawer.tsx
apps/hps-dealengine/components/dashboard/drawer/DrawerHeader.tsx
apps/hps-dealengine/components/dashboard/hero/DecisionHero.tsx
apps/hps-dealengine/components/dashboard/pricing/NetClearancePanel.tsx
apps/hps-dealengine/components/dashboard/status/EvidenceStatusCard.tsx
apps/hps-dealengine/components/dashboard/status/RiskStatusCard.tsx
apps/hps-dealengine/components/dashboard/trading/TradingStrip.tsx
apps/hps-dealengine/components/dealflowGuide/DealFlowGuideSheet.tsx
apps/hps-dealengine/components/deals/DealCard.tsx
apps/hps-dealengine/components/deals/DealsTable.tsx
apps/hps-dealengine/components/field/FieldModeView.tsx
apps/hps-dealengine/components/field/FieldNetClearance.tsx
apps/hps-dealengine/components/field/FieldPriceGeometry.tsx
apps/hps-dealengine/components/field/FieldRiskSummary.tsx
apps/hps-dealengine/components/field/FieldVerdictHero.tsx
apps/hps-dealengine/components/import/LoadingOverlay.tsx
apps/hps-dealengine/components/import/PromoteModal.tsx
apps/hps-dealengine/components/intake/PopulateSubmissionModal.tsx
apps/hps-dealengine/components/intake/RejectSubmissionModal.tsx
apps/hps-dealengine/components/intake/RequestRevisionModal.tsx
apps/hps-dealengine/components/overview/DealStructureChart.tsx
apps/hps-dealengine/components/sandbox/BusinessLogicSandbox.tsx
apps/hps-dealengine/components/shared/MobileBottomNav.tsx
apps/hps-dealengine/components/ui/AddressAutocomplete.tsx
apps/hps-dealengine/components/ui.tsx
apps/hps-dealengine/components/v25/V25Dashboard.tsx
```

### Backdrop Blur Intensity Distribution
```
     24 backdrop-blur-sm   (4px)
      2 backdrop-blur-md   (12px)
      1 backdrop-blur-xl   (24px)
      1 backdrop-blur-lg   (16px)
```

**FINDING:** Most components use `backdrop-blur-sm` (4px). For Apple Liquid Glass effect, should standardize to stronger blur values.

### Components WITHOUT Backdrop Blur (~150 files)
These components need glass effect addition for visual consistency:
- Most dashboard/* components
- All loading/* components
- Most deals/* components
- Most empty/* components

---

## SECTION 4: BORDER AUDIT

### Border Color Distribution
```
     58 border-zinc-700
     43 border-zinc-700/50
     32 border-red-500/30
     29 border-emerald-500/30
     26 border-slate-700
     26 border-amber-500/30
     17 border-red-500/40
     16 border-accent-
     15 border-emerald-500/40
     14 border-slate-700/50
     14 border-amber-500/40
     11 border-slate-600
     10 border-amber-400/40
      9 border-zinc-600
      9 border-zinc-500/40
```

### White/Light Borders (Glass Style)
```
    114 border-white/10   (most common glass border)
     53 border-white/5    (subtle)
      5 border-white/20   (strong)
      5 border-white/15
      4 border-white      (solid - avoid)
      2 border-white/40
```

**FINDING:** White borders with opacity (border-white/10) are the correct glass morphism pattern. Should increase usage.

### Border Radius Distribution
```
    300 rounded-lg       (8px - most common)
    179 rounded-full     (pill shapes)
    100 rounded-md       (6px)
     69 rounded-xl       (12px)
     11 rounded-2xl      (16px)
```

**FINDING:** `rounded-lg` dominates. Consider standardizing to `rounded-xl` or `rounded-2xl` for softer Apple-like appearance.

---

## SECTION 5: SHADOW AUDIT

### Shadow Usage Distribution
```
     23 shadow-lg        (large elevation)
     23 shadow-          (base shadow)
     11 shadow-xl        (extra large)
      7 shadow-2xl       (massive)
      6 shadow-emerald   (semantic glow)
      5 shadow-sm        (subtle)
      4 shadow-black     (hard shadow)
      3 shadow-inner     (inset)
      3 shadow-blue
      3 shadow-amber
      3 shadow-accent
      2 shadow-md
```

**FINDING:** Lacks consistent "glass glow" shadows. Apple Liquid Glass needs subtle luminosity shadows.

---

## SECTION 6: TYPOGRAPHY AUDIT

### Text Size Distribution
```
    482 text-sm          (14px - dominant)
    422 text-xs          (12px - labels)
     77 text-lg          (18px - section headers)
     46 text-2xl         (24px - hero numbers)
     33 text-base        (16px - body)
     25 text-xl          (20px)
     15 text-3xl         (30px - large hero)
      6 text-4xl         (36px)
      4 text-5xl         (48px)
```

### Font Weight Distribution
```
    332 font-medium      (500 - default)
    199 font-semibold    (600 - emphasis)
     84 font-bold        (700 - strong)
     55 font-mono        (monospace - data)
      4 font-extrabold   (800 - hero)
      4 font-display     (display font family)
      3 font-normal      (400)
```

**FINDING:** Typography is well-structured with proper hierarchy. Font-medium/semibold dominates as expected.

---

## SECTION 7: SPACING AUDIT

### Padding Distribution
```
    309 p-3              (12px - compact cards)
    288 p-2              (8px - tight)
    225 p-4              (16px - standard)
    123 p-1              (4px - minimal)
    108 p-               (responsive padding)
     69 p-6              (24px - generous)
     36 p-5              (20px)
     19 p-0              (no padding)
     17 p-8              (32px - spacious)
```

### Gap Distribution
```
    243 gap-2            (8px - tight)
    168 gap-3            (12px - compact)
     94 gap-1            (4px - minimal)
     71 gap-4            (16px - standard)
     18 gap-6            (24px - generous)
```

**FINDING:** Spacing is consistent with 4px grid. Most common: p-3/p-4 for cards, gap-2/gap-3 for layouts.

---

## SECTION 8: ANIMATION AUDIT

### Transition Usage
```
    105 transition-colors   (color changes only)
     50 transition-all      (all properties)
     13 transition-transform (transform only)
      8 transition-none     (no transition)
      5 transition-shadow   (shadow only)
      2 transition-opacity  (opacity only)
```

### Duration Usage
```
     30 duration-300   (standard)
     19 duration-150   (fast)
     14 duration-200   (normal)
     11 duration-      (responsive)
      5 duration-700   (slow)
      2 duration-500   (deliberate)
```

### Framer Motion Usage
**36 files** use framer-motion for advanced animations:
- Hero reveal animations
- Card stagger animations
- Drawer slide transitions
- Loading state animations

---

## SECTION 9: EXISTING DESIGN TOKENS

### colors.ts Summary
Located: `apps/hps-dealengine/lib/design-tokens/colors.ts`

**Verdict Colors:**
- GO: `#10B981` (emerald-500)
- CAUTION: `#F59E0B` (amber-500)
- HOLD: `#6366F1` (indigo-500)
- PASS: `#64748B` (slate-500)

**Urgency Colors:**
- Emergency: `#DC2626` (red-600)
- Critical: `#EA580C` (orange-600)
- Active: `#0EA5E9` (sky-500)
- Steady: `#22C55E` (green-500)

**Semantic Classes (for dark dashboard):**
```typescript
go: {
  text: 'text-emerald-400',
  bg: 'bg-emerald-500/20',
  border: 'border-emerald-500/40',
  solid: 'bg-emerald-500',
},
caution: {
  text: 'text-amber-400',
  bg: 'bg-amber-500/20',
  border: 'border-amber-500/40',
  solid: 'bg-amber-500',
},
stop: {
  text: 'text-red-400',
  bg: 'bg-red-500/20',
  border: 'border-red-500/40',
  solid: 'bg-red-500',
},
```

**BANNED PATTERNS:**
```typescript
const BANNED_PATTERNS = [
  'bg-gradient-to-r',
  'bg-gradient-to-l',
  'bg-gradient-to-t',
  'bg-gradient-to-b',
  'from-',
  'via-',
  'to-',
  'bg-clip-text',
  'text-transparent',
];
```

### motion.ts Summary
Located: `apps/hps-dealengine/lib/design-tokens/motion.ts`

**Durations:**
- instant: 0ms
- fast: 100ms
- normal: 200ms
- slow: 300ms
- slower: 400ms
- countUp: 800ms

**Easings:**
- default: `cubic-bezier(0.4, 0, 0.2, 1)`
- easeOut: `cubic-bezier(0, 0, 0.2, 1)`
- smooth: `cubic-bezier(0.16, 1, 0.3, 1)`
- bounce: `cubic-bezier(0.34, 1.56, 0.64, 1)`

---

## SECTION 10: CARD CONTAINER PATTERNS

### Current Card Pattern (Most Common)
```tsx
className={cn(
  "rounded-lg border border-zinc-700 bg-zinc-800/50",
  "p-4"
)}
```

### Glass Card Pattern (Target)
```tsx
className={cn(
  "rounded-xl border border-white/10",
  "bg-slate-800/60 backdrop-blur-xl",
  "shadow-lg shadow-black/10",
  "p-4"
)}
```

### DecisionHero Pattern (Reference)
```tsx
className={cn(
  "relative rounded-2xl border overflow-hidden",
  "backdrop-blur-sm transition-colors duration-300",
  theme.borderColor,  // e.g., border-emerald-500/40
  theme.bgColor,      // e.g., bg-zinc-900/95
  theme.shadow,       // e.g., shadow-[0_0_60px_-15px_rgba(16,185,129,0.4)]
)}
```

---

## SECTION 11: INTERACTIVE STATES AUDIT

### Hover State Patterns
**189 hover: instances found**

Common patterns:
```
hover:bg-zinc-700/50      (card hover)
hover:border-zinc-600     (border hover)
hover:text-white          (text hover)
hover:scale-[1.01]        (subtle grow)
hover:ring-2              (focus ring)
```

### Focus State Patterns
**62 focus: instances found**

Common patterns:
```
focus:ring-2              (ring indicator)
focus:ring-blue-500/50    (accent ring)
focus:outline-none        (remove default)
focus:ring-inset          (inset ring)
```

**FINDING:** Focus states need standardization for accessibility.

---

## SECTION 12: TAILWIND CONFIGURATION

### Custom Theme Extensions (tailwind.config.ts)

**Colors:**
- verdict.go/caution/hold/pass
- urgency.emergency/critical/active/steady
- signal.critical/warning/info
- surface.base/raised/overlay/sunken
- text.primary/secondary/tertiary/muted
- border.subtle/DEFAULT/strong/focus
- brand.primary

**Typography:**
- fontFamily: sans (Inter), display (DM Sans), mono
- fontSize: xs → 3xl with line-height/letter-spacing

**Shadows:**
- xs → 2xl scale
- glow-go/caution/hold/pass (verdict glows)

**Transitions:**
- duration: instant/fast/normal/slow/slower/slowest
- easing: default/in/out/smooth/bounce

**Z-Index Scale:**
- base → tooltip (10 levels)

---

## SECTION 13: GLOBALS.CSS ANALYSIS

### Theme System (6 themes)
1. **navy** (default) - Deep ocean blue
2. **burgundy** - Deep wine red
3. **green** - Forest pine
4. **black** - True OLED black
5. **violet** - Deep amethyst
6. **pink** - Sophisticated rose

### CSS Custom Properties
```css
--bg-primary: #020617;
--glass-bg: rgba(0, 15, 34, 0.55);
--glass-border: rgba(0, 150, 255, 0.18);
--blur-depth-1: 10px;
--blur-depth-2: 16px;
--blur-depth-3: 24px;
--blur-depth-4: 32px;
```

### Existing Glass Classes
```css
.glass-card {
  background-color: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(16px) saturate(140%);
}

.glass-surface-2 {
  background: var(--surface-2);
  backdrop-filter: blur(12px) saturate(120%);
}
```

---

## SECTION 14: CRITICAL FINDINGS & RECOMMENDATIONS

### 1. Color Migration Required
| From | To | Count |
|------|-----|-------|
| zinc-* | slate-* | ~750 instances |
| zinc-700 border | slate-700/50 or white/10 | 101 instances |
| zinc-800/50 bg | slate-800/60 bg | 68 instances |
| zinc-900/95 | slate-900/90 | Various |

### 2. Glass Effect Gaps
- **27 components** have backdrop-blur
- **~150 components** need backdrop-blur addition
- Current blur mostly `backdrop-blur-sm` (4px) - too subtle
- Recommend: `backdrop-blur-xl` (24px) for stronger glass effect

### 3. Border Radius Inconsistency
- 300 `rounded-lg` vs 69 `rounded-xl`
- Apple aesthetic prefers softer corners
- Recommend: Standardize to `rounded-xl` or `rounded-2xl`

### 4. Shadow Luminosity Missing
- No "inner glow" shadows for glass
- Need: `shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]` for top highlight
- Need: Verdict-based glow shadows standardized

### 5. White Border Adoption
- 184 `border-white/*` instances (good)
- Need more components using `border-white/10` pattern
- Currently most use `border-zinc-700` (solid, not glass)

---

## SECTION 15: APPLE LIQUID GLASS IMPLEMENTATION TARGETS

### Target Glass Card Pattern
```tsx
// Standard Glass Card
className={cn(
  "rounded-2xl",                           // Softer corners
  "border border-white/10",                // Glass border
  "bg-slate-900/60",                       // 60% opacity background
  "backdrop-blur-xl saturate-150",         // Strong blur + saturation
  "shadow-lg shadow-black/20",             // Depth shadow
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]", // Inner highlight
  "transition-all duration-200",           // Smooth transitions
)}
```

### Target Verdict Glass Pattern
```tsx
// GO verdict
className={cn(
  "rounded-2xl border border-emerald-500/30",
  "bg-slate-900/70 backdrop-blur-xl",
  "shadow-[0_0_40px_-10px_rgba(16,185,129,0.4)]", // Emerald glow
  "shadow-[inset_0_1px_0_rgba(16,185,129,0.15)]", // Inner emerald highlight
)}
```

### Priority Migration Order
1. **DecisionHero** - Already has good patterns, needs polish
2. **Dashboard cards** (ConfidenceCard, StatusCards, etc.)
3. **DealCard** - High visibility
4. **Drawer components** - Already has blur
5. **Empty/Loading states**
6. **All remaining components**

---

## NEXT STEPS

1. **Principal Architect Review** - Review this audit package
2. **Apple Liquid Glass Research** - Study WWDC 2025 glass design
3. **Token System Design** - Create `glass.ts` design tokens
4. **Implementation Plan** - Phase 2 execution plan with file-by-file migration
5. **Component Library** - Create `GlassCard`, `GlassButton`, etc. primitives
6. **Testing** - Visual regression testing for each component

---

**AUDIT COMPLETE**

Upload this file for Principal Architect review. Ready for Phase 2 implementation planning.
