// apps/dealengine/lib/repo-store.ts
// Global singleton in-memory store so all route handlers share the same data.

type Json = any;

export interface DealRecord {
  id: string;
  label?: string;
  createdAt: number;
  updatedAt: number;
  deal: Json;
}

export interface ScenarioRecord {
  id: string;
  dealId: string;
  label?: string;
  overrides: Partial<Json>;
  createdAt: number;
  updatedAt: number;
}

type Store = {
  deals: Map<string, DealRecord>;
  scenarios: Map<string, ScenarioRecord>;
  scenarioIdsByDeal: Map<string, string[]>;
};

// --- global singleton ---
const g = globalThis as any;
if (!g.__HPS_REPO_STORE__) {
  g.__HPS_REPO_STORE__ = {
    deals: new Map<string, DealRecord>(),
    scenarios: new Map<string, ScenarioRecord>(),
    scenarioIdsByDeal: new Map<string, string[]>(),
  } as Store;
}
const store: Store = g.__HPS_REPO_STORE__;

// --- utils ---
function newId() {
  // @ts-ignore
  return (
    globalThis.crypto?.randomUUID?.() ?? `id_${Math.random().toString(36).slice(2)}_${Date.now()}`
  );
}

// ---------- Deal CRUD ----------
export function saveDeal(deal: Json, label?: string): DealRecord {
  const id = newId();
  const now = Date.now();
  const rec: DealRecord = { id, label, createdAt: now, updatedAt: now, deal };
  store.deals.set(id, rec);
  return rec;
}

export function listDeals(
  limit = 20,
  cursor = 0
): { items: DealRecord[]; nextCursor: number | null } {
  const all = Array.from(store.deals.values()).sort((a, b) => b.createdAt - a.createdAt);
  const start = Number.isFinite(cursor) ? cursor : 0;
  const slice = all.slice(start, start + limit);
  const next = start + limit < all.length ? start + limit : null;
  return { items: slice, nextCursor: next };
}

export function getDeal(id: string): DealRecord | undefined {
  return store.deals.get(String(id));
}

export function updateDeal(
  id: string,
  patch: Partial<Pick<DealRecord, 'label' | 'deal'>>
): DealRecord | null {
  const rec = store.deals.get(String(id));
  if (!rec) return null;
  const now = Date.now();
  const merged: DealRecord = {
    ...rec,
    label: patch.label ?? rec.label,
    deal: patch.deal ? { ...rec.deal, ...patch.deal } : rec.deal,
    updatedAt: now,
  };
  store.deals.set(rec.id, merged);
  return merged;
}

export function deleteDeal(id: string): boolean {
  const key = String(id);
  const ok = store.deals.delete(key);
  const sids = store.scenarioIdsByDeal.get(key) ?? [];
  sids.forEach((sid) => store.scenarios.delete(sid));
  store.scenarioIdsByDeal.delete(key);
  return ok;
}

// ---------- Scenarios ----------
export function saveScenario(
  dealId: string,
  overrides: Partial<Json> = {},
  label?: string
): ScenarioRecord | null {
  const dId = String(dealId);
  if (!store.deals.has(dId)) return null;
  const id = newId();
  const now = Date.now();
  const rec: ScenarioRecord = { id, dealId: dId, overrides, label, createdAt: now, updatedAt: now };
  store.scenarios.set(id, rec);
  const arr = store.scenarioIdsByDeal.get(dId) ?? [];
  arr.unshift(id);
  store.scenarioIdsByDeal.set(dId, arr);
  return rec;
}

export function listScenarios(
  dealId: string,
  limit = 20,
  cursor = 0
): { items: ScenarioRecord[]; nextCursor: number | null } {
  const dId = String(dealId);
  const ids = store.scenarioIdsByDeal.get(dId) ?? [];
  const start = Number.isFinite(cursor) ? cursor : 0;
  const pageIds = ids.slice(start, start + limit);
  const items = pageIds.map((sid) => store.scenarios.get(sid)!).filter(Boolean);
  const next = start + limit < ids.length ? start + limit : null;
  return { items, nextCursor: next };
}

export function getScenario(id: string): ScenarioRecord | undefined {
  return store.scenarios.get(String(id));
}

export function deleteScenario(id: string): boolean {
  const sid = String(id);
  const rec = store.scenarios.get(sid);
  if (!rec) return false;
  store.scenarios.delete(sid);
  const arr = store.scenarioIdsByDeal.get(rec.dealId) ?? [];
  const idx = arr.indexOf(sid);
  if (idx >= 0) arr.splice(idx, 1);
  store.scenarioIdsByDeal.set(rec.dealId, arr);
  return true;
}
