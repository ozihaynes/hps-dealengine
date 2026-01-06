/**
 * Utility Functions
 *
 * Shared utilities for the HPS DealEngine application.
 *
 * @module lib/utils
 */

// Number utilities (defensive number handling)
export { safeNumber, formatCurrency, formatPercent } from "./numbers";

// Display utilities (UI formatting)
export {
  formatCurrencyFull,
  formatNumber,
  safeDisplayValue,
  getVerdictConfig,
  getVelocityConfig,
  formatRelativeTime,
  type VerdictConfig,
} from "./display";
