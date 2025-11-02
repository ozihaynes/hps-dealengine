import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

// Ensure filesystem APIs are available
export const runtime = 'nodejs';

type Json = any;

const PREFS_CANDIDATES = [
  // App workspace
  path.resolve(process.cwd(), '.data', 'user_prefs.json'),
  // Monorepo fallback
  path.resolve(process.cwd(), 'apps', 'hps-dealengine', '.data', 'user_prefs.json'),
  // Parent fallback
  path.resolve(process.cwd(), '..', '.data', 'user_prefs.json'),
];

const DEFAULT_PREFS = {
  autorun_debounce_ms: 450,
  default_tab: 'underwrite',
  density: 'comfortable',
};

function findPrefsPath(): string {
  for (const p of PREFS_CANDIDATES) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {}
  }
  // If none exist yet, prefer the app workspace path
  return PREFS_CANDIDATES[0];
}

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadPrefs(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch {}
  return { ...DEFAULT_PREFS };
}

function savePrefs(filePath: string, prefs: Json) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(prefs, null, 2), 'utf8');
}

function sanitizeIncoming(body: Json) {
  const out: any = {};
  if (typeof body?.autorun_debounce_ms === 'number' && Number.isFinite(body.autorun_debounce_ms)) {
    out.autorun_debounce_ms = Math.max(0, Math.floor(body.autorun_debounce_ms));
  }
  if (typeof body?.default_tab === 'string') {
    out.default_tab = body.default_tab;
  }
  if (typeof body?.density === 'string') {
    out.density = body.density;
  }
  return out;
}

export async function GET() {
  const headers = new Headers();
  try {
    const prefsPath = findPrefsPath();
    const prefs = loadPrefs(prefsPath);
    headers.set('x-user-prefs-path', prefsPath);
    return NextResponse.json({ ok: true, prefs }, { headers });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: 'Failed to load user prefs' },
      { status: 500, headers }
    );
  }
}

export async function PUT(req: Request) {
  const headers = new Headers();
  try {
    const prefsPath = findPrefsPath();
    const current = loadPrefs(prefsPath);
    const body = await req.json().catch(() => ({}));
    const patch = sanitizeIncoming(body);
    const next = { ...current, ...patch };
    savePrefs(prefsPath, next);

    headers.set('x-user-prefs-path', prefsPath);
    return NextResponse.json({ ok: true, prefs: next }, { headers });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: 'Failed to save user prefs' },
      { status: 500, headers }
    );
  }
}
