import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

/**
 * GET /functions/v1/v1-profile-get
 *
 * Fetches the authenticated user's profile.
 * RLS ensures users can only access their own profile.
 *
 * Edge cases handled:
 * - EC-1.1: Profile doesn't exist -> Returns skeleton with is_new=true
 * - Invalid auth -> Returns 401
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "[v1-profile-get] Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars. Requests will fail.",
  );
}

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function createSupabaseClient(req: Request) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new HttpError(
      500,
      "SUPABASE_URL or SUPABASE_ANON_KEY is not configured",
    );
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: req.headers.get("Authorization") ?? "",
      },
    },
  });
}

type DbProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
};

function mapProfile(row: DbProfileRow) {
  return {
    id: row.id,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    phone: row.phone,
    timezone: row.timezone,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function handleGet(req: Request) {
  const supabase = createSupabaseClient(req);

  // Get authenticated user
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user?.id) {
    console.error("[v1-profile-get] Auth error:", authError);
    return jsonResponse(req, { ok: false, error: "Unauthorized" }, 401);
  }

  const user = authData.user;

  // Fetch profile
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select(
      "id, display_name, avatar_url, phone, timezone, created_at, updated_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (fetchError) {
    console.error("[v1-profile-get] Profile fetch error:", fetchError);
    return jsonResponse(
      req,
      { ok: false, error: "Failed to fetch profile" },
      500,
    );
  }

  // EC-1.1: Profile doesn't exist - return skeleton
  if (!profile) {
    console.log(
      `[v1-profile-get] Profile not found for user ${user.id}, returning skeleton`,
    );
    const now = new Date().toISOString();
    return jsonResponse(
      req,
      {
        ok: true,
        profile: {
          id: user.id,
          display_name: user.email?.split("@")[0] ?? "User",
          avatar_url: null,
          phone: null,
          timezone: "America/New_York",
          created_at: now,
          updated_at: now,
        },
        email: user.email,
        is_new: true,
      },
      200,
    );
  }

  return jsonResponse(
    req,
    {
      ok: true,
      profile: mapProfile(profile as DbProfileRow),
      email: user.email,
      is_new: false,
    },
    200,
  );
}

serve(async (req: Request): Promise<Response> => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    if (req.method === "GET") {
      return await handleGet(req);
    }

    return jsonResponse(req, { ok: false, error: "Method not allowed" }, 405);
  } catch (err) {
    if (err instanceof HttpError) {
      return jsonResponse(req, { ok: false, error: err.message }, err.status);
    }

    console.error("[v1-profile-get] Unexpected error:", err);
    return jsonResponse(
      req,
      { ok: false, error: "Internal server error" },
      500,
    );
  }
});
