// health/route.ts
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
const START = Date.now();
export async function GET() {
  const uptime_s = Math.round((Date.now() - START) / 1000);
  return NextResponse.json({ ok: true, uptime_s }, { status: 200 });
}
