/**
 * Valuation Feature Flags for Edge Functions (Server-Side)
 *
 * These flags control paid provider integrations and complex valuation features.
 * They are read from environment variables at runtime.
 *
 * PAUSED_V2: These features are paused for free data architecture pivot.
 * Re-enable by setting the corresponding environment variable to "true".
 * See docs/archive/valuation-providers-v2-pause.md for details.
 *
 * @module valuationFeatureFlags
 */

/**
 * Parse an environment variable as a boolean.
 * Returns true only if value is exactly "true" or "1".
 * Defaults to false if not set or any other value.
 */
function parseEnvBool(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.toLowerCase() === "true" || value === "1";
}

/**
 * Get the current state of valuation feature flags.
 * All flags default to false (paused) unless explicitly enabled.
 */
export function getValuationFeatureFlags(): {
  rentcastEnabled: boolean;
  attomEnabled: boolean;
  ensembleEnabled: boolean;
  calibrationEnabled: boolean;
} {
  return {
    // PAUSED_V2: RentCast adapter paused for free data architecture pivot
    // Re-enable by setting FEATURE_RENTCAST_ENABLED=true
    // See docs/archive/valuation-providers-v2-pause.md
    rentcastEnabled: parseEnvBool(Deno.env.get("FEATURE_RENTCAST_ENABLED")),

    // PAUSED_V2: ATTOM normalizer paused for free data architecture pivot
    // Re-enable by setting FEATURE_ATTOM_ENABLED=true
    // See docs/archive/valuation-providers-v2-pause.md
    attomEnabled: parseEnvBool(Deno.env.get("FEATURE_ATTOM_ENABLED")),

    // PAUSED_V2: Ensemble + uncertainty + ceiling paused - no AVM provider
    // Re-enable by setting FEATURE_ENSEMBLE_ENABLED=true
    // See docs/archive/valuation-providers-v2-pause.md
    ensembleEnabled: parseEnvBool(Deno.env.get("FEATURE_ENSEMBLE_ENABLED")),

    // PAUSED_V2: Calibration loop paused - depends on ensemble
    // Re-enable by setting FEATURE_CALIBRATION_ENABLED=true
    // See docs/archive/valuation-providers-v2-pause.md
    calibrationEnabled: parseEnvBool(Deno.env.get("FEATURE_CALIBRATION_ENABLED")),
  };
}

/**
 * Check if RentCast provider is enabled.
 *
 * PAUSED_V2: RentCast adapter paused for free data architecture pivot
 * Re-enable by setting FEATURE_RENTCAST_ENABLED=true
 * See docs/archive/valuation-providers-v2-pause.md
 */
export function isRentcastEnabled(): boolean {
  return parseEnvBool(Deno.env.get("FEATURE_RENTCAST_ENABLED"));
}

/**
 * Check if ATTOM provider is enabled.
 *
 * PAUSED_V2: ATTOM normalizer paused for free data architecture pivot
 * Re-enable by setting FEATURE_ATTOM_ENABLED=true
 * See docs/archive/valuation-providers-v2-pause.md
 */
export function isAttomEnabled(): boolean {
  return parseEnvBool(Deno.env.get("FEATURE_ATTOM_ENABLED"));
}

/**
 * Check if ensemble valuation features are enabled.
 * This controls: ensemble blending, uncertainty ranges, ceiling caps.
 *
 * PAUSED_V2: Ensemble + uncertainty + ceiling paused - no AVM provider
 * Re-enable by setting FEATURE_ENSEMBLE_ENABLED=true
 * See docs/archive/valuation-providers-v2-pause.md
 */
export function isEnsembleEnabled(): boolean {
  return parseEnvBool(Deno.env.get("FEATURE_ENSEMBLE_ENABLED"));
}

/**
 * Check if calibration loop is enabled.
 *
 * PAUSED_V2: Calibration loop paused - depends on ensemble
 * Re-enable by setting FEATURE_CALIBRATION_ENABLED=true
 * See docs/archive/valuation-providers-v2-pause.md
 */
export function isCalibrationEnabled(): boolean {
  return parseEnvBool(Deno.env.get("FEATURE_CALIBRATION_ENABLED"));
}

/**
 * Type for paused feature stub responses.
 * Used when a feature is disabled to return a safe default.
 */
export type PausedFeatureStub<T> = {
  ok: false;
  paused: true;
  feature: string;
  reason: "feature_paused_v2";
  message: string;
  stub: T;
};

/**
 * Create a stub response for a paused feature.
 */
export function createPausedStub<T>(
  feature: string,
  stub: T,
): PausedFeatureStub<T> {
  return {
    ok: false,
    paused: true,
    feature,
    reason: "feature_paused_v2",
    message: `${feature} is paused for free data architecture pivot. See docs/archive/valuation-providers-v2-pause.md`,
    stub,
  };
}
