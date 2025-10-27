import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ ok: true, route: '/api/double-close' });
}

export async function POST(req: Request) {
  const input = await req.json().catch(() => ({}));
  return NextResponse.json({ ok: true, echoes: input });
}
