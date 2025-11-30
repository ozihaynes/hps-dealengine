import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "[v1-user-settings] Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars. Requests will fail.",
  );
}

const QuerySchema = z.object({
  orgId: z.string().uuid().optional(),
});

const UpsertSchema = z
  .object({
    orgId: z.string().uuid().optional(),
    defaultPosture: z
      .enum(["conservative", "base", "aggressive"])
      .optional(),
    defaultMarket: z.string().min(1).optional(),
    theme: z.enum(["dark", "light", "system"]).optional(),
    uiPrefs: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(
    (val) =>
      val.defaultPosture !== undefined ||
      val.defaultMarket !== undefined ||
      val.theme !== undefined ||
      val.uiPrefs !== undefined,
    {
      message:
        "At least one of defaultPosture, defaultMarket, theme, or uiPrefs must be provided.",
    },
  );

type DbUserSettingsRow = {
  id: string;
  user_id: string;
  org_id: string;
  default_posture: string;
  default_market: string;
  theme: string;
  ui_prefs: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

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

async function getUserId(supabase: ReturnType<typeof createSupabaseClient>) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) {
    throw new HttpError(401, "Unauthorized");
  }
  return data.user.id as string;
}

async function resolveOrgId(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  requestedOrgId?: string,
) {
  const { data, error } = await supabase
    .from("memberships")
    .select("org_id")
    .eq("user_id", userId);

  if (error) {
    console.error("[v1-user-settings] memberships lookup failed", error);
    throw new HttpError(500, "Failed to resolve memberships");
  }

  const orgIds = (data ?? [])
    .map((row) => row.org_id as string | null)
    .filter((id): id is string => !!id)
    .sort();

  if (orgIds.length === 0) {
    throw new HttpError(403, "No memberships found for user");
  }

  if (requestedOrgId) {
    if (!orgIds.includes(requestedOrgId)) {
      throw new HttpError(403, "User is not a member of the requested org");
    }
    return requestedOrgId;
  }

  return orgIds[0];
}

function mapUserSettings(row: DbUserSettingsRow) {
  return {
    id: row.id,
    userId: row.user_id,
    orgId: row.org_id,
    defaultPosture: row.default_posture,
    defaultMarket: row.default_market,
    theme: row.theme,
    uiPrefs: row.ui_prefs ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function handleGet(req: Request) {
  const supabase = createSupabaseClient(req);
  const userId = await getUserId(supabase);

  const url = new URL(req.url);
  const parsedQuery = QuerySchema.safeParse({
    orgId: url.searchParams.get("orgId") ?? undefined,
  });

  if (!parsedQuery.success) {
    return jsonResponse(
      req,
      { ok: false, error: parsedQuery.error.message },
      400,
    );
  }

  const orgId = await resolveOrgId(supabase, userId, parsedQuery.data.orgId);

  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (error) {
    console.error("[v1-user-settings] select error", error);
    return jsonResponse(
      req,
      { ok: false, error: "Failed to load user settings" },
      500,
    );
  }

  const settings = data
    ? mapUserSettings(data as DbUserSettingsRow)
    : null;

  return jsonResponse(req, { ok: true, settings }, 200);
}

async function handlePut(req: Request) {
  const supabase = createSupabaseClient(req);
  const userId = await getUserId(supabase);

  let payload: z.infer<typeof UpsertSchema>;
  try {
    const json = await req.json();
    const parsed = UpsertSchema.safeParse(json);
    if (!parsed.success) {
      return jsonResponse(
        req,
        { ok: false, error: parsed.error.message },
        400,
      );
    }
    payload = parsed.data;
  } catch (err) {
    console.error("[v1-user-settings] failed to parse body", err);
    return jsonResponse(
      req,
      { ok: false, error: "Invalid JSON body" },
      400,
    );
  }

  const orgId = await resolveOrgId(supabase, userId, payload.orgId);

  const update: Record<string, unknown> = {
    user_id: userId,
    org_id: orgId,
  };

  if (payload.defaultPosture !== undefined) {
    update.default_posture = payload.defaultPosture;
  }
  if (payload.defaultMarket !== undefined) {
    update.default_market = payload.defaultMarket;
  }
  if (payload.theme !== undefined) {
    update.theme = payload.theme;
  }
  if (payload.uiPrefs !== undefined) {
    update.ui_prefs = payload.uiPrefs;
  }

  const { data, error } = await supabase
    .from("user_settings")
    .upsert(update, { onConflict: "user_id,org_id" })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[v1-user-settings] upsert error", error);
    return jsonResponse(
      req,
      { ok: false, error: "Failed to save user settings" },
      500,
    );
  }

  const settings = mapUserSettings(data as DbUserSettingsRow);
  return jsonResponse(req, { ok: true, settings }, 200);
}

serve(async (req: Request): Promise<Response> => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    if (req.method === "GET") {
      return await handleGet(req);
    }

    if (req.method === "PUT") {
      return await handlePut(req);
    }

    return jsonResponse(
      req,
      { ok: false, error: "Method not allowed" },
      405,
    );
  } catch (err) {
    if (err instanceof HttpError) {
      return jsonResponse(req, { ok: false, error: err.message }, err.status);
    }

    console.error("[v1-user-settings] unexpected error", err);
    return jsonResponse(
      req,
      { ok: false, error: "Internal server error" },
      500,
    );
  }
});
