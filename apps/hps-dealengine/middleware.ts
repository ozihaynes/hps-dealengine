import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const USER = process.env.APP_BASIC_AUTH_USER || process.env.BASIC_AUTH_USER || '';
const PASS = process.env.APP_BASIC_AUTH_PASS || process.env.BASIC_AUTH_PASS || '';

function unauthorized() {
  return new NextResponse('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
  });
}

export function middleware(req: NextRequest) {
  // If creds aren’t set, don’t block (handy for scaffolding)
  if (!USER || !PASS) return NextResponse.next();

  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Basic ')) return unauthorized();

  const base64 = auth.split(' ')[1] || '';
  const [u, p] = atob(base64).split(':');

  if (u !== USER || p !== PASS) return unauthorized();
  return NextResponse.next();
}

// Protect everything except Next static assets & favicon
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
