---
doc_id: "engine.knobs-and-sandbox-mapping"
category: "engine"
audience: ["ai-assistant", "engineer", "underwriter", "exec"]
trust_tier: 1
summary: "Wiring-accurate map of sandbox knobs to policy snapshot, trace frames, and UI surfaces."
last_updated: "2026-01-06"
---

# Knobs & Sandbox Mapping — HPS DealEngine

This doc captures the current, wiring-accurate path from sandbox knobs to policy snapshot, engine trace, and UI surfaces.

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ sandboxSettingsSource.ts (UI Definitions)                                   │
│ - 223 total settings defined                                                │
│ - key, label, type, defaultValue, pageTitle                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ sandboxKnobAudit.ts (Classification)                                        │
│ - 87 KEEP knobs with engineRef                                              │
│ - finalImpact: economic | strategy_offer | ux_only | unused_legacy          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ sandboxToAnalyzeOptions.ts (Mapping)                                        │
│ - Transforms UI values to AnalyzeSandboxOptions                             │
│ - Sections: valuation, speedBands, repairs, etc.                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ @hps-internal/contracts: analyze.ts (Types)                                 │
│ - Zod schemas for validation                                                │
│ - TypeScript interfaces (AnalyzeSandboxOptions)                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ policy_builder.ts (Policy Construction)                                     │
│ - Builds UnderwritingPolicy from sandbox options                            │
│ - Sets policy.* values for engine consumption                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ compute_underwriting.ts (Engine Consumption)                                │
│ - Reads policy values via getNumber/getString                               │
│ - Produces trace frames for audit                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Canonical Flow (Code-Defined)

1. **UI (sandboxSettingsSource.ts)** — User configures knobs in Sandbox UI
2. **sandboxPolicy.ts** — `buildSandboxPolicyOptions` extracts values with `pickPostureValue()`
3. **sandboxToAnalyzeOptions.ts** — Maps to typed `AnalyzeSandboxOptions` structure
4. **contracts/analyze.ts** — Validates via Zod schema
5. **policy_builder.ts** — Constructs `UnderwritingPolicy` snapshot
6. **compute_underwriting.ts** — Engine reads policy, outputs numbers + trace frames
7. **UI (/trace, /overview)** — Displays trace frames and engine outputs

## Knob Categories (87 KEEP)

### Valuation (AIV/ARV) — 17 knobs
| Knob | Default | Engine Path | Trace Frame |
|------|---------|-------------|-------------|
| `aivHardMax` | 2000000 | policy.valuation.aiv_hard_max | VALUATION_POLICY |
| `aivHardMin` | 50000 | policy.valuation.aiv_hard_min | VALUATION_POLICY |
| `arvHardMax` | 2500000 | policy.valuation.arv_hard_max | VALUATION_POLICY |
| `arvHardMin` | 75000 | policy.valuation.arv_hard_min | VALUATION_POLICY |
| `arvMinComps` | 3 | policy.valuation.arv_min_comps | VALUATION_POLICY |
| `arvCompsMaxRadiusMiles` | 1.0 | policy.valuation.arv_comps_max_radius_miles | VALUATION_POLICY |
| `arvCompsSqftVariancePercent` | 20 | policy.valuation.arv_comps_sqft_variance_percent | VALUATION_POLICY |
| `arvCompsSetSizeForMedian` | 5 | policy.valuation.arv_comps_set_size_for_median | VALUATION_POLICY |

### speedBands — 7 knobs ✅ FIXED in Phase 7 Slice D
| Knob | Default | Engine Path | Trace Frame |
|------|---------|-------------|-------------|
| `speedBandsFastMaxDom` | 30 | policy.speedBandsFastMaxDom | SPEED_BAND_POLICY |
| `speedBandsFastMaxMoi` | 1.5 | policy.speedBandsFastMaxMoi | SPEED_BAND_POLICY |
| `speedBandsBalancedMaxDom` | 60 | policy.speedBandsBalancedMaxDom | SPEED_BAND_POLICY |
| `speedBandsBalancedMaxMoi` | 3 | policy.speedBandsBalancedMaxMoi | SPEED_BAND_POLICY |
| `speedBandsSlowMinDom` | 90 | policy.speedBandsSlowMinDom | SPEED_BAND_POLICY |
| `speedBandsSlowMinMoi` | 4 | policy.speedBandsSlowMinMoi | SPEED_BAND_POLICY |
| `zipSpeedBandDerivationMethod` | "conservative" | policy.zipSpeedBandDerivationMethod | SPEED_BAND_POLICY |

### Hold Costs — 6 knobs
| Knob | Default | Engine Path | Trace Frame |
|------|---------|-------------|-------------|
| `holdCostsFlipFastZip` | 2 | policy.holding.flip_fast_zip_months | HOLDING_COSTS_POLICY |
| `holdCostsFlipNeutralZip` | 4 | policy.holding.flip_neutral_zip_months | HOLDING_COSTS_POLICY |
| `holdCostsFlipSlowZip` | 6 | policy.holding.flip_slow_zip_months | HOLDING_COSTS_POLICY |
| `holdCostsWholetailFastZip` | 1 | policy.holding.wholetail_fast_zip_months | HOLDING_COSTS_POLICY |
| `holdCostsWholetailNeutralZip` | 2 | policy.holding.wholetail_neutral_zip_months | HOLDING_COSTS_POLICY |
| `holdCostsWholetailSlowZip` | 3 | policy.holding.wholetail_slow_zip_months | HOLDING_COSTS_POLICY |

### Repairs — 4 knobs
| Knob | Default | Engine Path | Trace Frame |
|------|---------|-------------|-------------|
| `repairsHardMax` | 150000 | policy.repairs_policy.hard_max | REPAIRS_POLICY |
| `repairsSoftMaxVsArvPercentage` | 0.35 | policy.repairs_policy.soft_max_vs_arv_pct | REPAIRS_POLICY |
| `repairsContingencyPercentageByClass` | {...} | policy.repairs_policy.contingency_percentage_by_class | REPAIRS_POLICY |

### Risk Gates — 9 knobs
| Knob | Engine Path | Trace Frame |
|------|-------------|-------------|
| `bankruptcyStayGateLegalBlock` | policy.risk_gates.bankruptcy_stay | RISK_GATES |
| `fha90DayResaleRuleGate` | policy.risk_gates.fha_90_day_resale | RISK_GATES |
| `firptaWithholdingGate` | policy.risk_gates.firpta_withholding | RISK_GATES |
| `flood50RuleGate` | policy.risk_gates.flood_50_rule | RISK_GATES |
| `scraVerificationGate` | policy.risk_gates.scra_verification | RISK_GATES |
| `stateProgramGateFhaVaOverlays` | policy.risk_gates.state_program_fha_va | RISK_GATES |

## Trace Frames for Audit

| Trace Frame | Purpose | Location |
|-------------|---------|----------|
| `SPEED_BAND_POLICY` | Shows speedBands values used | compute_underwriting.ts:2559 |
| `VALUATION_POLICY` | Shows valuation limits | compute_underwriting.ts |
| `REPAIRS_POLICY` | Shows repairs limits | compute_underwriting.ts |
| `HOLDING_COSTS_POLICY` | Shows hold cost months | compute_underwriting.ts |
| `RISK_GATES` | Shows gate pass/fail | compute_underwriting.ts |

## Adding a New Knob

1. **sandboxSettingsSource.ts** — Add UI definition (key, label, type, defaultValue, pageTitle)
2. **sandboxKnobAudit.ts** — Add KEEP classification with engineRef and finalImpact
3. **sandboxToAnalyzeOptions.ts** — Add mapping from sandbox to options structure
4. **@hps-internal/contracts/analyze.ts** — Add to Zod schema and TypeScript interface
5. **policy_builder.ts** — Add policy assignment (policy.* = sandbox.*)
6. **compute_underwriting.ts** — Read from policy and use in calculations
7. **Regenerate types**: `pnpm --filter "@hps-internal/contracts" build:sandbox-meta`

## Troubleshooting

**Knob value not reaching engine?**
1. Check sandboxToAnalyzeOptions.ts mapping exists
2. Check contracts/analyze.ts has the type
3. Check policy_builder.ts assigns to policy
4. Check compute_underwriting.ts reads from policy

**Trace frame not showing user value?**
1. Verify policy_builder.ts populates from sandbox (not hardcoded)
2. Check trace frame emission includes policy values

**Type errors after adding knob?**
1. Regenerate sandbox meta: `pnpm --filter "@hps-internal/contracts" build:sandbox-meta`
2. Run typecheck: `pnpm -w typecheck`

## Phase 7 Changes Summary

- **Slice A**: Removed 112 DROP_BACKLOG knobs from audit
- **Slice B**: Removed dead UX knobs (abcConfidenceGradeRubric, allowAdvisorOverrideWorkflowState)
- **Slice C**: Added arvCompsMaxRadiusMiles, arvCompsSqftVariancePercent
- **Slice D**: Fixed speedBands wiring (was missing from sandboxToAnalyzeOptions)
- **Final state**: 87 KEEP knobs, all properly wired

---

*Last verified: 2026-01-06 | Phase 7 Slice E*
