/**
 * Underwrite Constants - Thresholds and configuration
 * @module @hps-internal/contracts/underwrite/constants
 * @slice 02 of 22
 *
 * IMPORTANT: These are policy-backed thresholds.
 * Changes require business approval.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// MOTIVATION THRESHOLDS
// ═══════════════════════════════════════════════════════════════════════════════

/** Minimum score for "low" motivation (0-39) */
export const MOTIVATION_LOW_MIN = 0;
/** Minimum score for "medium" motivation (40-64) */
export const MOTIVATION_MEDIUM_MIN = 40;
/** Minimum score for "high" motivation (65-84) */
export const MOTIVATION_HIGH_MIN = 65;
/** Minimum score for "critical" motivation (85-100) */
export const MOTIVATION_CRITICAL_MIN = 85;

// ═══════════════════════════════════════════════════════════════════════════════
// FORECLOSURE URGENCY THRESHOLDS (Days until sale)
// ═══════════════════════════════════════════════════════════════════════════════

/** Days for critical urgency (immediate action required) */
export const URGENCY_CRITICAL_DAYS = 30;
/** Days for high urgency (expedite) */
export const URGENCY_HIGH_DAYS = 60;
/** Days for medium urgency (standard priority) */
export const URGENCY_MEDIUM_DAYS = 120;

// ═══════════════════════════════════════════════════════════════════════════════
// FORECLOSURE MOTIVATION BOOSTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Boost for critical urgency (+25 points) */
export const FORECLOSURE_BOOST_CRITICAL = 25;
/** Boost for high urgency (+15 points) */
export const FORECLOSURE_BOOST_HIGH = 15;
/** Boost for medium urgency (+10 points) */
export const FORECLOSURE_BOOST_MEDIUM = 10;
/** Boost for low urgency (+5 points) */
export const FORECLOSURE_BOOST_LOW = 5;

// ═══════════════════════════════════════════════════════════════════════════════
// LIEN THRESHOLDS (Dollars)
// ═══════════════════════════════════════════════════════════════════════════════

/** Blocking gate threshold for total liens ($10,000) */
export const LIEN_BLOCKING_THRESHOLD = 10_000;
/** Low risk threshold ($2,500) */
export const LIEN_LOW_THRESHOLD = 2_500;
/** Medium risk threshold ($5,000) */
export const LIEN_MEDIUM_THRESHOLD = 5_000;
/** High risk threshold ($10,000) */
export const LIEN_HIGH_THRESHOLD = 10_000;

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM EXPECTED LIFE (Years) - Central FL Climate
// ═══════════════════════════════════════════════════════════════════════════════

/** Roof expected life in Central FL (asphalt shingle) */
export const ROOF_EXPECTED_LIFE = 25;
/** HVAC expected life in Central FL (high usage due to heat) */
export const HVAC_EXPECTED_LIFE = 15;
/** Water heater expected life (tank-style) */
export const WATER_HEATER_EXPECTED_LIFE = 12;

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM REPLACEMENT COSTS (Central FL Average - 2024 prices)
// ═══════════════════════════════════════════════════════════════════════════════

/** Roof replacement cost (average SFR) */
export const ROOF_REPLACEMENT_COST = 15_000;
/** HVAC replacement cost (3-ton system) */
export const HVAC_REPLACEMENT_COST = 8_000;
/** Water heater replacement cost (50 gal tank) */
export const WATER_HEATER_REPLACEMENT_COST = 1_500;

// ═══════════════════════════════════════════════════════════════════════════════
// REFERENCE YEAR (For RUL calculations)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Reference year for age calculations
 * NOTE: This is evaluated at runtime, not compile time
 */
export const REFERENCE_YEAR = new Date().getFullYear();
