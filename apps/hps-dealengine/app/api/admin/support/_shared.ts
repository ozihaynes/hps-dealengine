import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const ADMIN_ROLES = ["owner", "manager", "vp"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

type SupabaseError = {
  message?: string;
  code?: string;
  details?: string;
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

export function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

export function mapSupabaseError(error: SupabaseError | null, fallback: string) {
  if (!error) {
    return jsonError(fallback, 500);
  }
  const message = error.message ?? fallback;
  const isPermission =
    error.code === "42501" || message.toLowerCase().includes("permission denied");
  return jsonError(isPermission ? "forbidden" : fallback, isPermission ? 403 : 500, {
    message: error.message,
    code: error.code,
    details: error.details,
  });
}
