import { NextResponse } from 'next/server';
import { z } from 'zod';
import { normalizePayload } from '../../../lib/contract-adapter';
import { compute_double_close, dcPolicyDefaults, type DCInput } from '@hps-internal/engine';

const DCInputSchema = z
  .object({
    ab_price: z.number(),
    bc_price: z.number(),
    county: z.enum(['MIAMI-DADE', 'OTHER']),
    property_type: z.enum(['SFR', 'OTHER']),
    ab_note_amount: z.number().optional(),
    bc_note_amount: z.number().optional(),
    ab_pages: z.number().int().positive().optional(),
    bc_pages: z.number().int().positive().optional(),
    hold_days: z.number().int().nonnegative().optional(),
    daily_carry: z.number().nonnegative().optional(),
    monthly_carry: z.number().nonnegative().optional(),
  })
  .passthrough();

export async function GET() {
  return NextResponse.json({ ok: true, route: '/api/double-close' });
}

export async function POST(req: Request) {
  try {
    const raw = await req.json().catch(() => ({}));
    const normalized = normalizePayload(raw);
    const parsed = DCInputSchema.safeParse(normalized);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'Invalid payload', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = parsed.data as DCInput;
    const result = compute_double_close(input, undefined, dcPolicyDefaults);
    return NextResponse.json({ ok: true, data: result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message ?? 'double-close failed' },
      { status: 500 }
    );
  }
}
