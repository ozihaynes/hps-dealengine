// apps/hps-dealengine/middleware.ts
// Pass-through middleware: auth is handled client-side via AuthGate + Supabase JS.
// This avoids redirect loops in dev when Supabase sessions live in localStorage (not cookies).

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

// Only run middleware for actual app routes (not assets, api, etc.)
export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
