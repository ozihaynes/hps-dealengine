import { NextResponse } from 'next/server';
import { z } from 'zod';
import { doubleClose } from '@hps-internal/engine';
import { checkRateLimit } from '@/lib/rateLimit';

// Simple math variant
const SimpleSchema = z.object({
  sellerPrice: z.number().finite().nonnegative(),
  buyerPrice: z.number().finite().nonnegative(),
  aToBCloseCosts: z.number().finite().nonnegative(),
  bToCCloseCosts: z.number().finite().nonnegative(),
  holdingDays: z.number().finite().nonnegative(),
  carryPerDay: z.number().finite().nonnegative(),
});

export async function POST(req: Request) {
  const rl = checkRateLimit(req, 'api:double-close', 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
      { status: 429, headers: rl.headers }
    );
  }

  try {
    const json = await req.json().catch(() => ({}));
    const parsed = SimpleSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Invalid payload for simple double-close',
            details: parsed.error.flatten(),
          },
        },
        { status: 400, headers: rl.headers }
      );
    }

    const results = doubleClose(parsed.data);
    return NextResponse.json({ ok: true, results }, { status: 200, headers: rl.headers });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: { code: 'SERVER_ERROR', message: err?.message ?? 'Unexpected' } },
      { status: 500, headers: rl.headers }
    );
  }
}
