// supabase/functions/v1-ai-bridge/index.ts
// Deno Edge Function: proxy to Gemini without exposing API key to the client
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const MODEL = "gemini-1.5-pro"; // pick your model

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return new Response("Missing GEMINI_API_KEY", { status: 500 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const prompt = body?.prompt ?? "";
  if (!prompt) {
    return new Response("Missing 'prompt'", { status: 400 });
  }

  // Gemini REST: generateContent
  // https://ai.google.dev/api/generate-content
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }]}],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    return new Response(
      JSON.stringify({ error: true, status: res.status, message: errText }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  const data = await res.json();
  return new Response(JSON.stringify({ data }), {
    headers: { "Content-Type": "application/json" },
  });
});
