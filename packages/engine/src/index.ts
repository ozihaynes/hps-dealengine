export type Deal = Record<string, unknown>;
export type UnderwriteOut = Record<string, unknown>;

export function runEngine(input: Deal): {
  ok: true;
  math: Record<string, unknown>;
  echoes: { input: Deal };
} {
  return { ok: true, math: {}, echoes: { input } };
}
