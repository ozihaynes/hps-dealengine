import { NextResponse } from 'next/server';
import { computeDoubleClose } from '@hps-internal/engine';

export async function GET() {
  return NextResponse.json({ ok: true, route: '/api/double-close' });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = computeDoubleClose({
      ab_price: Number(body.ab_price ?? 0),
      bc_price: Number(body.bc_price ?? 0),
      county: (body.county ?? 'OTHER') as 'MIAMI-DADE' | 'OTHER',
      property_type: (body.property_type ?? 'SFR') as 'SFR' | 'OTHER',
      hold_days: Number(body.hold_days ?? 0),
      monthly_carry: Number(body.monthly_carry ?? 0),
      ab_note_amount: Number(body.ab_note_amount ?? 0),
      bc_note_amount: Number(body.bc_note_amount ?? 0),
      ab_pages: Number(body.ab_pages ?? 1),
      bc_pages: Number(body.bc_pages ?? 1),
    });
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 400 });
  }
}
