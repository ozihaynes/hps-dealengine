import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs';

type Json = any;

const CANDIDATES = [
  path.resolve(process.cwd(), '.data', 'tokens.json'),
  path.resolve(process.cwd(), 'apps', 'hps-dealengine', '.data', 'tokens.json'),
  path.resolve(process.cwd(), '..', '.data', 'tokens.json'),
];

function findPath(): string {
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

function readTokens(file: string): Record<string, unknown> {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch {}
  return {};
}

export async function GET() {
  const file = findPath();
  const tokens = readTokens(file);
  const headers = new Headers();
  headers.set('x-tokens-path', file);
  headers.set('x-tokens-exists', String(fs.existsSync(file)));
  headers.set('cache-control', 'no-store');
  return NextResponse.json({ ok: true, tokens }, { headers });
}

export async function PUT(req: Request) {
  const file = findPath();
  const headers = new Headers();
  headers.set('cache-control', 'no-store');

  let body: Json = {};
  try {
    body = await req.json();
  } catch {}

  const next = body?.tokens;
  if (!next || typeof next !== 'object') {
    return NextResponse.json(
      { ok: false, error: 'Body must be { "tokens": { ... } }' },
      { status: 400, headers }
    );
  }

  // Coerce number-like strings to numbers, keep others as-is
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(next)) {
    if (typeof k !== 'string') continue;
    if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) {
      cleaned[k] = Number(v);
    } else {
      cleaned[k] = v;
    }
  }

  ensureDir(file);
  fs.writeFileSync(file, JSON.stringify(cleaned, null, 2), 'utf8');
  headers.set('x-tokens-path', file);

  return NextResponse.json(
    { ok: true, count: Object.keys(cleaned).length, tokens: cleaned },
    { headers }
  );
}
