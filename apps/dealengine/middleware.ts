/* apps/dealengine/middleware.ts */
/* Runs at the edge. Protects pages with Basic Auth.
   Optionally enforces x-internal-key on /api/* if ENFORCE_API_KEY="true". */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const USER = process.env.BASIC_AUTH_USER ?? '';
const PASS = process.env.BASIC_AUTH_PASS ?? '';
const API_KEY = process.env.INTERNAL_API_KEY ?? '';
const ENFORCE_API = (process.env.ENFORCE_API_KEY ?? '').toLowerCase() === 'true';

function basicAuthOk(req: NextRequest) {
  if (!USER || !PASS) return true; // auth disabled if creds not set
  const auth = req.headers.get('authorization') || '';
  const expected = 'Basic ' + btoa(`${USER}:${PASS}`);
  return auth === expected;
}

function apiKeyOk(req: NextRequest) {
  if (!ENFORCE_API) return true; // not enforced
  if (!API_KEY) return true; // nothing to check against
  return req.headers.get('x-internal-key') === API_KEY;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static & public always pass (redundant to matcher, but safe)
  if (pathname.startsWith('/_next/') || pathname === '/favicon.ico' || pathname === '/robots.txt') {
    return NextResponse.next();
  }

  // APIs: enforce only if configured
  if (pathname.startsWith('/api')) {
    if (!apiKeyOk(req)) {
      return NextResponse.json(
        { ok: false, error: 'unauthorized' },
        { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="HPS API"' } }
      );
    }
    return NextResponse.next();
  }

  // Pages: Basic Auth if creds present
  if (!basicAuthOk(req)) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="HPS DealEngine"' },
    });
  }

  return NextResponse.next();
}

// Run on everything except known statics; we handle /api inside the middleware
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt).*)'],
};
