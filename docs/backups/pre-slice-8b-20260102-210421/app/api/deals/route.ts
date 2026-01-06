import { NextResponse } from 'next/server';
import { z } from 'zod';
import { listDeals, saveDeal } from '../../../lib/repos';

function readLimit(url: URL, def = 20, max = 100) {
  const raw = url.searchParams.get('limit');
  const n = Number(raw);
  if (!raw || !Number.isFinite(n) || n < 1) return def;
  return Math.min(max, Math.floor(n));
}

const CreateSchema = z.object({
  label: z.string().trim().default(''),
  deal: z.any(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = readLimit(url);
  const cursor = url.searchParams.get('cursor') ?? null;
  const { items, nextCursor } = await listDeals({ limit, cursor });
  return NextResponse.json({ ok: true, items, nextCursor });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'bad body', issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const rec = await saveDeal(parsed.data.label, parsed.data.deal);
  return NextResponse.json({ ok: true, ...rec });
}
