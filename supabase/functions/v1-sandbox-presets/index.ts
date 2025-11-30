import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const Postures = ["conservative", "base", "aggressive"] as const;

const ListQuerySchema = z.object({
  orgId: z.string().uuid().optional(),
  posture: z.enum(Postures).optional(),
});

const CreateSchema = z.object({
  orgId: z.string().uuid().optional(),
  name: z.string().min(1),
  posture: z.enum(Postures).optional().default("base"),
  settings: z.record(z.any()),
});

const DeleteSchema = z.object({
  orgId: z.string().uuid().optional(),
  id: z.string().uuid(),
});

type DbRow = {
  id: string;
  org_id: string;
  name: string;
  posture: (typeof Postures)[number];
  settings: Record<string, unknown>;
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
    console.error("[v1-sandbox-presets] memberships lookup failed", error);
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

function mapRow(row: DbRow) {
  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    posture: row.posture,
    settings: row.settings ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function handleList(req: Request) {
  const supabase = createSupabaseClient(req);
  const userId = await getUserId(supabase);
  const url = new URL(req.url);

  const parsedQuery = ListQuerySchema.safeParse({
    orgId: url.searchParams.get("orgId") ?? undefined,
    posture: (url.searchParams.get("posture") ??
      undefined) as (typeof Postures)[number] | undefined,
  });

  if (!parsedQuery.success) {
    return jsonResponse(
      req,
      { ok: false, error: parsedQuery.error.message },
      400,
    );
  }

  const orgId = await resolveOrgId(supabase, userId, parsedQuery.data.orgId);
  const posture = parsedQuery.data.posture;

  let query = supabase
    .from("sandbox_presets")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (posture) {
    query = query.eq("posture", posture);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[v1-sandbox-presets] list error", error);
    return jsonResponse(
      req,
      { ok: false, error: "Failed to load sandbox presets" },
      500,
    );
  }

  const presets = (data ?? []).map((row) => mapRow(row as DbRow));
  return jsonResponse(req, { ok: true, presets }, 200);
}

async function handleCreate(req: Request) {
  const supabase = createSupabaseClient(req);
  const userId = await getUserId(supabase);

  let payload: z.infer<typeof CreateSchema>;
  try {
    const json = await req.json();
    const parsed = CreateSchema.safeParse(json);
    if (!parsed.success) {
      return jsonResponse(
        req,
        { ok: false, error: parsed.error.message },
        400,
      );
    }
    payload = parsed.data;
  } catch (err) {
    console.error("[v1-sandbox-presets] failed to parse body", err);
    return jsonResponse(
      req,
      { ok: false, error: "Invalid JSON body" },
      400,
    );
  }

  const orgId = await resolveOrgId(supabase, userId, payload.orgId);

  const insertRow = {
    org_id: orgId,
    name: payload.name,
    posture: payload.posture ?? "base",
    settings: payload.settings ?? {},
  };

  const { data, error } = await supabase
    .from("sandbox_presets")
    .insert(insertRow)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[v1-sandbox-presets] insert error", error);
    return jsonResponse(
      req,
      { ok: false, error: "Failed to save preset" },
      500,
    );
  }

  const preset = mapRow(data as DbRow);
  return jsonResponse(req, { ok: true, preset }, 200);
}

async function handleDelete(req: Request) {
  const supabase = createSupabaseClient(req);
  const userId = await getUserId(supabase);

  let payload: z.infer<typeof DeleteSchema>;
  try {
    const json = await req.json();
    const parsed = DeleteSchema.safeParse(json);
    if (!parsed.success) {
      return jsonResponse(
        req,
        { ok: false, error: parsed.error.message },
        400,
      );
    }
    payload = parsed.data;
  } catch (err) {
    console.error("[v1-sandbox-presets] failed to parse body", err);
    return jsonResponse(
      req,
      { ok: false, error: "Invalid JSON body" },
      400,
    );
  }

  const orgId = await resolveOrgId(supabase, userId, payload.orgId);

  const { error } = await supabase
    .from("sandbox_presets")
    .delete()
    .eq("id", payload.id)
    .eq("org_id", orgId);

  if (error) {
    console.error("[v1-sandbox-presets] delete error", error);
    return jsonResponse(
      req,
      { ok: false, error: "Failed to delete preset" },
      500,
    );
  }

  return jsonResponse(req, { ok: true }, 200);
}

serve(async (req: Request): Promise<Response> => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    if (req.method === "GET") {
      return await handleList(req);
    }

    if (req.method === "POST") {
      return await handleCreate(req);
    }

    if (req.method === "DELETE") {
      return await handleDelete(req);
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
    console.error("[v1-sandbox-presets] unexpected error", err);
    return jsonResponse(req, { ok: false, error: "Internal server error" }, 500);
  }
});
