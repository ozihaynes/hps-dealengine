import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { computeUnderwriting } from '@hps-internal/engine'; // explicit, no aliasing

const Body = z.object({
  deal: z.any(), // we trust the engine’s own guards for now
});

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization');
    if (!auth?.startsWith('Basic ')) {
      return NextResponse.json(
        { ok: false, error: { code: 'unauthorized', message: 'Basic auth required' } },
        { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' } }
      );
    }

    const json = await req.json();
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: 'bad_request', message: 'Invalid body', details: parsed.error.flatten() },
        },
        { status: 400 }
      );
    }

    const results = computeUnderwriting(parsed.data.deal as any);
    return NextResponse.json({ ok: true, results });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: { code: 'internal', message: err?.message ?? 'Unexpected error' } },
      { status: 500 }
    );
  }
}
