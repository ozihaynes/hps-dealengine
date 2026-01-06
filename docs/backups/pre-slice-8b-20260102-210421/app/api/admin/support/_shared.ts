import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const ADMIN_ROLES = ["owner", "manager", "vp"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

type SupabaseError = {
  message?: string;
  code?: string;
  details?: string;
};

export type RequestCorrelation = {
  requestId: string;
  traceId: string | null;
};

function pickEnv(keys: string[]): string | null {
  for (const key of keys) {
    const val = process.env[key]?.trim();
    if (val) return val;
  }
  return null;
}

export function parseAuthHeader(req: NextRequest): string | null {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") return null;
  return token.trim();
}

function normalizeHeaderValue(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function getRequestCorrelation(req: NextRequest): RequestCorrelation {
  const requestId =
    normalizeHeaderValue(req.headers.get("x-request-id")) ??
    normalizeHeaderValue(req.headers.get("x-hps-request-id")) ??
    crypto.randomUUID();
  const traceId =
    normalizeHeaderValue(req.headers.get("traceparent")) ??
    normalizeHeaderValue(req.headers.get("x-trace-id"));

  return { requestId, traceId };
}

export function createSupabaseWithJwt(accessToken: string): SupabaseClient {
  const supabaseUrl = pickEnv(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"]);
  const supabaseAnonKey = pickEnv(["SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]);

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables.");
  }
  if (!supabaseAnonKey.includes(".")) {
    throw new Error("Supabase anon key appears malformed.");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export function jsonError(
  message: string,
  status: number,
  details?: unknown,
  correlation?: RequestCorrelation | null,
) {
  const requestId = correlation?.requestId ?? crypto.randomUUID();
  const traceId = correlation?.traceId ?? null;
  const payload: Record<string, unknown> = {
    ok: false,
    error: message,
    requestId,
    details,
  };

  if (traceId) {
    payload.traceId = traceId;
  }

  const headers = new Headers();
  headers.set("x-request-id", requestId);
  if (traceId) {
    headers.set("x-trace-id", traceId);
  }

  return NextResponse.json(payload, { status, headers });
}

export function mapSupabaseError(
  error: SupabaseError | null,
  fallback: string,
  correlation?: RequestCorrelation | null,
) {
  if (!error) {
    return jsonError(fallback, 500, undefined, correlation);
  }
  const message = error.message ?? fallback;
  const isPermission =
    error.code === "42501" || message.toLowerCase().includes("permission denied");
  return jsonError(
    isPermission ? "forbidden" : fallback,
    isPermission ? 403 : 500,
    {
      message: error.message,
      code: error.code,
      details: error.details,
    },
    correlation,
  );
}
