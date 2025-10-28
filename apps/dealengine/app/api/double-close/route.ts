import { NextResponse } from 'next/server';
import { z } from 'zod';
import { doubleCloseSimple, computeDoubleClose } from '@hps-internal/engine';

// Accept either simple-math OR FL-detailed input
const SimpleSchema = z.object({
  sellerPrice: z.number(),
  buyerPrice: z.number(),
  aToBCloseCosts: z.number(),
  bToCCloseCosts: z.number(),
  holdingDays: z.number().nonnegative(),
  carryPerDay: z.number().nonnegative(),
});

const FLDetailSchema = z.object({
  ab_price: z.number(),
  bc_price: z.number(),
  hold_days: z.number().nonnegative().optional(),
  monthly_carry: z.number().nonnegative().optional(),
  county: z.string().optional(),
  miami_dade: z.boolean().optional(),
  property_type: z.enum(['SFR', 'OTHER']).optional(),
  ab_pages: z.number().int().positive().optional(),
  bc_pages: z.number().int().positive().optional(),
});

const BodySchema = z.union([SimpleSchema, FLDetailSchema]);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const data: any = parsed.data;
    const isSimple = 'sellerPrice' in data && 'buyerPrice' in data;

    const result = isSimple ? doubleCloseSimple(data) : computeDoubleClose(data);

    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
