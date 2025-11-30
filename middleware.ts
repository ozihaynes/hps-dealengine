// Auth middleware temporarily disabled.
// We rely on client-side AuthGate + Supabase JS for auth gating in dev.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(_req: NextRequest) {
  // Always allow the request through.
  return NextResponse.next();
}

export const config = {
  // Keep matcher so the file stays wired, but it's now a no-op.
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
