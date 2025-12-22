# ARV Pipeline Call Graph

1) UI trigger (Underwrite page)
- apps/hps-dealengine/app/(app)/underwrite/page.tsx:140-207 hydrate valuation from latest valuation_run; 273-311 handleRefreshValuation calls invokeValuationRun; 336-355 handleApplySuggestedArv; 375-411 handleOverrideMarketValue; renders UnderwriteTab with valuationRun/snapshot props.
- apps/hps-dealengine/lib/valuation.ts:10-36 invokeValuationRun -> Supabase functions.invoke("v1-valuation-run"); 39-74 applySuggestedArv/overrideMarketValue call v1-valuation-apply-arv and v1-valuation-override-market; 76-92 fetchLatestValuationRun reads valuation_runs + property_snapshots.
- apps/hps-dealengine/components/underwrite/UnderwriteTab.tsx: suggested ARV/comp display, gating, override modal; CompsPanel shows comps and allows rerun with 30s cooldown.

2) Edge valuation run
- supabase/functions/v1-valuation-run/index.ts:35-87 CORS/JWT guard; 90-135 fetch active policy (must be is_active=true) and validate valuation tokens (min_closed_comps_required, confidence_rubric present).
- 137-142 call ensureSnapshotForDeal (supabase/functions/_shared/valuationSnapshot.ts) with posture + force_refresh. ensureSnapshotForDeal: TTL from policy; reuse recent property_snapshots else fetch RentCast AVM/value + markets; build snapshot (canonical JSON) and insert property_snapshots with expires_at.
- 147-174 derive avmPrice/arvRange from snapshot.market; compute median price/correlation/distance/days_old across comps; suggested_arv = avmPrice ?? medianPrice. No comp filtering beyond safeNumber; comp_kind fixed to sale_listing.
- 175-207 confidence grading: loop A/B/C rubric thresholds (min_comps_multiplier * min_closed_comps, min_median_correlation, max_range_pct). Missing correlation => warning + grade C. Failure reasons if comp_count < min_closed_comps or suggested_arv missing.
- 219-259 build input/output/provenance hashes (hashJson/canonicalJson); dedupe lookup valuation_runs by (org_id, deal_id, posture, input_hash, policy_hash); insert row with status succeeded/failed and return snapshot.

3) Apply/override to deal
- supabase/functions/v1-valuation-apply-arv/index.ts:63-150 validates JWT, loads deal + matching valuation_run, requires numeric suggested_arv, writes deals.payload.market.{arv,arv_source="valuation_run",arv_valuation_run_id,arv_as_of}, canonicalJson.
- supabase/functions/v1-valuation-override-market/index.ts:37-136 validates payload + optional valuation_run_id, requires reason>=10 chars, sets market.{arv|as_is_value}_source="manual_override" with as_of=now and optional valuation_run linkage.
- UI displays provenance badges and disables Apply when already applied.

4) Engine consumption
- Underwrite analyze uses v1-analyze (lib/edge.ts) with current deal payload (market.arv/as_is_value). Engine computeUnderwriting (packages/engine/src/compute_underwriting.ts:2102-2182) reads deal.market.arv/aiv; if missing, adds infoNeeded; applies policy valuation bounds (arv_hard_min/arv_hard_max; arv_soft_max_vs_aiv_multiplier; analogous for aiv). No comp-derived adjustments occur post-valuation; downstream buyer ceiling/risk/trace operate on bounded ARV.
- Confidence gating inside engine (compute_underwriting.ts:1663-1689) relies on deal.market.comps_arv_count/comps_aiv_count and evidence freshness, not linked to RentCast comps unless UI populates those counts (currently not set by v1-valuation-run).

Coverage of requested features:
- Transaction sanitation / arms-length filtering: NOT IMPLEMENTED (RentCast comps ingested as-is).
- Distressed/wholesale/outlier detection: NOT IMPLEMENTED in valuation-run; engine risk gates use policy but not comps.
- Comp selection gates: Only min_closed_comps_required check in v1-valuation-run; no distance/time/size/year/bed/bath/condition filters.
- Concessions handling: Not present (CompsPanel shows placeholder; comps schema has concessions? but provider data not used).
- Time/market adjustments: None; market stats DOM/MOI optional from RentCast markets used only for display, not ARV math.
- Feature adjustment matrix / W factors: None.
- Similarity scoring/weighting/final reconciliation: suggested_arv = RentCast AVM value else median(price) of returned comps; no weighting by correlation/distance.
- Confidence/range logic: Confidence rubric uses policy thresholds on comp_count, median_correlation, and AVM range width; warnings include missing_correlation_signal; failures when comps below min or suggested_arv missing; status failed but response still returned.