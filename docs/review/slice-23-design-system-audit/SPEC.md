# SLICE 23: Design System Audit & Polish — Original Specification

## 101/100 FINAL - Bloomberg Terminal Meets Apple Design

---

## Objective

Perform a comprehensive design system audit to ensure visual consistency across all dashboard components. Remove gradients from progress bars, fix badge color logic, unify exit strategy cards, and establish semantic color guidelines.

---

## Core Requirements

### 1. Remove ALL Gradients from Progress Bars

**Rule:** Progress bars must use SOLID colors only. No `bg-gradient-to-*` patterns.

**Rationale:** Gradients on progress bars create a "playful" appearance inappropriate for professional financial decision-making tools. Bloomberg terminals use solid, confident colors.

**Color Logic (Threshold-Based):**
- 0-40%: `bg-red-500` (danger)
- 41-70%: `bg-amber-500` (warning)
- 71-100%: `bg-emerald-500` (good)

**Files to Check:**
- `ArvBandWidget.tsx`
- `ArvConfidenceContent.tsx`
- `CompQualityCard.tsx`
- `EvidenceHealthContent.tsx`
- Any other progress/gauge components

---

### 2. Fix Badge Color Logic

**Problem:** HIGH ARV confidence was showing as red (bad) when it should be emerald (good).

**Rule:** Context-aware coloring:
- **HIGH is GOOD for:** ARV, LIQUIDITY, CONFIDENCE, COMP_QUALITY, NET_PROFIT
- **LOW is GOOD for:** DOM, RISK_SCORE, VACANCY

**Solution:** Implement `BADGE_LOGIC` in design tokens:
```typescript
export const BADGE_LOGIC = {
  highIsGood: ['ARV', 'LIQUIDITY', 'CONFIDENCE', 'COMP_QUALITY', 'NET_PROFIT'],
  lowIsGood: ['DOM', 'RISK_SCORE', 'VACANCY'],
  getColor: (metric, value) => { /* context-aware color */ }
};
```

---

### 3. Unify Exit Strategy Card Styling

**Problem:** Exit cards (Assignment/Double Close/Wholetail) had different colored backgrounds creating visual noise.

**Solution:** Unified GLASS styling for all cards:
```typescript
const EXIT_CARD_STYLES = {
  default: {
    border: "border-slate-700/50",
    bg: "bg-slate-800/60",
    text: "text-slate-200",
  },
  recommended: {
    border: "border-emerald-500/40",
    bg: "bg-slate-800/60",  // Same glass background
    text: "text-slate-200",
  },
};
```

Only the "BEST" badge uses emerald color. Card headers are neutral.

---

### 4. Semantic Color System

**The Four Colors:**

| Color | Tailwind | Meaning | Use Cases |
|-------|----------|---------|-----------|
| **Emerald** | `emerald-400/500` | GO / Positive | High confidence, good scores, best exit |
| **Amber** | `amber-400/500` | CAUTION / Review | Medium values, transitional states |
| **Red** | `red-400/500` | STOP / Negative | Low scores, warnings, costs |
| **Slate** | `slate-300/400/500` | NEUTRAL / Info | Balanced states, method badges |

**BANNED for Semantic Use:**
- ❌ `blue-*` — Reserved for links/navigation only
- ❌ `cyan-*` — Too playful
- ❌ `purple-*` — Not in semantic system

---

### 5. Files to Update

1. **Design Tokens** (`lib/design-tokens/colors.ts`)
   - Add `BADGE_LOGIC`
   - Add `semanticClasses`
   - Add `progressTokens`
   - Add `BANNED_PATTERNS`

2. **ARV Components**
   - `ArvBandWidget.tsx` — Remove gradient
   - `ArvConfidenceContent.tsx` — Remove gradient

3. **Exit Strategy**
   - `NetClearancePanel.tsx` — Unified glass styling

4. **Quality Components**
   - `CompQualityCard.tsx` — Blue → Emerald for "good"
   - `CompQualityContent.tsx` — Blue → Emerald

5. **Market Components**
   - `ConfidenceBar.tsx` — Fix band colors
   - `MarketVelocityContent.tsx` — Fix band colors

---

## Acceptance Criteria

- [ ] No `bg-gradient-to-*` patterns in dashboard progress bars
- [ ] BADGE_LOGIC implemented for context-aware colors
- [ ] Exit cards use unified glass styling
- [ ] No blue/cyan for semantic decision signals
- [ ] TypeScript passes (`pnpm -w typecheck`)
- [ ] Build succeeds (`pnpm -w build`)
- [ ] Visual audit confirms consistent appearance

---

## Design Philosophy

> **"Bloomberg Terminal meets Apple design"**

- **Professional:** No playful colors or gradients
- **Clear:** Semantic colors with consistent meaning
- **Confident:** Solid fills, not gradients
- **Elegant:** Glass morphism for containers, semantic colors for data

---

## Notes

- Decorative glow effects (like in DecisionHero.tsx) are acceptable
- Progress bars specifically must be solid colors
- Links and navigational elements can still use blue
- The goal is a unified, professional appearance worthy of financial decision-making
