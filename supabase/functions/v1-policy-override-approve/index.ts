import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

const BodySchema = z.object({
  overrideId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
});

serve(async (req: Request): Promise<Response> => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !anonKey) {
    return jsonResponse(
      req,
      { ok: false, error: "Missing Supabase env" },
      500,
    );
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: {
      headers: { Authorization: req.headers.get("Authorization") ?? "" },
    },
  });

  // Parse body
  let body: z.infer<typeof BodySchema>;
  try {
    const raw = await req.json();
    body = BodySchema.parse(raw);
  } catch (err) {
    return jsonResponse(
      req,
      { ok: false, error: "Invalid body", details: err },
      400,
    );
  }

  // Resolve caller
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user?.id) {
    return jsonResponse(req, { ok: false, error: "Unauthorized" }, 401);
  }
  const userId = userData.user.id as string;

  // ---------------------------------------------------------------------------
  // 1) Load the override row under RLS
  // ---------------------------------------------------------------------------
  const {
    data: overrideRow,
    error: overrideError,
  } = await supabase
    .from("policy_overrides")
    .select("id, org_id, status")
    .eq("id", body.overrideId)
    .maybeSingle();

  if (overrideError) {
    console.error(
      "[v1-policy-override-approve] override lookup failed",
      overrideError,
    );
    return jsonResponse(
      req,
      { ok: false, error: "Override lookup failed" },
      500,
    );
  }

  if (!overrideRow) {
    return jsonResponse(
      req,
      { ok: false, error: "Override not found" },
      404,
    );
  }

  const orgId = overrideRow.org_id as string;

  // ---------------------------------------------------------------------------
  // 2) Ensure caller is manager/vp/owner for this org
  // ---------------------------------------------------------------------------
  const {
    data: membership,
    error: memError,
  } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (memError) {
    console.error(
      "[v1-policy-override-approve] membership lookup failed",
      memError,
    );
    return jsonResponse(
      req,
      { ok: false, error: "Membership lookup failed" },
      500,
    );
  }

  if (!membership) {
    return jsonResponse(
      req,
      { ok: false, error: "Membership not found for this org" },
      403,
    );
  }

  const role = String(membership.role ?? "").toLowerCase();
  const managerRoles = ["manager", "vp", "owner"];

  if (!managerRoles.includes(role)) {
    return jsonResponse(
      req,
      { ok: false, error: "Forbidden: manager role required" },
      403,
    );
  }

  // ---------------------------------------------------------------------------
  // 3) Approve / reject under RLS
  // ---------------------------------------------------------------------------
  const newStatus = body.action === "approve" ? "approved" : "rejected";

  const {
    data: updated,
    error: updateError,
  } = await supabase
    .from("policy_overrides")
    .update({
      status: newStatus,
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })
    .eq("id", body.overrideId)
    .select("id, status, approved_at, approved_by")
    .single();

  if (updateError || !updated) {
    console.error(
      "[v1-policy-override-approve] update failed",
      updateError,
    );
    return jsonResponse(
      req,
      {
        ok: false,
        error: updateError?.message ?? "Update failed",
      },
      400,
    );
  }

  return jsonResponse(req, {
    ok: true,
    overrideId: updated.id,
    status: updated.status,
    approvedAt: updated.approved_at,
    approvedBy: updated.approved_by,
  });
});
