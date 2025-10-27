/**
 * packages/engine/src/index.ts
 * Public surface for the engine package.
 * (Underwrite stub preserved; real implementation will replace in a later step.)
 */

export type Deal = Record<string, unknown>;
export type UnderwriteOut = Record<string, unknown>;

export function runEngine(input: Deal): {
  ok: true;
  math: Record<string, unknown>;
  echoes: { input: Deal };
} {
  return { ok: true, math: {}, echoes: { input } };
}

// Double-Close API
export * from './double_close';
export * from './policy-defaults';
