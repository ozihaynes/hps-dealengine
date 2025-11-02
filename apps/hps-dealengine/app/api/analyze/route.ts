import { NextResponse } from 'next/server';
import path from 'node:path';
import fs from 'node:fs';

// Ensure filesystem APIs are available (Node.js runtime).
export const runtime = 'nodejs';

import { computeUnderwriting } from '@hps-internal/engine';

type Json = any;

const REGISTRY_CANDIDATES = [
  // App workspace (when Next dev runs from the app folder)
  path.resolve(process.cwd(), '.data', 'tokens.json'),
  // Monorepo root fallback
  path.resolve(process.cwd(), 'apps', 'hps-dealengine', '.data', 'tokens.json'),
  // Parent fallback
  path.resolve(process.cwd(), '..', '.data', 'tokens.json'),
];

function findTokenRegistryPath(): string {
  for (const p of REGISTRY_CANDIDATES) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {}
  }
  return REGISTRY_CANDIDATES[0];
}

function loadTokenRegistry(p: string): Record<string, unknown> {
  try {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  } catch {}
  return {};
}

function deepResolveTokens(
  value: Json,
  reg: Record<string, unknown>,
  stats: { replaced: number }
): Json {
  if (Array.isArray(value)) return value.map((v) => deepResolveTokens(v, reg, stats));
  if (value && typeof value === 'object') {
    const out: Record<string, Json> = {};
    for (const [k, v] of Object.entries(value as Record<string, Json>)) {
      out[k] = deepResolveTokens(v, reg, stats);
    }
    return out;
  }
  if (typeof value === 'string') {
    const key = value.trim();
    if (Object.prototype.hasOwnProperty.call(reg, key)) {
      stats.replaced++;
      return reg[key] as Json;
    }
  }
  return value;
}

export async function POST(req: Request) {
  const headers = new Headers();
  try {
    const body = await req.json().catch(() => ({}));
    const deal = body?.deal ?? {};
    const policy = body?.policy ?? {};
    const options = body?.options ?? {};

    const registryPath = findTokenRegistryPath();
    const registry = loadTokenRegistry(registryPath);

    const stats = { replaced: 0 };
    const resolvedPolicy = deepResolveTokens(policy, registry, stats);

    // Commonly used resolved values for debug headers
    const capAfter = (resolvedPolicy as any)?.aiv?.safety_cap_pct_token;
    const listPct = (resolvedPolicy as any)?.fees?.list_commission_pct_token;
    const concessionsPct = (resolvedPolicy as any)?.fees?.concessions_pct_token;
    const sellClosePct = (resolvedPolicy as any)?.fees?.sell_close_pct_token;

    // Carry preview tokens (string rule + numeric cap)
    const carryRule = (resolvedPolicy as any)?.carry?.dom_to_months_rule_token;
    const carryCap = (resolvedPolicy as any)?.carry?.months_cap_token;

    const result = computeUnderwriting(deal, resolvedPolicy);

    // Debug headers for quick verification in the client
    headers.set('x-token-registry-path', registryPath);
    headers.set('x-token-registry-exists', String(fs.existsSync(registryPath)));
    headers.set('x-token-registry-keys', Object.keys(registry).slice(0, 12).join(','));
    headers.set('x-token-resolved-count', String(stats.replaced));
    // AIV cap
    headers.set('x-cap-type', typeof capAfter);
    headers.set('x-cap-value', capAfter === undefined ? 'undefined' : String(capAfter));
    // Fees
    if (listPct !== undefined) headers.set('x-fee-list-commission-pct', String(listPct));
    if (concessionsPct !== undefined) headers.set('x-fee-concessions-pct', String(concessionsPct));
    if (sellClosePct !== undefined) headers.set('x-fee-sell-close-pct', String(sellClosePct));
    // Carry tokens (new)
    if (carryRule !== undefined) headers.set('x-carry-dom-rule', String(carryRule));
    if (carryCap !== undefined) headers.set('x-carry-cap-months', String(carryCap));

    return NextResponse.json({ ok: true, result }, { headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analyze failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
