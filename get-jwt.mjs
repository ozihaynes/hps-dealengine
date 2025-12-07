#!/usr/bin/env node

// Simple Supabase password grant helper.
// Requires these env vars:
//   SUPA_URL   - your Supabase project URL (e.g. https://zjkihnihhqmnhpxkecpy.supabase.co)
//   SUPA_ANON  - your anon public key
//   EMAIL      - user email (e.g. underwriter@test.local)
//   PASSWORD   - user password

const url = process.env.SUPA_URL;
const anon = process.env.SUPA_ANON;
const email = process.env.EMAIL;
const password = process.env.PASSWORD;

if (!url || !anon || !email || !password) {
  console.error("Missing one or more env vars: SUPA_URL, SUPA_ANON, EMAIL, PASSWORD");
  process.exit(1);
}

const tokenEndpoint = `${url.replace(/\/$/, "")}/auth/v1/token?grant_type=password`;

async function main() {
  try {
    const res = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anon,
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Failed to fetch token. Status:", res.status, res.statusText);
      if (text) {
        console.error("Response body:", text);
      }
      process.exit(1);
    }

    const json = await res.json();
    const accessToken = json.access_token;

    if (!accessToken) {
      console.error("No access_token in response:", json);
      process.exit(1);
    }

    // Print only the access token so it can be piped/used easily.
    console.log(accessToken);
  } catch (err) {
    console.error("Error requesting token:", err);
    process.exit(1);
  }
}

main();
