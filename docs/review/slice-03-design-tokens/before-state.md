# BEFORE STATE - Slice 03: Design Tokens
Generated: 2026-01-10

## Existing underwrite components:
Directory already exists with the following files:
- CompsPanel.test.tsx
- CompsPanel.tsx
- DoubleCloseCalculator.tsx
- OverridesPanel.tsx
- RequestOverrideModal.tsx
- ScenarioModeler.tsx
- UnderwriteTab.test.tsx
- UnderwriteTab.tsx

## Existing token files in app:
- apps/hps-dealengine/.data/tokens.json
- apps/hps-dealengine/app/api/tokens
- apps/hps-dealengine/app/api/validate-estimate-token
- apps/hps-dealengine/app/intake/[token]
- apps/hps-dealengine/app/invite/[token]
- apps/hps-dealengine/components/repairs/designTokens.ts
- apps/hps-dealengine/lib/animations/tokens.ts
- apps/hps-dealengine/lib/design-tokens
- apps/hps-dealengine/styles/design-tokens.css
- apps/hps-dealengine/styles/tokens.css

## Repairs page reference (design source):
- BiddingCockpit.tsx
- CategoryRow.tsx
- CategorySubtotal.tsx
- designTokens.ts (473 lines - comprehensive token system)
- EmptyCockpit.tsx
- EnhancedBreakdownPanel.tsx
- EnhancedLineItemRow.tsx
- EnhancedRepairsSection.tsx
- EstimateSummaryCard.tsx
- GCEstimateCard.tsx

## Current underwrite/utils state:
Directory does not exist yet - needs to be created.

## Reference: repairs/designTokens.ts structure:
- spacing (8pt grid)
- categoryColors (13 distinct colors)
- typography (section titles, subtotals, labels)
- animations (Framer Motion variants)
- touchTargets (44px minimum)
- focus (WCAG AA - 2px emerald ring)
- card (glassmorphic dark mode)
- statusColors (pending, sent, viewed, etc.)
- motionVariants (section, card, item, modal, stagger)
- glowEffects (emerald, amber, red)
- heroTypography (budget numbers)
- confidenceBadge (verified, auto, error)
- useMotion hook (reduced motion support)
