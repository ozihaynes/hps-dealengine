// apps/hps-dealengine/middleware.ts
// Request correlation + pass-through middleware; auth remains client-side via AuthGate + Supabase JS.
// This avoids redirect loops in dev when Supabase sessions live in localStorage (not cookies).

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const requestHeaders = new Headers(req.headers);
  const existingRequestId = requestHeaders.get("x-request-id");
  const requestId = existingRequestId ?? crypto.randomUUID();

  if (!existingRequestId) {
    requestHeaders.set("x-request-id", requestId);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set("x-request-id", requestId);
  response.cookies.set("hps_request_id", requestId, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return response;
}

// Only run middleware for actual app routes (not static assets).
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
