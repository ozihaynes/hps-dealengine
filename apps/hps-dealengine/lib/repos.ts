// apps/dealengine/lib/repos.ts
// Deterministic in-memory store for dev. Persists across hot-reloads via globalThis.

type DealRecord = {
  id: string;
  label: string;
  deal: any;
  createdAt: number;
  updatedAt: number;
};

type ScenarioRecord = {
  id: string;
  dealId: string;
  label: string;
  overrides: any;
  createdAt: number;
  updatedAt: number;
};

type Store = {
  deals: Map<string, DealRecord>;
  scenariosByDeal: Map<string, Map<string, ScenarioRecord>>;
};

const g = globalThis as any;
if (!g.__HPS_STORE__) {
  g.__HPS_STORE__ = {
    deals: new Map<string, DealRecord>(),
    scenariosByDeal: new Map<string, Map<string, ScenarioRecord>>(),
  } satisfies Store;
}
const store: Store = g.__HPS_STORE__ as Store;

function now() {
  return Date.now();
}
function uuid() {
  return globalThis.crypto?.randomUUID?.() ?? require('crypto').randomUUID();
}

// --- Deals ---
export async function listDeals(opts: { limit: number; cursor: string | null }) {
  const { limit, cursor } = opts;
  const all = Array.from(store.deals.values()).sort((a, b) => b.createdAt - a.createdAt);
  let startIdx = 0;
  if (cursor) {
    const i = all.findIndex((d) => d.id === cursor);
    startIdx = i >= 0 ? i + 1 : 0;
  }
  const slice = all.slice(startIdx, startIdx + limit);
  const nextCursor = slice.length === limit ? slice[slice.length - 1].id : null;
  return { items: slice, nextCursor };
}

export async function saveDeal(label: string, deal: any) {
  const rec: DealRecord = {
    id: uuid(),
    label: label ?? '',
    deal,
    createdAt: now(),
    updatedAt: now(),
  };
  store.deals.set(rec.id, rec);
  return rec;
}

export async function getDeal(id: string) {
  return store.deals.get(id) ?? null;
}

export async function updateDeal(id: string, patch: { label?: string; deal?: any }) {
  const cur = store.deals.get(id);
  if (!cur) return null;
  const next: DealRecord = {
    ...cur,
    label: patch.label ?? cur.label,
    deal: patch.deal ?? cur.deal,
    updatedAt: now(),
  };
  store.deals.set(id, next);
  return next;
}

export async function deleteDeal(id: string) {
  const ok = store.deals.delete(id);
  store.scenariosByDeal.delete(id);
  return ok;
}

// --- Scenarios ---
export async function listScenarios(
  dealId: string,
  opts: { limit: number; cursor: string | null }
) {
  const { limit, cursor } = opts;
  const bucket = store.scenariosByDeal.get(dealId);
  if (!bucket) return { items: [], nextCursor: null };

  const all = Array.from(bucket.values()).sort((a, b) => b.createdAt - a.createdAt);
  let startIdx = 0;
  if (cursor) {
    const i = all.findIndex((s) => s.id === cursor);
    startIdx = i >= 0 ? i + 1 : 0;
  }
  const slice = all.slice(startIdx, startIdx + limit);
  const nextCursor = slice.length === limit ? slice[slice.length - 1].id : null;
  return { items: slice, nextCursor };
}

export async function createScenario(dealId: string, overrides: any, label: string) {
  const deal = store.deals.get(dealId);
  if (!deal) return { ok: false as const, error: 'bad dealId (deal not found)' };

  const rec: ScenarioRecord = {
    id: uuid(),
    dealId,
    label: label ?? '',
    overrides: overrides ?? {},
    createdAt: now(),
    updatedAt: now(),
  };
  let bucket = store.scenariosByDeal.get(dealId);
  if (!bucket) {
    bucket = new Map<string, ScenarioRecord>();
    store.scenariosByDeal.set(dealId, bucket);
  }
  bucket.set(rec.id, rec);
  return { ok: true as const, scenario: rec };
}

export async function getScenario(dealId: string, id: string) {
  const bucket = store.scenariosByDeal.get(dealId);
  if (!bucket) return null;
  return bucket.get(id) ?? null;
}

export async function deleteScenario(dealId: string, id: string) {
  const bucket = store.scenariosByDeal.get(dealId);
  if (!bucket) return false;
  return bucket.delete(id);
}
