import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const USER = process.env.BASIC_AUTH_USER || '';
const PASS = process.env.BASIC_AUTH_PASS || '';

function unauthorized() {
  return new NextResponse('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
  });
}

export function middleware(req: NextRequest) {
  // If creds not set, let everything through (handy for local scaffolding)
  if (!USER || !PASS) return NextResponse.next();

  const header = req.headers.get('authorization');
  if (!header?.startsWith('Basic ')) return unauthorized();

  const base64 = header.split(' ')[1] || '';
  const [u, p] = atob(base64).split(':');

  if (u !== USER || p !== PASS) return unauthorized();
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
