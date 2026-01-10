# BEFORE STATE - Slice 12: Seller Situation Section
Generated: 2026-01-10

## Existing underwrite components:
- CompsPanel.tsx
- OverridesPanel.tsx
- RequestOverrideModal.tsx
- ScenarioModeler.tsx
- DoubleCloseCalculator.tsx
- UnderwriteTab.tsx

## Directories:
- /accordion - SectionAccordion, CompletionBadge, useAccordionState
- /hero - HeroPlaceholder, UnderwriteHero
- /layout - UnderwriteLayout, LeftRail, CenterContent, RightRail
- /utils - tokens.ts (design tokens)

## Check for sections folder:
sections/ does not exist yet - will be created

## Dependencies (from Slice 06):
- SectionAccordion exported from @/components/underwrite/accordion
- CompletionBadge exported from @/components/underwrite/accordion

## Dependencies (from Slice 03):
- Design tokens exported from @/components/underwrite/utils/tokens

## Dependencies (from Slice 07):
- computeMotivationScore exported from @/lib/engine

## Types from contracts:
- ReasonForSelling (14 values)
- SellerTimeline (5 values)
- DecisionMakerStatus (6 values)
- REASON_FOR_SELLING_OPTIONS, SELLER_TIMELINE_OPTIONS, DECISION_MAKER_OPTIONS

## Existing hooks:
- useDebouncedCallback from @/hooks/useDebounce
