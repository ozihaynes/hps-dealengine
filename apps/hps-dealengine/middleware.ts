import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PREFIXES = ['/api/health', '/api/version'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  const user = process.env.APP_BASIC_AUTH_USER || process.env.BASIC_AUTH_USER;
  const pass = process.env.APP_BASIC_AUTH_PASS || process.env.BASIC_AUTH_PASS;

  if (!user || !pass) return NextResponse.next();

  const header = req.headers.get('authorization') || '';
  if (!header.startsWith('Basic ')) return unauthorized();

  try {
    const decoded = atob(header.slice(6));
    const [u, p] = decoded.split(':');
    if (u === user && p === pass) return NextResponse.next();
    return unauthorized();
  } catch {
    return unauthorized();
  }
}

function unauthorized() {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Protected"' },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
