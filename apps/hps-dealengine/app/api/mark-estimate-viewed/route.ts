// ============================================================================
// API ROUTE: /api/mark-estimate-viewed
// ============================================================================
// Purpose: Mark estimate request as viewed when GC opens the page
// Auth: None (public endpoint, validated by token)
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ success: false }, { status: 500 });
    }

    let body: { token?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const { token } = body;

    if (!token) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    // Basic UUID format validation
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Update status to 'viewed' only if currently 'pending' or 'sent'
    const { error } = await supabase
      .from("estimate_requests")
      .update({
        status: "viewed",
        viewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("submission_token", token)
      .in("status", ["pending", "sent"]); // Only update if not already viewed/submitted/etc

    if (error) {
      console.error("[mark-estimate-viewed] Error:", error);
      return NextResponse.json({ success: false }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[mark-estimate-viewed] Error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
