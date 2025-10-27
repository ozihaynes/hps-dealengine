// apps/dealengine/app/api/underwrite/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { normalizePayload } from '../../../lib/contract-adapter';
import { runEngine } from '@hps-internal/engine';

const DealSchema = z.record(z.string(), z.any()).optional();
const UnderwriteInputSchema = z
  .object({
    deal: DealSchema,
    policy: z.record(z.string(), z.any()).optional(),
  })
  .passthrough();

export async function GET() {
  return NextResponse.json({ ok: true, route: '/api/underwrite' });
}

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    const normalized = normalizePayload(json);
    const parsed = UnderwriteInputSchema.safeParse(normalized);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'Invalid payload', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const inputForEngine = (parsed.data.deal ?? parsed.data) as Record<string, unknown>;
    const result = runEngine(inputForEngine);

    return NextResponse.json({
      ok: true,
      math: result?.math ?? {},
      echoes: { input: inputForEngine, raw: parsed.data },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message ?? 'underwrite failed' },
      { status: 500 }
    );
  }
}
