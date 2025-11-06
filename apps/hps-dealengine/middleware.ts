// apps/hps-dealengine/middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const config = {
  // Protect “pages” only; let assets/api pass through.
  matcher: ['/((?!_next|static|favicon.ico|api).*)'],
};

export function middleware(req: NextRequest) {
  const enabled = process.env.BASIC_AUTH_ENABLED === 'true';
  const vercelEnv = process.env.VERCEL_ENV || process.env.NODE_ENV; // 'development' | 'preview' | 'production'

  // Skip Basic Auth on Vercel Preview/Production so reviewers can browse
  if (!enabled || vercelEnv === 'preview' || vercelEnv === 'production') {
    return NextResponse.next();
  }

  const user = process.env.BASIC_AUTH_USER || '';
  const pass = process.env.BASIC_AUTH_PASS || '';
  const auth = req.headers.get('authorization') || '';
  const basic = auth.startsWith('Basic ') ? auth.slice(6) : '';
  try {
    const [u, p] = atob(basic).split(':');
    if (u === user && p === pass) return NextResponse.next();
  } catch {
    /* fall through to 401 */
  }

  return new NextResponse('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="HPS DealEngine"' },
  });
}
