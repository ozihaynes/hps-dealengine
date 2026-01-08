import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

/**
 * PUT /functions/v1/v1-profile-put
 *
 * Updates the authenticated user's profile.
 * Uses UPSERT for profiles that don't exist yet.
 *
 * Edge cases handled:
 * - EC-1.2: Display name empty string -> 400
 * - EC-1.3: Display name > 100 chars -> 400
 * - EC-1.4: Invalid phone format -> 400
 * - EC-1.5: Invalid timezone -> 400
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "[v1-profile-put] Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars. Requests will fail.",
  );
}

const ALLOWED_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "UTC",
] as const;

const ProfileUpdateSchema = z
  .object({
    display_name: z
      .string()
      .min(1, "Display name cannot be empty")
      .max(100, "Display name must be 100 characters or less")
      .optional(),
    phone: z
      .string()
      .regex(
        /^[\d\s\-\+\(\)]{7,20}$/,
        "Invalid phone format. Use digits, spaces, dashes, or parentheses (7-20 characters)",
      )
      .optional()
      .nullable(),
    timezone: z.enum(ALLOWED_TIMEZONES).optional(),
  })
  .refine(
    (val) =>
      val.display_name !== undefined ||
      val.phone !== undefined ||
      val.timezone !== undefined,
    {
      message: "No valid fields to update",
    },
  );

class HttpError extends Error {
  status: number;
  field?: string;
  constructor(status: number, message: string, field?: string) {
    super(message);
    this.status = status;
    this.field = field;
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

async function handlePut(req: Request) {
  const supabase = createSupabaseClient(req);

  // Get authenticated user
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user?.id) {
    console.error("[v1-profile-put] Auth error:", authError);
    return jsonResponse(req, { ok: false, error: "Unauthorized" }, 401);
  }

  const user = authData.user;

  // Parse and validate body
  let payload: z.infer<typeof ProfileUpdateSchema>;
  try {
    const json = await req.json();

    // Handle empty phone as null
    if (json.phone === "") {
      json.phone = null;
    }

    const parsed = ProfileUpdateSchema.safeParse(json);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      const field = firstError?.path?.[0]?.toString();
      return jsonResponse(
        req,
        {
          ok: false,
          error: firstError?.message ?? "Validation failed",
          field,
        },
        400,
      );
    }
    payload = parsed.data;
  } catch (err) {
    console.error("[v1-profile-put] Failed to parse body:", err);
    return jsonResponse(req, { ok: false, error: "Invalid JSON body" }, 400);
  }

  // Build update object
  const update: Record<string, unknown> = {
    id: user.id,
    updated_at: new Date().toISOString(),
  };

  if (payload.display_name !== undefined) {
    update.display_name = payload.display_name.trim();
  }
  if (payload.phone !== undefined) {
    update.phone = payload.phone?.trim() || null;
  }
  if (payload.timezone !== undefined) {
    update.timezone = payload.timezone;
  }

  // Upsert profile
  const { data: profile, error: upsertError } = await supabase
    .from("profiles")
    .upsert(update, { onConflict: "id" })
    .select(
      "id, display_name, avatar_url, phone, timezone, created_at, updated_at",
    )
    .single();

  if (upsertError || !profile) {
    console.error("[v1-profile-put] Upsert error:", upsertError);
    return jsonResponse(
      req,
      { ok: false, error: "Failed to update profile" },
      500,
    );
  }

  return jsonResponse(
    req,
    {
      ok: true,
      profile: mapProfile(profile as DbProfileRow),
      message: "Profile updated successfully",
    },
    200,
  );
}

serve(async (req: Request): Promise<Response> => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    if (req.method === "PUT") {
      return await handlePut(req);
    }

    return jsonResponse(req, { ok: false, error: "Method not allowed" }, 405);
  } catch (err) {
    if (err instanceof HttpError) {
      return jsonResponse(
        req,
        { ok: false, error: err.message, field: err.field },
        err.status,
      );
    }

    console.error("[v1-profile-put] Unexpected error:", err);
    return jsonResponse(
      req,
      { ok: false, error: "Internal server error" },
      500,
    );
  }
});
