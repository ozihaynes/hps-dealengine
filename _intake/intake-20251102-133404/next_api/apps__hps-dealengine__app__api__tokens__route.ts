import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

// Node.js runtime for fs/path
export const runtime = 'nodejs';

type Json = any;

const CANDIDATES = [
  // App workspace
  path.resolve(process.cwd(), '.data', 'tokens.json'),
  // Monorepo fallback
  path.resolve(process.cwd(), 'apps', 'hps-dealengine', '.data', 'tokens.json'),
  // Parent fallback
  path.resolve(process.cwd(), '..', '.data', 'tokens.json'),
];

function findTokensPath(): string {
  for (const p of CANDIDATES) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {}
  }
  return CANDIDATES[0];
}

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadTokens(filePath: string): Record<string, Json> {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch {}
  return {};
}

function saveTokens(filePath: string, tokens: Record<string, Json>) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(tokens, null, 2), 'utf8');
}

// Accept only primitive values; coerce numeric-looking strings to numbers.
function sanitizePatch(x: unknown): Record<string, string | number | boolean> {
  if (!x || typeof x !== 'object') return {};
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
    if (typeof k !== 'string') continue;
    // encourage <TOKEN> shape but don't hard-block
    let val: unknown = v;
    if (typeof v === 'string') {
      const n = Number(v);
      if (Number.isFinite(n) && v.trim() !== '') val = n;
    }
    if (['string', 'number', 'boolean'].includes(typeof val)) {
      out[k] = val as any;
    }
  }
  return out;
}

export async function GET() {
  const headers = new Headers();
  try {
    const p = findTokensPath();
    const tokens = loadTokens(p);
    headers.set('x-token-path', p);
    return NextResponse.json({ ok: true, tokens }, { headers });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Failed to load tokens' },
      { status: 500, headers }
    );
  }
}

export async function PUT(req: Request) {
  const headers = new Headers();
  try {
    const p = findTokensPath();
    const current = loadTokens(p);
    const body = await req.json().catch(() => ({}));
    const patch = sanitizePatch(body);
    const next = { ...current, ...patch };
    saveTokens(p, next);
    headers.set('x-token-path', p);
    headers.set('x-token-updated-keys', Object.keys(patch).slice(0, 12).join(','));
    return NextResponse.json({ ok: true, tokens: next }, { headers });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Failed to save tokens' },
      { status: 500, headers }
    );
  }
}
