# Component Scorecard

**Audit Date:** 2026-01-09
**Components Audited:** 18
**Scoring Scale:** 1 (Poor) to 5 (Excellent)

---

## Tier 1 — Hero Components

### BiddingCockpit.tsx (230 lines)
**Primary Purpose:** Main container orchestrating EstimateSummaryCard, RepairVelocityCard, GCEstimatesPanel, and EnhancedBreakdownPanel

#### Visual Hierarchy
- **Score:** 4/5
- **Primary element:** EstimateSummaryCard with budget hero
- **Secondary elements:** VelocityCard + GCEstimatesPanel
- **CTA placement:** Actions in header (Request Estimate, Manual Upload)
- **Issues:** CTAs could be more prominent; considers rendering EmptyCockpit or SkeletonCockpit based on state

#### Color & Contrast
- **Score:** 4/5
- **Background:** Uses token `space-y-6` container
- **Text colors:** Inherits from child components
- **Issues:** No container background definition - relies on page bg

#### Spacing & Layout
- **Score:** 5/5
- **Grid compliance:** Uses responsive `grid grid-cols-1 md:grid-cols-2 gap-6`
- **Padding pattern:** Consistent `space-y-6` vertical rhythm
- **Issues:** None - clean grid layout

#### Typography
- **Score:** 4/5
- **Heading sizes:** Delegates to child components
- **Issues:** No section heading - relies on children

#### Animation & Motion
- **Score:** 3/5
- **Entry animations:** None at container level
- **Issues:** Missing container-level enter animation; children animate independently

#### Accessibility
- **Score:** 4/5
- **ARIA labels:** Proper role handling via children
- **Keyboard nav:** Delegated to children
- **Issues:** Missing `aria-busy` during loading

#### Responsive
- **Score:** 5/5
- **Mobile layout:** Single column stacking
- **Breakpoints used:** md, lg
- **Issues:** None

#### States Completeness
- [x] Default
- [x] Loading (SkeletonCockpit)
- [x] Empty (EmptyCockpit)
- [ ] Error (Missing - shows default)
- [ ] Hover (N/A - container)
- [ ] Focus (N/A)
- [ ] Disabled (N/A)
- [ ] Success (N/A)

#### Code Quality
- **Tailwind usage:** Consistent
- **Token usage:** Uses space-y-6 (16px gaps)
- **Hardcoded values:** None
- **className organization:** Clean template literals

### **AVERAGE SCORE: 4.1/5**

---

### EstimateSummaryCard.tsx (202 lines)
**Primary Purpose:** Hero display of budget with base estimate, contingency breakdown, and total

#### Visual Hierarchy
- **Score:** 4/5
- **Primary element:** Total budget (emerald-400, font-bold, text-2xl)
- **Secondary elements:** Base estimate + contingency
- **Issues:** Total could be even more prominent (larger, glow effect)

#### Color & Contrast
- **Score:** 5/5
- **Background:** `bg-slate-900/80 backdrop-blur-sm border-slate-800`
- **Text colors:** emerald-400 (total), amber-400 (contingency), slate-200/300/400 (hierarchy)
- **Issues:** None - excellent color coding

#### Spacing & Layout
- **Score:** 5/5
- **Grid compliance:** 8pt grid compliant (p-6, gap-3, space-y-3)
- **Padding pattern:** Consistent p-6
- **Issues:** None

#### Typography
- **Score:** 5/5
- **Heading sizes:** text-sm (title), text-sm (secondary), text-2xl (hero)
- **Uses:** `tabular-nums` for financial figures
- **Issues:** None

#### Animation & Motion
- **Score:** 4/5
- **Entry animations:** `initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}`
- **Hover states:** Card hover effect
- **Issues:** No pulse effect on total update

#### Accessibility
- **Score:** 4/5
- **ARIA labels:** `aria-label` on card sections
- **Issues:** Missing live region for total updates

#### Responsive
- **Score:** 5/5
- **Mobile layout:** Stacks gracefully
- **Issues:** None

#### States Completeness
- [x] Default
- [ ] Loading (uses parent SkeletonCockpit)
- [x] Empty (handles null/0 values)
- [ ] Error (N/A)
- [x] Hover (card effect)
- [ ] Focus (N/A)
- [ ] Disabled (N/A)
- [ ] Success (N/A)

#### Code Quality
- **Tailwind usage:** Excellent
- **Token usage:** Uses designTokens.card.base
- **Hardcoded values:** None
- **className organization:** Clean

### **AVERAGE SCORE: 4.6/5**

---

### RepairVelocityCard.tsx (225 lines)
**Primary Purpose:** Status metrics showing estimate request pipeline (pending, sent, viewed, submitted)

#### Visual Hierarchy
- **Score:** 4/5
- **Primary element:** Status counts with color coding
- **Secondary elements:** Progress bar, title
- **Issues:** Progress bar could be more prominent

#### Color & Contrast
- **Score:** 5/5
- **Background:** `bg-slate-900/80 backdrop-blur-sm`
- **Status colors:** Uses statusColors from designTokens (amber, blue, purple, emerald)
- **Issues:** None - excellent status differentiation

#### Spacing & Layout
- **Score:** 5/5
- **Grid compliance:** `flex flex-wrap gap-3` for status pills
- **Padding pattern:** p-6 consistent
- **Issues:** None

#### Typography
- **Score:** 4/5
- **Heading sizes:** text-sm title, text-lg counts
- **Issues:** Could use tabular-nums on counts

#### Animation & Motion
- **Score:** 3/5
- **Entry animations:** Fade in
- **Hover states:** Pill hover
- **Issues:** Missing count update animation, no stagger on pills

#### Accessibility
- **Score:** 5/5
- **ARIA labels:** Proper labels on status indicators
- **Issues:** None

#### Responsive
- **Score:** 5/5
- **Mobile layout:** Pills wrap gracefully
- **Issues:** None

#### States Completeness
- [x] Default
- [ ] Loading (parent handles)
- [x] Empty (shows 0 counts)
- [ ] Error
- [x] Hover
- [ ] Focus
- [ ] Disabled
- [ ] Success

#### Code Quality
- **Tailwind usage:** Excellent
- **Token usage:** Uses statusColors
- **Hardcoded values:** None

### **AVERAGE SCORE: 4.4/5**

---

## Tier 2 — Content Components

### GCEstimatesPanel.tsx (296 lines)
**Primary Purpose:** Horizontal scrollable gallery of GC estimate cards

#### Visual Hierarchy
- **Score:** 4/5
- **Primary element:** GC cards
- **Secondary elements:** Section title, scroll indicators
- **Issues:** No visual indication of scroll direction

#### Color & Contrast
- **Score:** 4/5
- **Background:** `bg-slate-900/40 border-slate-800`
- **Issues:** Slightly low contrast container

#### Spacing & Layout
- **Score:** 5/5
- **Grid compliance:** `flex gap-4 overflow-x-auto`
- **Padding pattern:** p-4
- **Issues:** None

#### Typography
- **Score:** 4/5
- **Issues:** Section title could be more prominent

#### Animation & Motion
- **Score:** 3/5
- **Issues:** Missing scroll animation, no stagger on card entry

#### Accessibility
- **Score:** 3/5
- **Issues:** Missing keyboard scroll navigation, no scroll region role

#### Responsive
- **Score:** 5/5
- **Mobile layout:** Horizontal scroll works well
- **Issues:** None

#### States Completeness
- [x] Default
- [x] Loading (skeleton cards)
- [x] Empty (empty state message)
- [ ] Error
- [x] Hover
- [ ] Focus
- [ ] Disabled
- [ ] Success

### **AVERAGE SCORE: 4.0/5**

---

### GCEstimateCard.tsx (195 lines)
**Primary Purpose:** Individual GC estimate display with status, contact info, actions

#### Visual Hierarchy
- **Score:** 5/5
- **Primary element:** StatusBadge + GC name
- **Secondary elements:** Email, actions
- **Issues:** None

#### Color & Contrast
- **Score:** 5/5
- **Uses:** Status-based color coding
- **Issues:** None

#### Spacing & Layout
- **Score:** 5/5
- **Grid compliance:** 8pt grid
- **Issues:** None

#### Typography
- **Score:** 5/5
- **Issues:** None

#### Animation & Motion
- **Score:** 4/5
- **Hover states:** Card lift, button transitions
- **Issues:** No entry animation

#### Accessibility
- **Score:** 5/5
- **ARIA labels:** Proper button labels
- **Touch targets:** 44px+
- **Issues:** None

#### Responsive
- **Score:** 5/5
- **Issues:** None

#### States Completeness
- [x] Default
- [ ] Loading
- [ ] Empty
- [ ] Error
- [x] Hover
- [x] Focus
- [ ] Disabled
- [x] Success (submitted status)

### **AVERAGE SCORE: 4.9/5**

---

### EnhancedBreakdownPanel.tsx (277 lines)
**Primary Purpose:** Category breakdown with expandable sections

#### Visual Hierarchy
- **Score:** 4/5
- **Primary element:** Category rows with progress bars
- **Issues:** Grand total could be more prominent

#### Color & Contrast
- **Score:** 5/5
- **Uses:** Category colors from designTokens
- **Issues:** None

#### Spacing & Layout
- **Score:** 5/5
- **Grid compliance:** space-y-2 (8px gaps)
- **Issues:** None

#### Typography
- **Score:** 4/5
- **Uses:** tabular-nums for amounts
- **Issues:** None

#### Animation & Motion
- **Score:** 4/5
- **Entry animations:** Fade in
- **Expand/collapse:** AnimatePresence
- **Issues:** No stagger on category rows

#### Accessibility
- **Score:** 5/5
- **ARIA:** aria-expanded, aria-controls
- **Keyboard:** Enter/Space to toggle
- **Issues:** None

#### Responsive
- **Score:** 5/5
- **Issues:** None

### **AVERAGE SCORE: 4.6/5**

---

### CategoryRow.tsx (255 lines)
**Primary Purpose:** Expandable category with progress bar and line items

#### Visual Hierarchy
- **Score:** 5/5
- **Primary element:** Category name + subtotal
- **Secondary elements:** Progress bar, item count
- **Issues:** None

#### Color & Contrast
- **Score:** 5/5
- **Uses:** getCategoryColors() for unique color per category
- **Issues:** None

#### Spacing & Layout
- **Score:** 5/5
- **Grid compliance:** gap-3, p-4
- **Issues:** None

#### Typography
- **Score:** 5/5
- **Uses:** tabular-nums, proper hierarchy
- **Issues:** None

#### Animation & Motion
- **Score:** 5/5
- **Entry:** opacity + y transform
- **Expand:** AnimatePresence with height animation
- **Line items:** Stagger delay (0.03s per item)
- **Issues:** None - excellent

#### Accessibility
- **Score:** 5/5
- **ARIA:** role="button", aria-expanded, aria-controls
- **Keyboard:** onKeyDown handler for Enter/Space
- **Focus:** Uses focus.className from tokens
- **Issues:** None

#### Responsive
- **Score:** 5/5
- **Issues:** None

#### States Completeness
- [x] Default
- [ ] Loading
- [x] Empty (no items)
- [ ] Error
- [x] Hover
- [x] Focus
- [ ] Disabled
- [ ] Success

### **AVERAGE SCORE: 5.0/5**

---

## Tier 3 — Atomic Components

### StatusBadge.tsx (130 lines)
**Primary Purpose:** Status indicator with icon, color, and optional label

#### Visual Hierarchy
- **Score:** 5/5
- **Issues:** None

#### Color & Contrast
- **Score:** 5/5
- **Uses:** statusColors from designTokens
- **Issues:** None

#### Spacing & Layout
- **Score:** 5/5
- **Sizes:** sm, md, lg variants
- **Issues:** None

#### Typography
- **Score:** 5/5
- **Issues:** None

#### Animation & Motion
- **Score:** 5/5
- **Pending pulse:** Animated opacity + scale
- **Issues:** None

#### Accessibility
- **Score:** 5/5
- **ARIA:** role="status", aria-label, aria-hidden on icons
- **Issues:** None

#### Responsive
- **Score:** 5/5
- **Issues:** None

### **AVERAGE SCORE: 5.0/5**

---

### ProgressBar.tsx (156 lines)
**Primary Purpose:** Single and multi-segment progress visualization

#### Visual Hierarchy
- **Score:** 5/5
- **Issues:** None

#### Color & Contrast
- **Score:** 5/5
- **Customizable:** color prop
- **Issues:** None

#### Spacing & Layout
- **Score:** 5/5
- **Heights:** sm (4px), md (8px), lg (12px)
- **Issues:** None

#### Typography
- **Score:** 5/5
- **Optional label:** tabular-nums
- **Issues:** None

#### Animation & Motion
- **Score:** 5/5
- **Width animation:** 0.5s ease-out
- **Stagger:** 0.05s per segment in MultiProgressBar
- **Issues:** None

#### Accessibility
- **Score:** 5/5
- **ARIA:** role="progressbar", aria-valuenow, aria-valuemin, aria-valuemax, aria-label
- **Issues:** None

#### Responsive
- **Score:** 5/5
- **Issues:** None

### **AVERAGE SCORE: 5.0/5**

---

### SkeletonCockpit.tsx (185 lines)
**Primary Purpose:** Loading state matching final layout structure

#### Visual Hierarchy
- **Score:** 5/5
- **Matches:** Final BiddingCockpit structure exactly
- **Issues:** None

#### Color & Contrast
- **Score:** 4/5
- **Background:** bg-slate-800
- **Issues:** Could use subtle gradient

#### Spacing & Layout
- **Score:** 5/5
- **Matches:** Final layout exactly
- **Issues:** None

#### Typography
- **Score:** N/A (skeleton)

#### Animation & Motion
- **Score:** 5/5
- **Shimmer:** opacity [0.5, 0.8, 0.5] at 1.5s repeat
- **Issues:** None

#### Accessibility
- **Score:** 5/5
- **ARIA:** role="status", aria-busy="true", aria-label="Loading..."
- **Issues:** None

#### Responsive
- **Score:** 5/5
- **Issues:** None

### **AVERAGE SCORE: 4.8/5**

---

### EmptyCockpit.tsx (160 lines)
**Primary Purpose:** Empty state with illustration and CTAs

#### Visual Hierarchy
- **Score:** 5/5
- **Primary element:** Illustration + headline
- **Secondary elements:** Description, CTAs
- **Issues:** None

#### Color & Contrast
- **Score:** 5/5
- **Accent:** Emerald glow on icon
- **Issues:** None

#### Spacing & Layout
- **Score:** 5/5
- **Grid compliance:** p-8 md:p-12, gap-3
- **Issues:** None

#### Typography
- **Score:** 5/5
- **Headline:** text-lg font-semibold
- **Body:** text-sm text-slate-400
- **Helper:** text-xs text-slate-500
- **Issues:** None

#### Animation & Motion
- **Score:** 5/5
- **Entry:** Staggered (0.1s, 0.2s, 0.3s, 0.4s delays)
- **Icon scale:** 0.9 -> 1
- **Issues:** None

#### Accessibility
- **Score:** 4/5
- **Issues:** CTAs have full focus styles but could use aria-describedby

#### Responsive
- **Score:** 5/5
- **Mobile:** flex-col, sm:flex-row for buttons
- **Issues:** None

### **AVERAGE SCORE: 4.9/5**

---

## Tier 4 — Modals

### RequestEstimateModal.tsx (430 lines)
**Primary Purpose:** Form to send estimate request to contractor

#### Visual Hierarchy
- **Score:** 4/5
- **Primary element:** Form fields
- **Secondary elements:** Header, actions
- **Issues:** Form could have clearer section grouping

#### Color & Contrast
- **Score:** 5/5
- **Inputs:** bg-slate-800, border-slate-700
- **Errors:** border-red-500, text-red-400
- **Success:** emerald-400
- **Issues:** None

#### Spacing & Layout
- **Score:** 5/5
- **Grid compliance:** space-y-4, p-6
- **Issues:** None

#### Typography
- **Score:** 4/5
- **Issues:** Labels could be slightly larger

#### Animation & Motion
- **Score:** 3/5
- **Issues:** No enter/exit animation on modal, no form field focus animation

#### Accessibility
- **Score:** 5/5
- **ARIA:** role="dialog", aria-modal, aria-labelledby, aria-invalid, aria-describedby
- **Focus:** Trapped in modal, escape to close
- **Touch targets:** min-h-[44px]
- **Issues:** None

#### Responsive
- **Score:** 5/5
- **Mobile:** max-w-md, centered
- **Issues:** None

#### States Completeness
- [x] Default (form)
- [x] Loading (sending)
- [ ] Empty
- [x] Error
- [x] Hover
- [x] Focus
- [x] Disabled (during sending)
- [x] Success

### **AVERAGE SCORE: 4.4/5**

---

### ManualUploadModal.tsx (439 lines)
**Primary Purpose:** Upload estimate received outside portal

#### Visual Hierarchy
- **Score:** 5/5
- **Primary element:** File drop zone
- **Secondary elements:** Form fields, actions
- **Issues:** None

#### Color & Contrast
- **Score:** 5/5
- **Drop zone:** Blue accent on drag
- **Issues:** None

#### Spacing & Layout
- **Score:** 5/5
- **Grid compliance:** space-y-4, p-6
- **Issues:** None

#### Typography
- **Score:** 5/5
- **Issues:** None

#### Animation & Motion
- **Score:** 3/5
- **Issues:** No modal enter/exit animation

#### Accessibility
- **Score:** 5/5
- **ARIA:** Full coverage
- **Keyboard:** Enter/Space on drop zone
- **Touch targets:** min-h-[44px]
- **Issues:** None

#### Responsive
- **Score:** 5/5
- **Issues:** None

#### States Completeness
- [x] Default (form)
- [x] Loading (uploading)
- [ ] Empty
- [x] Error
- [x] Hover (drag over)
- [x] Focus
- [x] Disabled
- [x] Success

### **AVERAGE SCORE: 4.7/5**

---

## Tier 5 — Supporting Components

### EnhancedLineItemRow.tsx (296 lines)
**Primary Purpose:** Individual line item row with qty, unit, rate, total fields

#### Visual Hierarchy
- **Score:** 4/5
- **Primary element:** Label + Total
- **Issues:** 12-column grid is complex on mobile

#### Color & Contrast
- **Score:** 5/5
- **Manual override:** Amber accent
- **Calculated:** Emerald accent
- **Issues:** None

#### Spacing & Layout
- **Score:** 4/5
- **Grid:** 12-column responsive
- **Issues:** Mobile layout hides condition/rate columns

#### Typography
- **Score:** 5/5
- **Uses:** tabular-nums, text-sm
- **Issues:** None

#### Animation & Motion
- **Score:** 3/5
- **Issues:** No focus animation, no value update animation

#### Accessibility
- **Score:** 5/5
- **ARIA:** Full labels on inputs
- **Touch targets:** minHeight: touchTargets.min
- **Focus:** Uses focus.className
- **Issues:** None

#### Responsive
- **Score:** 4/5
- **Issues:** Condition/Rate hidden on mobile - could show on expand

### **AVERAGE SCORE: 4.3/5**

---

### CategorySubtotal.tsx (158 lines)
**Primary Purpose:** Category header with subtotal and expand toggle

#### Visual Hierarchy
- **Score:** 5/5
- **Issues:** None

#### Color & Contrast
- **Score:** 5/5
- **Uses:** getCategoryColors
- **Issues:** None

#### Spacing & Layout
- **Score:** 5/5
- **Issues:** None

#### Typography
- **Score:** 5/5
- **Uses:** tabular-nums on subtotal
- **Issues:** None

#### Animation & Motion
- **Score:** 5/5
- **Chevron rotation:** 0.15s
- **Subtotal pulse:** On value change
- **Reduced motion:** Respects prefers-reduced-motion
- **Issues:** None

#### Accessibility
- **Score:** 5/5
- **ARIA:** aria-expanded, full aria-label with context
- **Touch targets:** minHeight token
- **Issues:** None

### **AVERAGE SCORE: 5.0/5**

---

### RepairsSummary.tsx (193 lines)
**Primary Purpose:** Summary card with grand total and export actions

#### Visual Hierarchy
- **Score:** 5/5
- **Primary element:** Grand total (text-2xl emerald-400)
- **Issues:** None

#### Color & Contrast
- **Score:** 5/5
- **Issues:** None

#### Spacing & Layout
- **Score:** 5/5
- **Uses:** card tokens
- **Issues:** None

#### Typography
- **Score:** 5/5
- **Uses:** grandTotal token from designTokens
- **Issues:** None

#### Animation & Motion
- **Score:** 4/5
- **Entry:** opacity + y
- **Issues:** No total update animation

#### Accessibility
- **Score:** 5/5
- **ARIA:** aria-label on buttons, aria-disabled
- **Touch targets:** comfortable (48px)
- **Issues:** None

### **AVERAGE SCORE: 4.9/5**

---

### EnhancedRepairsSection.tsx (215 lines)
**Primary Purpose:** Container for category list with summary

#### Visual Hierarchy
- **Score:** 4/5
- **Issues:** Section header could be more prominent

#### Color & Contrast
- **Score:** 4/5
- **Issues:** Active count badge could pop more

#### Spacing & Layout
- **Score:** 5/5
- **Issues:** None

#### Typography
- **Score:** 4/5
- **Issues:** Header styling could be bolder

#### Animation & Motion
- **Score:** 4/5
- **Expand/collapse:** AnimatePresence
- **Issues:** No stagger on initial render

#### Accessibility
- **Score:** 4/5
- **Issues:** Section not marked as region

### **AVERAGE SCORE: 4.2/5**

---

## Summary Scores

| Component | Score | Notes |
|-----------|-------|-------|
| CategoryRow | 5.0/5 | Excellent - reference implementation |
| StatusBadge | 5.0/5 | Excellent - atomic design pattern |
| ProgressBar | 5.0/5 | Excellent - ARIA + animation |
| CategorySubtotal | 5.0/5 | Excellent - reduced motion support |
| GCEstimateCard | 4.9/5 | Near perfect - add entry animation |
| RepairsSummary | 4.9/5 | Near perfect - add total pulse |
| EmptyCockpit | 4.9/5 | Near perfect |
| SkeletonCockpit | 4.8/5 | Great - could add gradient |
| ManualUploadModal | 4.7/5 | Great - add modal animation |
| EstimateSummaryCard | 4.6/5 | Great - add total pulse |
| EnhancedBreakdownPanel | 4.6/5 | Great - add row stagger |
| RepairVelocityCard | 4.4/5 | Good - add count animation |
| RequestEstimateModal | 4.4/5 | Good - add modal animation |
| EnhancedLineItemRow | 4.3/5 | Good - mobile improvements |
| EnhancedRepairsSection | 4.2/5 | Good - header styling |
| BiddingCockpit | 4.1/5 | Good - add container animation |
| GCEstimatesPanel | 4.0/5 | Good - scroll accessibility |

**Overall Average: 4.6/5**

---

## Key Patterns Identified

### Consistent (Preserve)
1. Token usage from designTokens.ts
2. memo() on all components
3. tabular-nums on financial figures
4. ARIA labels on interactive elements
5. Touch targets using touchTargets.min/comfortable
6. AnimatePresence for expand/collapse
7. focus.className for focus indicators

### Inconsistent (Fix)
1. Entry animations - some have, some don't
2. Modal animations - none have enter/exit
3. Value update animations - inconsistent
4. Stagger on lists - only CategoryRow does it well
5. Error states - not all components handle

### Missing (Add)
1. prefers-reduced-motion on more components
2. Error boundary states
3. Scroll region accessibility on GCEstimatesPanel
