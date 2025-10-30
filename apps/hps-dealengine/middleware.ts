import { NextResponse, type NextRequest } from 'next/server';

// Allow health checks without auth (optional)
const PUBLIC_PATHS = new Set<string>(['/api/health', '/api/version']);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static assets and public paths
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    PUBLIC_PATHS.has(pathname)
  ) {
    return NextResponse.next();
  }

  const user = process.env.APP_BASIC_AUTH_USER || process.env.BASIC_AUTH_USER;
  const pass = process.env.APP_BASIC_AUTH_PASS || process.env.BASIC_AUTH_PASS;

  // If not configured, allow through (dev-safe). In prod, keep these set in Vercel.
  if (!user || !pass) {
    return NextResponse.next();
  }

  const header = req.headers.get('authorization') || '';
  if (!header.startsWith('Basic ')) {
    return unauthorized();
  }

  try {
    // Edge runtime supports atob()
    const decoded = atob(header.slice(6)); // strip "Basic "
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

// Apply everywhere except static
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
