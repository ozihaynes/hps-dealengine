#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zjkihnihhqmnhpxkecpy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpqa2lobmloaHFtbmhweGtlY3B5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0OTA4NzcsImV4cCI6MjA3NzA2Njg3N30.tvdrcl96jqZp-_WuI19PB-zRxDgYCAJFBnYBLseVNAA";

const TEST_EMAIL = "underwriter@test.local";
const TEST_PASSWORD = "Password";

async function main() {
  console.log("▶ Creating Supabase client…");
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log("▶ Signing in as " + TEST_EMAIL + "…");
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (signInError) {
    console.error("❌ signInWithPassword error:", signInError);
    process.exit(1);
  }

  if (!signInData.session) {
    console.error("❌ No session returned from signInWithPassword");
    process.exit(1);
  }

  const accessToken = signInData.session.access_token;
  console.log("✅ Signed in. Got access token.");

  console.log("▶ Looking up org_id from memberships…");
  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("org_id")
    .limit(1)
    .single();

  if (membershipError) {
    console.error("❌ Error querying memberships:", membershipError);
    process.exit(1);
  }

  if (!membership || !membership.org_id) {
    console.error("❌ No org_id found in memberships for this user.");
    process.exit(1);
  }

  const org_id = membership.org_id;
  console.log("✅ Found org_id:", org_id);

  const url = SUPABASE_URL + "/functions/v1/v1-analyze";
  console.log("▶ Calling Edge Function:", url);

  // IMPORTANT: posture must match the DB row ("base")
  const body = {
    org_id,
    posture: "base",
    deal: {
      arv: 250000,
      aiv: 200000,
      dom_zip_days: 45,
      moi_zip_months: 3,
      price_to_list_pct: 0.92,
      local_discount_pct: 0.08,
      options: { trace: true },
    },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + accessToken,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });

  console.log("▶ Response status:", resp.status);

  try {
    const json = await resp.json();
    console.log("✅ Parsed JSON response:");
    console.dir(json, { depth: null });
  } catch (err) {
    console.error("❌ Failed to parse JSON response:", err);
    try {
      const text = await resp.text();
      console.error("Raw body:", text);
    } catch {
      // ignore
    }
  }
}

main().catch((err) => {
  console.error("❌ Uncaught error:", err);
  process.exit(1);
});
