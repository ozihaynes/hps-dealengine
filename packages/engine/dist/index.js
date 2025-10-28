// packages/engine/src/index.ts
// Primary underwriting
export { computeUnderwriting } from "./compute_underwriting.js";
export { runUnderwrite, underwrite } from "./run_underwrite.js";
// Double close (math + FL detailed)
export { doubleClose as doubleCloseSimple, doubleCloseFL, computeDoubleClose, } from "./double_close.js";
// (Optional) Re-export types here if you have a central types file.
// Example:
// export type { Deal, UnderwritePolicy, UnderwriteOut } from "./types.js";
