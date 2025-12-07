import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

const RequestSchema = z.object({
  dealId: z.string().uuid().optional(),
  posture: z.string().min(1),
  tokenKey: z.string().min(1),
  oldValue: z.any().optional(),
  newValue: z.any(),
  justification: z.string().min(1),
  runId: z.string().uuid().optional().nullable(),
}).refine((val) => !!val.dealId || !!val.runId, {
  message: "dealId or runId is required",
});

type MembershipRow = {
  org_id: string;
  role?: string | null;
};

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
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  let body: z.infer<typeof RequestSchema>;
  try {
    const raw = await req.json();
    body = RequestSchema.parse(raw);
  } catch (err) {
    return jsonResponse(
      req,
      { ok: false, error: "Invalid body", details: err },
      400,
    );
  }

  // Resolve the caller
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user?.id) {
    return jsonResponse(req, { ok: false, error: "Unauthorized" }, 401);
  }
  const userId = userData.user.id as string;

  // ---------------------------------------------------------------------------
  // Membership resolution (multi-org safe)
  // ---------------------------------------------------------------------------

  const { data: memberships, error: memError } = await supabase
    .from("memberships")
    .select("org_id, role")
    .eq("user_id", userId);

  if (memError) {
    console.error(
      "[v1-policy-override-request] memberships lookup failed",
      memError,
    );
    return jsonResponse(
      req,
      { ok: false, error: "Membership lookup failed" },
      500,
    );
  }

  if (!memberships || memberships.length === 0) {
    return jsonResponse(
      req,
      { ok: false, error: "Membership not found" },
      403,
    );
  }

  const typedMemberships = (memberships as MembershipRow[]).filter(
    (m) => !!m.org_id,
  );

  // Sort memberships by role priority: owner > vp > manager > everyone else
  const priorityIndex = (role?: string | null): number => {
    const r = (role ?? "").toLowerCase();
    if (r === "owner") return 0;
    if (r === "vp") return 1;
    if (r === "manager") return 2;
    return 3;
  };

  typedMemberships.sort(
    (a, b) => priorityIndex(a.role) - priorityIndex(b.role),
  );

  const membershipOrgIds = typedMemberships
    .map((m) => m.org_id)
    .filter((id): id is string => !!id);

  const primaryMembership = typedMemberships[0];

  let orgId: string | null = null;
  let policyVersionId: string | null = null;
  let dealId: string | null = body.dealId ?? null;
  let posture = body.posture;

  // If a runId was provided, prefer org/deal/posture from that run
  if (body.runId) {
    const {
      data: runRow,
      error: runError,
    } = await supabase
      .from("runs")
      .select("org_id, posture, deal_id, input")
      .eq("id", body.runId)
      .maybeSingle();

    if (runError) {
      console.error("[v1-policy-override-request] run lookup failed", {
        runId: body.runId,
        error: runError,
      });
      return jsonResponse(
        req,
        { ok: false, error: "Failed to load run for override" },
        500,
      );
    }

    if (!runRow) {
      return jsonResponse(
        req,
        { ok: false, error: "Run not found for override" },
        404,
      );
    }

    const runOrgId = (runRow as any).org_id as string | null;
    if (runOrgId && !membershipOrgIds.includes(runOrgId)) {
      return jsonResponse(
        req,
        { ok: false, error: "Forbidden: run not in caller orgs" },
        403,
      );
    }

    orgId = runOrgId ?? orgId;
    const inferredDealId =
      (runRow as any).deal_id ??
      ((runRow as any).input as any)?.dealId ??
      null;
    if (!dealId) {
      dealId = inferredDealId ?? null;
    }
    posture = (runRow as any).posture ?? posture;
  }

  // If still no orgId, use membership-derived ordering
  if (!orgId) {
    orgId = primaryMembership.org_id;
  }

  // Guard: caller must belong to resolved org
  if (orgId && !membershipOrgIds.includes(orgId)) {
    return jsonResponse(
      req,
      { ok: false, error: "Forbidden: membership not found for org" },
      403,
    );
  }

  // ---------------------------------------------------------------------------
  // Try to find a policy_version for the resolved org/posture
  // ---------------------------------------------------------------------------

  if (orgId) {
    const {
      data: pv,
      error: pvError,
    } = await supabase
      .from("policy_versions")
      .select("id")
      .eq("org_id", orgId)
      .eq("posture", posture)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pvError) {
      console.error(
        "[v1-policy-override-request] policy_versions lookup failed",
        { orgId, posture, error: pvError },
      );
    }

    if (pv?.id) {
      policyVersionId = pv.id as string;
    }
  }

  if (!policyVersionId) {
    for (const m of typedMemberships) {
      const thisOrgId = m.org_id;
      if (!thisOrgId) continue;

      const {
        data: pv,
        error: pvError,
      } = await supabase
        .from("policy_versions")
        .select("id")
        .eq("org_id", thisOrgId)
        .eq("posture", posture)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pvError) {
        console.error(
          "[v1-policy-override-request] policy_versions lookup failed (fallback)",
          { orgId: thisOrgId, posture, error: pvError },
        );
        continue;
      }

      if (pv?.id) {
        policyVersionId = pv.id as string;
        if (!orgId) {
          orgId = thisOrgId;
        }
        break;
      }
    }
  }

  if (!orgId) {
    return jsonResponse(
      req,
      { ok: false, error: "Membership not found for caller" },
      403,
    );
  }

  if (!policyVersionId) {
    console.warn(
      "[v1-policy-override-request] no policy_version found; creating override with null policy_version_id",
      { userId, orgId, posture: body.posture },
    );
  }

  const { data: inserted, error: insertError } = await supabase
    .from("policy_overrides")
    .insert({
      org_id: orgId,
      deal_id: dealId ?? null,
      run_id: body.runId ?? null,
      posture,
      token_key: body.tokenKey,
      old_value: body.oldValue ?? null,
      new_value: body.newValue,
      justification: body.justification,
      status: "pending",
      requested_by: userId,
      policy_version_id: policyVersionId, // may be null
    })
    .select("id, status")
    .single();

  if (insertError || !inserted) {
    return jsonResponse(
      req,
      { ok: false, error: insertError?.message ?? "Insert failed" },
      400,
    );
  }

  return jsonResponse(req, {
    ok: true,
    overrideId: inserted.id,
    status: inserted.status,
  });
});
