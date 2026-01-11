// ============================================================================
// API ROUTE: /api/validate-estimate-token
// ============================================================================
// Purpose: Validate magic link token for public submission page
// Auth: None (public endpoint)
// Note: Uses service_role because this is server-side validation
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Validate environment at module load
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // ========================================================================
    // ENVIRONMENT CHECK
    // ========================================================================
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error("[validate-estimate-token] Missing env vars");
      return NextResponse.json(
        { valid: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    // ========================================================================
    // GET TOKEN FROM QUERY
    // ========================================================================
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { valid: false, error: "Missing token" },
        { status: 400 }
      );
    }

    // Basic UUID format validation
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      return NextResponse.json(
        { valid: false, error: "Invalid token format" },
        { status: 400 }
      );
    }

    // ========================================================================
    // QUERY DATABASE
    // ========================================================================
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data, error } = await supabase
      .from("estimate_requests")
      .select(
        `
        id,
        gc_name,
        gc_email,
        status,
        token_expires_at,
        deal_id,
        deals:deal_id (
          address
        )
      `
      )
      .eq("submission_token", token)
      .single();

    if (error || !data) {
      console.log(
        "[validate-estimate-token] Token not found:",
        token.substring(0, 8) + "..."
      );
      return NextResponse.json({ valid: false, error: "Invalid token" }, { status: 400 });
    }

    // ========================================================================
    // CHECK STATUS
    // ========================================================================
    if (data.status === "submitted") {
      return NextResponse.json({
        valid: false,
        submitted: true,
        error: "Estimate already submitted",
      });
    }

    if (data.status === "cancelled") {
      return NextResponse.json({
        valid: false,
        cancelled: true,
        error: "This request has been cancelled",
      });
    }

    if (data.status === "expired") {
      return NextResponse.json({
        valid: false,
        expired: true,
        error: "This link has expired",
      });
    }

    // ========================================================================
    // CHECK EXPIRY
    // ========================================================================
    if (new Date() > new Date(data.token_expires_at)) {
      // Update status to expired
      await supabase
        .from("estimate_requests")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", data.id);

      return NextResponse.json({
        valid: false,
        expired: true,
        error: "This link has expired",
      });
    }

    // ========================================================================
    // RETURN VALID TOKEN INFO
    // ========================================================================
    // Extract address from joined data
    const deals = data.deals as { address?: string } | null;
    const propertyAddress = deals?.address || "Property";

    return NextResponse.json({
      valid: true,
      request: {
        id: data.id,
        gc_name: data.gc_name,
        property_address: propertyAddress,
        expires_at: data.token_expires_at,
        status: data.status,
      },
    });
  } catch (err) {
    console.error("[validate-estimate-token] Error:", err);
    return NextResponse.json(
      { valid: false, error: "Server error" },
      { status: 500 }
    );
  }
}
