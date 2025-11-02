import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Dev: skip auth entirely.
 * Prod: enforce Basic Auth for app pages; exclude /api, /_next, static assets, and common file types.
 */
export function middleware(req: NextRequest) {
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next();
  }

  const auth = req.headers.get('authorization') || '';
  const [scheme, encoded] = auth.split(' ');

  if (scheme !== 'Basic' || !encoded) {
    return new NextResponse('Authentication required.', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
    });
  }

  const [user, pass] = Buffer.from(encoded, 'base64').toString().split(':');

  const USER = process.env.BASIC_AUTH_USER || 'ozi';
  const PASS = process.env.BASIC_AUTH_PASS || 'Password';

  if (user !== USER || pass !== PASS) {
    return new NextResponse('Access denied.', { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Everything except /api, Next assets, static files, and common file types
    '/((?!api|_next|static|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map)).*)',
  ],
};
