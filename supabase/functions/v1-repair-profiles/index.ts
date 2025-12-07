import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { corsHeaders, handleOptions, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const DEBUG_PROFILES = Deno.env.get("DEBUG_REPAIR_PROFILES") === "true";

const Postures = ["conservative", "base", "aggressive"] as const;
const ERROR_CODES = {
  CONFIG: "REPAIR_PROFILES_CONFIG",
  AUTH: "REPAIR_PROFILES_AUTH",
  ORG_FORBIDDEN: "REPAIR_PROFILES_FORBIDDEN",
  VALIDATION: "REPAIR_PROFILES_VALIDATION",
  BAD_JSON: "REPAIR_PROFILES_BAD_JSON",
  LIST: "REPAIR_PROFILES_LIST",
  CREATE: "REPAIR_PROFILES_CREATE",
  UPDATE: "REPAIR_PROFILES_UPDATE",
  UNEXPECTED: "REPAIR_PROFILES_ERROR",
} as const;

type DebugDetails = Record<string, unknown>;

function debugLog(
  message: string,
  details?: DebugDetails,
  opts?: { force?: boolean },
) {
  if (!DEBUG_PROFILES && !opts?.force) return;
  if (details) {
    console.log("[v1-repair-profiles]", message, details);
  } else {
    console.log("[v1-repair-profiles]", message);
  }
}

const ListQuerySchema = z.object({
  dealId: z.string().uuid().optional(),
  marketCode: z.string().min(1, "marketCode is required"),
  posture: z.enum(Postures, {
    errorMap: () => ({ message: "posture is required" }),
  }),
  includeInactive: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
});

const DateStringSchema = z
  .string()
  .min(1)
  .regex(/^\d{4}-\d{2}-\d{2}$/, "asOf must be YYYY-MM-DD");

const PsfSchema = z.object({
  none: z.number().nonnegative().default(0),
  light: z.number().nonnegative().default(0),
  medium: z.number().nonnegative().default(0),
  heavy: z.number().nonnegative().default(0),
});

const Big5Schema = z.object({
  roof: z.number().nonnegative().default(0),
  hvac: z.number().nonnegative().default(0),
  repipe: z.number().nonnegative().default(0),
  electrical: z.number().nonnegative().default(0),
  foundation: z.number().nonnegative().default(0),
});

const LineItemSchema = z.record(
  z.string(),
  z.union([z.number(), z.record(z.string(), z.number())]),
);

const CreateSchema = z.object({
  dealId: z.string().uuid().optional(),
  name: z.string().min(1),
  marketCode: z.string().min(1),
  posture: z.enum(Postures).default("base").optional(),
  asOf: DateStringSchema.optional(),
  source: z.string().optional().nullable(),
  version: z.string().min(1).optional(),
  psfTiers: PsfSchema,
  big5: Big5Schema,
  lineItemRates: LineItemSchema.optional(),
  cloneFromId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

const UpdateSchema = z.object({
  dealId: z.string().uuid().optional(),
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  asOf: DateStringSchema.optional(),
  source: z.string().optional().nullable(),
  version: z.string().min(1).optional(),
  psfTiers: PsfSchema.optional(),
  big5: Big5Schema.optional(),
  lineItemRates: LineItemSchema.optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

type DbRow = {
  id: string;
  org_id: string;
  name: string;
  market_code: string;
  posture: (typeof Postures)[number];
  as_of: string;
  source: string | null;
  version: string;
  is_active: boolean;
  is_default: boolean;
  repair_psf_tiers: Record<string, number> | null;
  repair_big5: Record<string, number> | null;
  line_item_rates: Record<string, unknown> | null;
  created_at: string;
  created_by: string | null;
};

class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function getMethodOverride(req: Request): "PUT" | "PATCH" | null {
  const override =
    req.headers.get("x-http-method-override") ??
    req.headers.get("x-method-override");
  if (!override) return null;

  const normalized = override.trim().toUpperCase();
  if (normalized === "PUT" || normalized === "PATCH") {
    return normalized as "PUT" | "PATCH";
  }
  return null;
}

function createSupabaseClient(req: Request) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new HttpError(
      500,
      ERROR_CODES.CONFIG,
      "SUPABASE_URL or SUPABASE_ANON_KEY is not configured",
    );
  }

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: req.headers.get("Authorization") ?? "",
      },
    },
  });

  if (DEBUG_PROFILES) {
    debugLog("createSupabaseClient", {
      hasAuthHeader: !!req.headers.get("Authorization"),
    });
  }

  return client;
}

async function getUserId(supabase: ReturnType<typeof createSupabaseClient>) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) {
    throw new HttpError(401, ERROR_CODES.AUTH, "Unauthorized");
  }
  return data.user.id as string;
}

async function getCallerOrgId(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
) {
  debugLog("get_caller_org rpc", { userId }, { force: true });
  const { data, error } = await supabase.rpc("get_caller_org");

  if (error) {
    console.error("[v1-repair-profiles] org lookup failed", error);
    debugLog(
      "org resolution failed",
      { reason: "membership_rpc_error", userId },
      { force: true },
    );
    throw new HttpError(500, ERROR_CODES.AUTH, "Failed to resolve memberships");
  }

  if (!data) {
    debugLog(
      "org resolution failed",
      { reason: "membership_not_found", userId },
      { force: true },
    );
    throw new HttpError(403, ERROR_CODES.ORG_FORBIDDEN, "No memberships found for user");
  }

  return data as string;
}

async function resolveOrgIdFromDealOrMembership(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  dealId?: string,
) {
  if (dealId) {
    debugLog(
      "resolving org via deal",
      { dealId, userId },
      { force: true },
    );
    const { data, error } = await supabase
      .from("deals")
      .select("org_id")
      .eq("id", dealId)
      .maybeSingle();
    if (error) {
      console.error("[v1-repair-profiles] deal lookup failed", error);
      debugLog(
        "org resolution failed",
        { reason: "deal_lookup_error", dealId, userId },
        { force: true },
      );
      throw new HttpError(500, ERROR_CODES.AUTH, "Failed to resolve deal org");
    }
    if (!data?.org_id) {
      debugLog(
        "org resolution failed",
        { reason: "deal_missing_org", dealId, userId },
        { force: true },
      );
      throw new HttpError(
        404,
        ERROR_CODES.ORG_FORBIDDEN,
        "Deal not found or not accessible",
      );
    }
    debugLog(
      "org resolved from deal",
      { dealId, orgId: data.org_id, userId },
      { force: true },
    );
    return data.org_id as string;
  }
  const orgId = await getCallerOrgId(supabase, userId);
  debugLog(
    "org resolved from membership",
    { orgId, userId },
    { force: true },
  );
  return orgId;
}

function mapRow(row: DbRow) {
  const psf = row.repair_psf_tiers ?? {};
  const big5 = row.repair_big5 ?? {};

  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    marketCode: row.market_code,
    posture: row.posture,
    asOf: row.as_of,
    source: row.source,
    version: row.version,
    isActive: row.is_active,
    isDefault: row.is_default,
    psfTiers: {
      none: Number((psf as any).none ?? 0),
      light: Number((psf as any).light ?? 0),
      medium: Number((psf as any).medium ?? 0),
      heavy: Number((psf as any).heavy ?? 0),
    },
    big5: {
      roof: Number((big5 as any).roof ?? 0),
      hvac: Number((big5 as any).hvac ?? 0),
      repipe: Number((big5 as any).repipe ?? 0),
      electrical: Number((big5 as any).electrical ?? 0),
      foundation: Number((big5 as any).foundation ?? 0),
    },
    lineItemRates: row.line_item_rates ?? {},
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

async function ensureOrgAccess(
  supabase: ReturnType<typeof createSupabaseClient>,
  orgId: string,
) {
  // RLS enforces membership; this is a tripwire to give clearer errors early.
  const { data, error } = await supabase
    .from("memberships")
    .select("org_id")
    .eq("org_id", orgId)
    .limit(1);

  if (error) {
    console.error("[v1-repair-profiles] org access check failed", error);
    throw new HttpError(
      500,
      ERROR_CODES.ORG_FORBIDDEN,
      "Failed to validate org access",
    );
  }

  if (!data || data.length === 0) {
    throw new HttpError(403, ERROR_CODES.ORG_FORBIDDEN, "Access denied for org");
  }

  if (DEBUG_PROFILES) {
    debugLog("org access granted", { orgId });
  }
}

async function deactivateOthers(
  supabase: ReturnType<typeof createSupabaseClient>,
  orgId: string,
  marketCode: string,
  posture: (typeof Postures)[number],
  opts: { active?: boolean; markDefault?: boolean } = {},
) {
  const { active, markDefault } = opts;

  if (active) {
    const { error } = await supabase
      .from("repair_rate_sets")
      .update({ is_active: false })
      .eq("org_id", orgId)
      .eq("market_code", marketCode)
      .eq("posture", posture);

    if (error) {
      throw new HttpError(
        500,
        ERROR_CODES.UPDATE,
        "Failed to deactivate other active profiles",
      );
    }
  }

  if (markDefault) {
    const { error } = await supabase
      .from("repair_rate_sets")
      .update({ is_default: false })
      .eq("org_id", orgId)
      .eq("market_code", marketCode)
      .eq("posture", posture);

    if (error) {
      throw new HttpError(
        500,
        ERROR_CODES.UPDATE,
        "Failed to clear existing default profile",
      );
    }
  }
}

async function handleList(req: Request) {
  const supabase = createSupabaseClient(req);
  const userId = await getUserId(supabase);
  const url = new URL(req.url);
  const incomingQuery = {
    dealId: url.searchParams.get("dealId"),
    marketCode: url.searchParams.get("marketCode"),
    posture: url.searchParams.get("posture"),
    includeInactive: url.searchParams.get("includeInactive"),
  };

  debugLog(
    "list request received",
    {
      method: req.method,
      pathname: url.pathname,
      search: url.search,
      query: incomingQuery,
    },
    { force: true },
  );

  const parsedQuery = ListQuerySchema.safeParse({
    dealId: incomingQuery.dealId ?? undefined,
    marketCode: incomingQuery.marketCode ?? undefined,
    posture: (incomingQuery.posture ?? undefined) as
      | (typeof Postures)[number]
      | undefined,
    includeInactive: incomingQuery.includeInactive ?? undefined,
  });

  if (!parsedQuery.success) {
    debugLog(
      "list validation failed",
      { message: parsedQuery.error.message, issues: parsedQuery.error.issues },
      { force: true },
    );
    return jsonResponse(
      req,
      {
        ok: false,
        error: ERROR_CODES.VALIDATION,
        message: parsedQuery.error.message,
      },
      400,
    );
  }

  debugLog(
    "list parsed query",
    {
      dealId: parsedQuery.data.dealId ?? null,
      orgId: null,
      marketCode: parsedQuery.data.marketCode,
      posture: parsedQuery.data.posture,
      includeInactive: parsedQuery.data.includeInactive,
    },
    { force: true },
  );

  const orgId = await resolveOrgIdFromDealOrMembership(
    supabase,
    userId,
    parsedQuery.data.dealId,
  );
  debugLog(
    "list org resolved",
    {
      orgId,
      resolvedFrom: parsedQuery.data.dealId ? "deal" : "membership",
      dealId: parsedQuery.data.dealId ?? null,
    },
    { force: true },
  );
  await ensureOrgAccess(supabase, orgId);

  if (DEBUG_PROFILES) {
    debugLog("list resolved params", {
      orgId,
      marketCode: parsedQuery.data.marketCode,
      posture: parsedQuery.data.posture,
      includeInactive: parsedQuery.data.includeInactive,
    });
  }

  let query = supabase
    .from("repair_rate_sets")
    .select(
      "id, org_id, market_code, posture, name, is_active, is_default, as_of, source, version, repair_psf_tiers, repair_big5, line_item_rates, created_at, created_by",
    )
    .eq("org_id", orgId)
    .eq("market_code", parsedQuery.data.marketCode)
    .eq("posture", parsedQuery.data.posture);

  if (!parsedQuery.data.includeInactive) {
    query = query.eq("is_active", true);
  }

  query = query
    .order("is_default", { ascending: false })
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: true });

  const { data, error } = await query;
  if (error) {
    console.error("[v1-repair-profiles] list error", error);
    debugLog(
      "list query error",
      {
        orgId,
        marketCode: parsedQuery.data.marketCode,
        posture: parsedQuery.data.posture,
        includeInactive: parsedQuery.data.includeInactive ?? false,
        message: error?.message,
      },
      { force: true },
    );
    return jsonResponse(
      req,
      {
        ok: false,
        error: ERROR_CODES.LIST,
        message: "Failed to load repair profiles",
      },
      500,
    );
  }

  const profiles = (data ?? []).map((row) => mapRow(row as DbRow));
  debugLog(
    "list query result",
    {
      count: profiles.length,
      orgId,
      marketCode: parsedQuery.data.marketCode,
      posture: parsedQuery.data.posture,
      includeInactive: parsedQuery.data.includeInactive ?? false,
    },
    { force: true },
  );
  return jsonResponse(
    req,
    {
      ok: true,
      profiles,
      count: profiles.length,
      marketCode: parsedQuery.data.marketCode,
      posture: parsedQuery.data.posture,
    },
    200,
  );
}

async function handleCreate(req: Request) {
  const supabase = createSupabaseClient(req);
  const userId = await getUserId(supabase);

  let payload: z.infer<typeof CreateSchema>;
  try {
    const json = await req.json();
    if (DEBUG_PROFILES) {
      console.log("[v1-repair-profiles] create body", json);
    }
    const parsed = CreateSchema.safeParse(json);
    if (!parsed.success) {
      return jsonResponse(
        req,
        {
          ok: false,
          error: ERROR_CODES.VALIDATION,
          message: parsed.error.message,
          issues: parsed.error.issues,
        },
        400,
      );
    }
    payload = parsed.data;
  } catch (err) {
    console.error("[v1-repair-profiles] failed to parse body", err);
    return jsonResponse(
      req,
      { ok: false, error: ERROR_CODES.BAD_JSON, message: "Invalid JSON body" },
      400,
    );
  }

  const orgId = await resolveOrgIdFromDealOrMembership(
    supabase,
    userId,
    payload.dealId,
  );
  await ensureOrgAccess(supabase, orgId);

  let basePayload = payload;

  if (payload.cloneFromId) {
    const { data: cloneRow, error: cloneErr } = await supabase
      .from("repair_rate_sets")
      .select("*")
      .eq("org_id", orgId)
      .eq("id", payload.cloneFromId)
      .maybeSingle();

    if (cloneErr) {
      console.error("[v1-repair-profiles] clone lookup error", cloneErr);
      return jsonResponse(
        req,
        {
          ok: false,
          error: "REPAIR_PROFILE_CLONE_LOOKUP",
          message: "Failed to clone baseline profile",
        },
        500,
      );
    }

    if (!cloneRow) {
      return jsonResponse(
        req,
        {
          ok: false,
          error: "REPAIR_PROFILE_CLONE_SOURCE_NOT_FOUND",
          message: "Source repair profile not found or not accessible",
        },
        404,
      );
    }

    basePayload = {
      ...payload,
      asOf:
        payload.asOf ??
        ((cloneRow as any).as_of ? String((cloneRow as any).as_of) : undefined),
      source: payload.source ?? (cloneRow as any).source ?? "sandbox-clone",
      version:
        payload.version ??
        ((cloneRow as any).version ? String((cloneRow as any).version) : "sandbox"),
      psfTiers: (cloneRow as any).repair_psf_tiers ?? payload.psfTiers,
      big5: (cloneRow as any).repair_big5 ?? payload.big5,
      lineItemRates:
        (cloneRow as any).line_item_rates ?? payload.lineItemRates ?? {},
    };
  }

  const posture = basePayload.posture ?? "base";
  const psfTiers = PsfSchema.parse(basePayload.psfTiers ?? {});
  const big5 = Big5Schema.parse(basePayload.big5 ?? {});
  const lineItemRates = LineItemSchema.parse(basePayload.lineItemRates ?? {});

  const asOf = basePayload.asOf ?? null;
  const version = basePayload.version ?? null;

  if (!asOf || !version) {
    return jsonResponse(
      req,
      {
        ok: false,
        error: ERROR_CODES.CREATE,
        message: "Missing asOf or version for repair profile",
      },
      400,
    );
  }

  if (DEBUG_PROFILES) {
    console.log("[v1-repair-profiles] create resolved", {
      orgId,
      marketCode: basePayload.marketCode,
      posture,
      cloneFromId: payload.cloneFromId,
      isActive: basePayload.isActive,
      isDefault: basePayload.isDefault,
    });
  }

  if (basePayload.isActive) {
    await deactivateOthers(
      supabase,
      orgId,
      basePayload.marketCode,
      posture,
      { active: true },
    );
  }
  if (basePayload.isDefault) {
    await deactivateOthers(
      supabase,
      orgId,
      basePayload.marketCode,
      posture,
      { markDefault: true },
    );
  }

  const insertRow = {
    org_id: orgId,
    name: basePayload.name,
    market_code: basePayload.marketCode,
    posture,
    as_of: asOf,
    source: basePayload.source ?? (payload.cloneFromId ? "sandbox-clone" : null),
    version: version,
    is_active: basePayload.isActive ?? false,
    is_default: basePayload.isDefault ?? false,
    repair_psf_tiers: psfTiers,
    repair_big5: big5,
    line_item_rates: lineItemRates,
  };

  const { data, error } = await supabase
    .from("repair_rate_sets")
    .insert(insertRow)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[v1-repair-profiles] insert error", {
      message: error.message,
      code: (error as any)?.code,
      details: (error as any)?.details,
    });
    return jsonResponse(
      req,
      {
        ok: false,
        error: ERROR_CODES.CREATE,
        message: "Failed to create repair profile",
        details: error?.message ?? (error as any)?.details,
      },
      500,
    );
  }

  if (!data) {
    return jsonResponse(
      req,
      {
        ok: false,
        error: "REPAIR_PROFILE_CREATE_NOT_FOUND",
        message: "Repair profile not created or not accessible",
      },
      404,
    );
  }

  if (DEBUG_PROFILES) {
    console.log("[v1-repair-profiles] create success", {
      id: (data as DbRow).id,
      orgId: (data as DbRow).org_id,
      marketCode: (data as DbRow).market_code,
      posture: (data as DbRow).posture,
    });
  }

  return jsonResponse(req, { ok: true, profile: mapRow(data as DbRow) }, 200);
}

async function handleUpdate(req: Request) {
  const supabase = createSupabaseClient(req);
  const userId = await getUserId(supabase);

  let payload: z.infer<typeof UpdateSchema>;
  try {
    const json = await req.json();
    if (DEBUG_PROFILES) {
      console.log("[v1-repair-profiles] update body", json);
    }
    const parsed = UpdateSchema.safeParse(json);
    if (!parsed.success) {
      return jsonResponse(
        req,
        {
          ok: false,
          error: ERROR_CODES.VALIDATION,
          message: parsed.error.message,
          issues: parsed.error.issues,
        },
        400,
      );
    }
    payload = parsed.data;
  } catch (err) {
    console.error("[v1-repair-profiles] failed to parse update body", err);
    return jsonResponse(
      req,
      { ok: false, error: ERROR_CODES.BAD_JSON, message: "Invalid JSON body" },
      400,
    );
  }

  const orgId = await resolveOrgIdFromDealOrMembership(
    supabase,
    userId,
    payload.dealId,
  );
  await ensureOrgAccess(supabase, orgId);

  if (DEBUG_PROFILES) {
    console.log("[v1-repair-profiles] update resolved org", {
      orgId,
      id: payload.id,
    });
  }

  const { data: existing, error: fetchErr } = await supabase
    .from("repair_rate_sets")
    .select("*")
    .eq("id", payload.id)
    .eq("org_id", orgId)
    .maybeSingle();

  if (fetchErr) {
    console.error("[v1-repair-profiles] fetch error", fetchErr);
    return jsonResponse(
      req,
      {
        ok: false,
        error: ERROR_CODES.UPDATE,
        message: "Failed to load profile",
      },
      500,
    );
  }

  if (!existing) {
    return jsonResponse(
      req,
      { ok: false, error: ERROR_CODES.UPDATE, message: "Profile not found" },
      404,
    );
  }

  const existingRow = existing as DbRow;
  const posture = existingRow.posture;
  const marketCode = existingRow.market_code;

  if (DEBUG_PROFILES) {
    console.log("[v1-repair-profiles] update target", {
      orgId,
      id: payload.id,
      marketCode,
      posture,
      markActive: payload.isActive,
      markDefault: payload.isDefault,
    });
  }

  if (payload.isActive) {
    await deactivateOthers(
      supabase,
      orgId,
      marketCode,
      posture,
      { active: true },
    );
  }
  if (payload.isDefault) {
    await deactivateOthers(
      supabase,
      orgId,
      marketCode,
      posture,
      { markDefault: true },
    );
  }

  const updateRow: Record<string, unknown> = {};

  if (payload.name !== undefined) updateRow.name = payload.name;
  if (payload.asOf !== undefined) updateRow.as_of = payload.asOf;
  if (payload.source !== undefined) updateRow.source = payload.source;
  if (payload.version !== undefined) updateRow.version = payload.version;
  if (payload.psfTiers !== undefined) {
    updateRow.repair_psf_tiers = PsfSchema.parse(payload.psfTiers);
  }
  if (payload.big5 !== undefined) {
    updateRow.repair_big5 = Big5Schema.parse(payload.big5);
  }
  if (payload.lineItemRates !== undefined) {
    updateRow.line_item_rates = LineItemSchema.parse(payload.lineItemRates);
  }
  if (payload.isActive !== undefined) {
    updateRow.is_active = payload.isActive;
  }
  if (payload.isDefault !== undefined) {
    updateRow.is_default = payload.isDefault;
  }

  const { data, error } = await supabase
    .from("repair_rate_sets")
    .update(updateRow)
    .eq("id", payload.id)
    .eq("org_id", orgId)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[v1-repair-profiles] update error", {
      message: error.message,
      details: (error as any)?.details,
      code: (error as any)?.code,
    });
    return jsonResponse(
      req,
      {
        ok: false,
        error: ERROR_CODES.UPDATE,
        message: "Failed to update repair profile",
        details: error?.message ?? (error as any)?.details,
      },
      500,
    );
  }

  if (!data) {
    return jsonResponse(
      req,
      {
        ok: false,
        error: "REPAIR_PROFILE_NOT_FOUND",
        message: "Repair profile not found or not accessible",
      },
      404,
    );
  }

  if (DEBUG_PROFILES) {
    console.log("[v1-repair-profiles] update success", {
      id: (data as DbRow).id,
      orgId: (data as DbRow).org_id,
      marketCode,
      posture,
      isActive: (data as DbRow).is_active,
      isDefault: (data as DbRow).is_default,
    });
  }

  return jsonResponse(req, { ok: true, profile: mapRow(data as DbRow) }, 200);
}

serve(async (req: Request): Promise<Response> => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const override = getMethodOverride(req);

  try {
    if (req.method === "GET") {
      return await handleList(req);
    }
    if (req.method === "POST") {
      if (override === "PUT" || override === "PATCH") {
        return await handleUpdate(req);
      }
      return await handleCreate(req);
    }
    if (req.method === "PUT" || req.method === "PATCH") {
      return await handleUpdate(req);
    }

    return jsonResponse(
      req,
      {
        ok: false,
        error: ERROR_CODES.BAD_JSON,
        message: "Method not allowed",
      },
      405,
    );
  } catch (err) {
    if (err instanceof HttpError) {
      console.error("[v1-repair-profiles] error", {
        status: err.status,
        code: err.code,
        message: err.message,
      });
      return jsonResponse(
        req,
        { ok: false, error: err.code, message: err.message },
        err.status,
      );
    }
    console.error("[v1-repair-profiles] unexpected error", err);
    return jsonResponse(
      req,
      {
        ok: false,
        error: ERROR_CODES.UNEXPECTED,
        message: "Internal server error",
      },
      500,
    );
  }
});
