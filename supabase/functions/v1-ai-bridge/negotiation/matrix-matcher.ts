import {
  NegotiationDealFacts,
  NegotiationMatrix,
  NegotiationMatrixRow,
  NegotiationModule,
} from "./matrix-types.ts";

function specificity(row: NegotiationMatrixRow): number {
  return Object.values(row.deal_facts ?? {}).filter((v) => v !== undefined && v !== null).length;
}

export interface MatchOptions {
  module?: NegotiationModule;
}

export function matchPreEmptiveScripts(
  matrix: NegotiationMatrix,
  facts: NegotiationDealFacts,
  options: MatchOptions = {},
): NegotiationMatrixRow[] {
  const candidates = matrix.rows.filter((row) => {
    if (options.module && row.module !== options.module) return false;

    const df = row.deal_facts ?? {};
    for (const key of Object.keys(df) as (keyof NegotiationDealFacts)[]) {
      const rowVal = df[key];
      if (rowVal === undefined || rowVal === null) continue;
      const factVal = facts[key];
      if (factVal !== rowVal) return false;
    }
    return true;
  });

  return candidates.sort((a, b) => specificity(b) - specificity(a));
}

export function selectPlaybookRows(matrix: NegotiationMatrix, facts: NegotiationDealFacts) {
  const modules: NegotiationModule[] = ["competence", "price_anchor", "objection_pivot", "negative_reverse"];
  const rowsByModule: Partial<Record<NegotiationModule, NegotiationMatrixRow>> = {};

  for (const module of modules) {
    const [best] = matchPreEmptiveScripts(matrix, facts, { module });
    if (best) rowsByModule[module] = best;
  }

  return rowsByModule;
}
