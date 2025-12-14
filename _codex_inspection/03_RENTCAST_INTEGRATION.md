# RentCast Integration

References:
- RentCast fetch + mapping: supabase/functions/_shared/valuationSnapshot.ts:69-155 (fetchRentcast), 158-187 (fetchRentcastMarket), 32-67 (safeNumber/buildStubComps), 270-335 (ensureSnapshotForDeal), 204-224 (getExistingSnapshot), 226-268 (createSnapshot).
- Valuation entrypoint that calls RentCast: supabase/functions/v1-valuation-run/index.ts:35-325 (policy guardrails, snapshot fetch, confidence calc, run insert).
- Client trigger: apps/hps-dealengine/lib/valuation.ts:10-36 (invokeValuationRun) used by app/(app)/underwrite/page.tsx.

Env vars (names only):
- RENTCAST_API_KEY (used in fetchRentcast/fetchRentcastMarket).
- SUPABASE_URL, SUPABASE_ANON_KEY (Supabase client creation for Edge).

Request/response lifecycle:
- v1-valuation-run POST body: { deal_id, posture?, force_refresh? }.
- loadDealAndOrg pulls address/city/state/zip (deals table) then ensureSnapshotForDeal(source="rentcast" by default).
- ensureSnapshotForDeal: if TTL (policy valuation.snapshot_ttl_hours) valid and force_refresh=false, returns latest property_snapshots row; otherwise calls fetchRentcast + fetchRentcastMarket.
- fetchRentcast builds https://api.rentcast.io/v1/avm/value?address=&city=&state=&zipCode= with header X-Api-Key; no retries/backoff; logs warn on non-200 and returns stub.
- fetchRentcastMarket hits https://api.rentcast.io/v1/markets?zipCode=...; no retries/backoff; returns first market row only; null on error.
- Responses are normalized via safeNumber; comps mapped 1:1 to internal Comp fields, comp_kind hardcoded to "sale_listing"; as_of set to now() per comp; raw original payload preserved.
- Stub mode: if RENTCAST_API_KEY missing or fetch fails, returns fingerprint-seeded comps (3 rows) with as_of=new Date(); provider rentcast-stub; market null.
- Persistence: createSnapshot inserts property_snapshots (org_id, address_fingerprint, source, provider, as_of, window_days, sample_n, comps, market, raw, stub, expires_at) after canonicalJson sort via toCanonical; expires_at = asOf + TTL hours. Hash for valuation_run input includes hashJson(snapshot).
- v1-valuation-run copies snapshot into valuation_runs: provenance.endpoints ["rentcast_avm","rentcast_markets"], suggested_arv = RentCast AVM price else median(comp.price); confidence rubric uses policy tokens and comp stats (median correlation/distance/days_old); status failed if insufficient comps (< min_closed_comps_required) or missing suggested_arv.

Data model mapping (fetchRentcast → Comp):
- id (c.id || fallback), address (formattedAddress/addressLine1/address), city, state, postal_code (zip fields), latitude/longitude, close_date (closeDate/listedDate), price, price_per_sqft, beds/baths, sqft (sqft/squareFootage/livingArea), lot_sqft (lotSize), year_built, distance_miles, correlation, days_old, days_on_market, status, listing_type, comp_kind="sale_listing", source="rentcast", as_of=now(), raw=c.
- Market snapshot (fetchRentcastMarket): dom_zip_days from medianDaysOnMarket/averageDaysOnMarket; moi/price_to_list/local_discount null; source "rentcast/markets"; as_of=now().
- When no market row but AVM exists, market set to { avm_price, avm_price_range_low/high, source:"rentcast/avm", as_of }.

Caching/TTL:
- property_snapshots keyed by org_id + address_fingerprint + source; TTL enforced via expires_at; reused until expired unless force_refresh flag triggers refetch.
- sample_n tracked as count of comps; window_days null (RentCast response has no explicit window).

Persistence tables:
- property_snapshots (migrations/20251212120000_property_snapshots_and_valuation_runs.sql lines 6-60) append-only with RLS.
- valuation_runs (same migration lines 62-119) append-only, dedup index on (org_id, deal_id, posture, input_hash, coalesce(policy_hash,'')), audit trigger.