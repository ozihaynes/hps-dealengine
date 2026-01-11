import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/valuation.ts";
import {
  buildPopulationPlan,
  computeIdempotencyKey,
  mergeDealUpdates,
  sha256,
  type OverwriteMode,
  type MappingPrivate,
  type PopulationSummary,
  type FieldResult,
} from "../_shared/populationEngine.ts";

/**
 * v1-intake-populate
 *
 * Staff endpoint (JWT required) for populating deal fields from intake submission.
 * Deterministic and idempotent - same inputs produce same outputs.
 * Uses idempotency key to prevent duplicate writes on retry.
 */

serve(async (req: Request): Promise<Response> => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse(
      req,
      { ok: false, error: "method_not_allowed", message: "Use POST" },
      405
    );
  }

  // Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(
      req,
      { ok: false, error: "invalid_json", message: "Body must be valid JSON" },
      400
    );
  }

  const payload = body as {
    submission_id?: string;
    overwrite_mode?: OverwriteMode;
    overwrite_reasons?: Record<string, string>;
  };

  if (!payload.submission_id) {
    return jsonResponse(
      req,
      { ok: false, error: "invalid_request", message: "submission_id is required" },
      400
    );
  }

  const overwriteMode: OverwriteMode = payload.overwrite_mode ?? "skip";

  // Validate overwrite_reasons if overwrite mode
  if (overwriteMode === "overwrite" && !payload.overwrite_reasons) {
    return jsonResponse(
      req,
      { ok: false, error: "invalid_request", message: "overwrite_reasons required when overwrite_mode is 'overwrite'" },
      400
    );
  }

  let supabase;
  try {
    supabase = createSupabaseClient(req);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Supabase config missing";
    return jsonResponse(
      req,
      { ok: false, error: "config_error", message },
      500
    );
  }

  // Verify JWT and get user
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user?.id) {
    return jsonResponse(
      req,
      { ok: false, error: "unauthorized", message: "Valid JWT required" },
      401
    );
  }

  const userId = userData.user.id;

  try {
    // Get user's org memberships
    const { data: memberships, error: membershipError } = await supabase
      .from("memberships")
      .select("org_id")
      .eq("user_id", userId);

    if (membershipError) {
      console.error("[v1-intake-populate] memberships lookup failed", membershipError);
      return jsonResponse(
        req,
        { ok: false, error: "membership_lookup_failed", message: "Failed to resolve memberships" },
        500
      );
    }

    const memberOrgIds = (memberships ?? [])
      .map((row: { org_id: string | null }) => row.org_id)
      .filter((id): id is string => !!id);

    if (memberOrgIds.length === 0) {
      return jsonResponse(
        req,
        { ok: false, error: "no_memberships", message: "No memberships found for user" },
        403
      );
    }

    // Fetch submission with schema version
    const { data: submission, error: submissionError } = await supabase
      .from("intake_submissions")
      .select(`
        *,
        intake_schema_versions!intake_submissions_intake_schema_version_id_fkey (
          id, mapping_private_json
        )
      `)
      .eq("id", payload.submission_id)
      .in("org_id", memberOrgIds)
      .maybeSingle();

    if (submissionError) {
      console.error("[v1-intake-populate] submission query failed", submissionError);
      return jsonResponse(
        req,
        { ok: false, error: "query_failed", message: "Failed to fetch submission" },
        500
      );
    }

    if (!submission) {
      return jsonResponse(
        req,
        { ok: false, error: "not_found", message: "Submission not found or access denied" },
        404
      );
    }

    // Validate submission status
    const validStatuses = ["SUBMITTED", "PENDING_REVIEW"];
    if (!validStatuses.includes(submission.status)) {
      return jsonResponse(
        req,
        {
          ok: false,
          error: "invalid_status",
          message: `Submission must be in SUBMITTED or PENDING_REVIEW status (current: ${submission.status})`,
        },
        400
      );
    }

    // Check for pending or infected files
    const { data: files, error: filesError } = await supabase
      .from("intake_submission_files")
      .select("id, original_filename, scan_status, storage_state, object_key, mime_type, size_bytes, upload_key")
      .eq("intake_submission_id", submission.id);

    if (filesError) {
      console.error("[v1-intake-populate] files query failed", filesError);
      return jsonResponse(
        req,
        { ok: false, error: "query_failed", message: "Failed to fetch files" },
        500
      );
    }

    const pendingFiles = (files ?? []).filter(
      (f: { scan_status: string }) => f.scan_status === "PENDING"
    );
    const infectedFiles = (files ?? []).filter(
      (f: { scan_status: string }) => f.scan_status === "INFECTED"
    );

    if (pendingFiles.length > 0 || infectedFiles.length > 0) {
      return jsonResponse(
        req,
        {
          ok: false,
          error: "files_not_clean",
          message: "All files must pass virus scan before population",
          pending_files: pendingFiles.map((f: { original_filename: string }) => f.original_filename),
          infected_files: infectedFiles.map((f: { original_filename: string }) => f.original_filename),
        },
        400
      );
    }

    // Get mapping private JSON
    const schemaVersion = submission.intake_schema_versions;
    if (!schemaVersion?.mapping_private_json) {
      return jsonResponse(
        req,
        { ok: false, error: "no_mapping", message: "Schema version has no mapping configuration" },
        400
      );
    }

    const mappingPrivate = schemaVersion.mapping_private_json as MappingPrivate;

    // Compute idempotency key
    const idempotencyKey = await computeIdempotencyKey(
      submission.id,
      submission.payload_hash,
      mappingPrivate.version,
      overwriteMode
    );

    // Check for existing population event (idempotent hit)
    const { data: existingEvent, error: existingError } = await supabase
      .from("intake_population_events")
      .select("*")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingError && existingError.code !== "PGRST116") {
      console.error("[v1-intake-populate] existing event check failed", existingError);
    }

    if (existingEvent) {
      // Idempotent hit - return existing result
      console.log("[v1-intake-populate] idempotent hit", { idempotencyKey });
      return jsonResponse(req, {
        population_event_id: existingEvent.id,
        summary: existingEvent.summary_json,
        field_results: existingEvent.field_results_json,
        idempotent_hit: true,
      });
    }

    // Fetch current deal
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .select("*")
      .eq("id", submission.deal_id)
      .maybeSingle();

    if (dealError || !deal) {
      console.error("[v1-intake-populate] deal query failed", dealError);
      return jsonResponse(
        req,
        { ok: false, error: "deal_not_found", message: "Deal not found" },
        404
      );
    }

    // Build population plan
    const submissionPayload = (submission.payload_json ?? {}) as Record<string, unknown>;
    const currentDeal = deal as Record<string, unknown>;

    const plan = buildPopulationPlan(
      submissionPayload,
      currentDeal,
      mappingPrivate,
      overwriteMode
    );

    // Apply plan to deal
    const now = new Date().toISOString();

    if (Object.keys(plan.dealUpdates).length > 0) {
      // Merge updates with existing deal data
      const mergedDeal = mergeDealUpdates(currentDeal, plan.dealUpdates);

      // Build update object - handle top-level and payload separately
      const updateObj: Record<string, unknown> = {
        updated_at: now,
      };

      // Extract top-level fields (address, city, state, zip, client_name, etc.)
      const topLevelFields = ["address", "city", "state", "zip", "client_name", "client_phone", "client_email"];
      for (const field of topLevelFields) {
        if (field in plan.dealUpdates) {
          updateObj[field] = (plan.dealUpdates as Record<string, unknown>)[field];
        }
      }

      // Handle payload updates
      if ("payload" in plan.dealUpdates) {
        // Merge with existing payload
        const existingPayload = (currentDeal.payload ?? {}) as Record<string, unknown>;
        const payloadUpdates = (plan.dealUpdates as Record<string, unknown>).payload as Record<string, unknown>;
        updateObj.payload = { ...existingPayload, ...payloadUpdates };

        // Deep merge nested objects in payload
        for (const [key, value] of Object.entries(payloadUpdates)) {
          if (value !== null && typeof value === "object" && !Array.isArray(value)) {
            const existingNested = (existingPayload[key] ?? {}) as Record<string, unknown>;
            (updateObj.payload as Record<string, unknown>)[key] = {
              ...existingNested,
              ...(value as Record<string, unknown>),
            };
          }
        }
      }

      const { error: updateError } = await supabase
        .from("deals")
        .update(updateObj)
        .eq("id", submission.deal_id);

      if (updateError) {
        console.error("[v1-intake-populate] deal update failed", updateError);
        return jsonResponse(
          req,
          { ok: false, error: "update_failed", message: "Failed to update deal" },
          500
        );
      }
    }

    // Convert evidence files
    let evidenceConvertedCount = 0;
    const cleanFiles = (files ?? []).filter(
      (f: { scan_status: string }) => f.scan_status === "CLEAN"
    );

    if (cleanFiles.length > 0) {
      // Get evidence mappings from schema (if available)
      const evidenceMappings = mappingPrivate.evidence_mappings ?? [];

      for (const file of cleanFiles) {
        const fileRecord = file as {
          id: string;
          original_filename: string;
          object_key: string;
          mime_type: string;
          size_bytes: number;
          storage_state: string;
          upload_key?: string;
        };

        // Find the evidence kind from mappings based on upload_key
        // Falls back to "intake_document" if no mapping found or no upload_key
        let evidenceKind = "intake_document";
        if (fileRecord.upload_key && evidenceMappings.length > 0) {
          const mapping = evidenceMappings.find(
            (m) => m.source_upload_key === fileRecord.upload_key
          );
          if (mapping?.target_evidence_kind) {
            evidenceKind = mapping.target_evidence_kind;
          }
        }

        // Compute SHA-256 of file reference (placeholder - actual file hash would require reading file)
        const fileHash = await sha256(fileRecord.object_key);

        // Create evidence row
        const { data: evidence, error: evidenceError } = await supabase
          .from("evidence")
          .insert({
            org_id: submission.org_id,
            deal_id: submission.deal_id,
            kind: evidenceKind,
            storage_key: fileRecord.object_key, // Keep same storage key
            filename: fileRecord.original_filename,
            mime_type: fileRecord.mime_type,
            bytes: fileRecord.size_bytes,
            sha256: fileHash,
            created_by: userId,
          })
          .select("id")
          .maybeSingle();

        if (evidenceError) {
          console.error("[v1-intake-populate] evidence insert failed", evidenceError);
          continue;
        }

        if (evidence) {
          // Update file with conversion info
          await supabase
            .from("intake_submission_files")
            .update({
              converted_to_evidence_id: evidence.id,
              converted_at: now,
              storage_state: "CLEAN",
            })
            .eq("id", fileRecord.id);

          evidenceConvertedCount++;
        }
      }
    }

    // Update summary with evidence count
    plan.summary.evidence_converted_count = evidenceConvertedCount;

    // Create population event
    const { data: populationEvent, error: eventError } = await supabase
      .from("intake_population_events")
      .insert({
        org_id: submission.org_id,
        deal_id: submission.deal_id,
        intake_submission_id: submission.id,
        idempotency_key: idempotencyKey,
        overwrite_mode: overwriteMode,
        overwrite_reasons_json: payload.overwrite_reasons ?? null,
        field_results_json: plan.fieldResults,
        summary_json: plan.summary,
        created_by: userId,
      })
      .select("id")
      .maybeSingle();

    if (eventError || !populationEvent) {
      console.error("[v1-intake-populate] population event insert failed", eventError);
      return jsonResponse(
        req,
        { ok: false, error: "event_create_failed", message: "Failed to create population event" },
        500
      );
    }

    // Update submission status to COMPLETED
    const { error: statusError } = await supabase
      .from("intake_submissions")
      .update({
        status: "COMPLETED",
        completed_at: now,
        updated_at: now,
      })
      .eq("id", submission.id);

    if (statusError) {
      console.error("[v1-intake-populate] status update failed", statusError);
    }

    // Update link status if exists
    if (submission.intake_link_id) {
      await supabase
        .from("intake_links")
        .update({ status: "SUBMITTED" })
        .eq("id", submission.intake_link_id);
    }

    console.log("[v1-intake-populate] population complete", {
      submission_id: submission.id,
      event_id: populationEvent.id,
      summary: plan.summary,
    });

    return jsonResponse(req, {
      population_event_id: populationEvent.id,
      summary: plan.summary,
      field_results: plan.fieldResults,
      idempotent_hit: false,
    });
  } catch (err: unknown) {
    console.error("[v1-intake-populate] error", err);
    const message = err instanceof Error ? err.message : "Failed to populate deal";
    return jsonResponse(
      req,
      { ok: false, error: "populate_error", message },
      500
    );
  }
});
