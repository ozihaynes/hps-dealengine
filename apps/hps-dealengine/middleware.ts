// apps/hps-dealengine/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Skip auth on Vercel (Preview/Prod). Keep Basic Auth only for local dev.
export function middleware(req: NextRequest) {
  if (process.env.VERCEL) return NextResponse.next();

  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;
  if (!user || !pass) return NextResponse.next();

  const auth = req.headers.get('authorization');
  const expected = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
  if (auth !== expected) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="HPS DealEngine"' },
    });
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
