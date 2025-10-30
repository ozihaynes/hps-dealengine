import { NextResponse } from 'next/server';
import { z } from 'zod';
import { computeUnderwriting } from '@hps-internal/engine';
import { checkRateLimit } from '@/lib/rateLimit';

const BodySchema = z.object({ deal: z.unknown() });

export async function POST(req: Request) {
  // Rate limit: 60/min per IP
  const rl = checkRateLimit(req, 'api:run-underwrite', 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
      { status: 429, headers: rl.headers }
    );
  }

  try {
    const json = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: 'BAD_REQUEST', message: 'Invalid body', details: parsed.error.flatten() },
        },
        { status: 400, headers: rl.headers }
      );
    }

    const results = computeUnderwriting(parsed.data.deal as any);
    return NextResponse.json({ ok: true, results }, { status: 200, headers: rl.headers });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: { code: 'SERVER_ERROR', message: err?.message ?? 'Unexpected' } },
      { status: 500, headers: rl.headers }
    );
  }
}
