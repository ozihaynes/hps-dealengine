import { NextResponse } from 'next/server';

export async function GET() {
  // Later: read ?limit=&cursor= and return list from repo
  return NextResponse.json({ ok: true, data: [] });
}

export async function POST(req: Request) {
  // Later: validate { deal, results? } and persist via repo
  const payload = await req.json().catch(() => ({}));
  return NextResponse.json({ ok: true, data: { id: 'stub', ...payload } });
}
