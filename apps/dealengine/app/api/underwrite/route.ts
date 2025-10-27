import { NextResponse } from 'next/server';
import { computeUnderwrite } from '@hps-internal/engine';

export async function GET() {
  return NextResponse.json({ ok: true, route: '/api/underwrite' });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = computeUnderwrite({
      deal: body?.deal ?? {},
      policy: body?.policy ?? {},
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 400 });
  }
}
