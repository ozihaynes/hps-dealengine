import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // Later: validate { dealId, name, inputs, results? } and persist
  const payload = await req.json().catch(() => ({}));
  return NextResponse.json({ ok: true, data: { id: 'scenario-stub', ...payload } });
}
