// packages/engine/src/index.ts
// ESM entrypoint for the deterministic underwriting engine (SOT-aligned).
import { computeUnderwriting } from "./compute_underwriting";
export { computeUnderwriting };
// Stable aliases so callers/tests can choose their preferred name.
export const underwrite = computeUnderwriting;
export const run = computeUnderwriting;
// Double-close exports (both names for compatibility).
export { doubleClose, computeDoubleClose } from "./double_close";
// If you already export types elsewhere, keep them there.
// (Do NOT import types from app; the app imports types from engine, not vice versa.)
