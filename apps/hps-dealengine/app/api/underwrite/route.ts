import { NextResponse } from 'next/server';
import { z } from 'zod';
import { computeUnderwriting } from '@hps-internal/engine';
import { checkRateLimit } from '@/lib/rateLimit';

const HEADER = 'x-internal-key';
const BodySchema = z.object({ deal: z.unknown() });

export async function POST(req: Request) {
  // Require internal key
  const requiredKey = process.env.INTERNAL_API_KEY;
  if (!requiredKey) {
    return NextResponse.json(
      { ok: false, error: { code: 'CONFIG', message: 'INTERNAL_API_KEY not set' } },
      { status: 500 }
    );
  }
  const gotKey = req.headers.get(HEADER);
  if (gotKey !== requiredKey) {
    return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  // Rate limit (separate bucket for internal)
  const rl = checkRateLimit(req, 'api:underwrite', 120, 60_000);
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
