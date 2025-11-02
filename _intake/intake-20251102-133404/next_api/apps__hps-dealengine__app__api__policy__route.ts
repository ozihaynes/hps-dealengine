import { NextRequest } from 'next/server';
import { SettingsSchema, policyDefaults } from '@hps-internal/contracts';
import { legacyPolicyMap } from '@hps-internal/contracts';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.join(process.cwd(), '.data');
const POLICY_PATH = path.join(DATA_DIR, 'policy.json');

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readPolicy() {
  try {
    const raw = await fs.readFile(POLICY_PATH, 'utf8');
    const parsed = SettingsSchema.parse(JSON.parse(raw));
    return parsed;
  } catch {
    return policyDefaults;
  }
}

export async function GET() {
  const policy = await readPolicy();
  return new Response(JSON.stringify({ ok: true, policy }), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'x-policy-path': POLICY_PATH,
    },
  });
}

export async function PUT(req: NextRequest) {
  try {
    await ensureDataDir();
    const body = (await req.json()) as any;

    // Accept either {policy: {...}} or a raw policy object
    const incoming = body?.policy && typeof body.policy === 'object' ? body.policy : body;

    // Map legacy fields to tokens, then validate
    const merged = { ...policyDefaults, ...legacyPolicyMap(incoming), ...incoming };
    const policy = SettingsSchema.parse(merged);

    await fs.writeFile(POLICY_PATH, JSON.stringify(policy, null, 2), 'utf8');

    return new Response(JSON.stringify({ ok: true, policy }), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'x-policy-path': POLICY_PATH,
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: { message: err?.message ?? 'Invalid policy' } }),
      { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } }
    );
  }
}
