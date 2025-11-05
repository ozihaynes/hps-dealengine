import type { DecisionTrace } from '../types';

export function pushTrace(
  trace: DecisionTrace,
  rule: string,
  used?: Record<string, unknown>,
  note?: string
) {
  trace.push({ rule, used, note });
}
