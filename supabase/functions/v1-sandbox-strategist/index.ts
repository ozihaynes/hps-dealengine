import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") ?? "").trim();
const SUPABASE_ANON_KEY = (Deno.env.get("SUPABASE_ANON_KEY") ?? "").trim();
const OPENAI_API_KEY = (Deno.env.get("OPENAI_API_KEY") ?? "").trim();
const MODEL = "gpt-4o-mini";

const Postures = ["conservative", "base", "aggressive"] as const;

const RequestSchema = z.object({
  prompt: z.string().min(1),
  posture: z.enum(Postures).optional(),
  settings: z.record(z.string(), z.any()),
});

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

async function requireUserId(supabase: ReturnType<typeof createSupabaseClient>) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) {
    throw new HttpError(401, "Unauthorized");
  }
  return data.user.id as string;
}

async function callOpenAI(prompt: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: `You are the "DealEngine Strategist," an AI assistant that ONLY answers questions about the Business Logic Sandbox configuration.

Guardrails:
- Do NOT invent numeric values.
- Do NOT give general real-estate or market advice.
- Reference only the provided sandbox settings.
- Explain what each setting does, why it matters, and how it interacts with related settings.
- Keep responses concise, professional, and actionable.`,
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[v1-sandbox-strategist] OpenAI error", res.status, text);
    throw new HttpError(502, `Upstream AI provider error (${res.status}). Please try again later.`);
  }

  const json = await res.json();
  const content =
    json?.choices?.[0]?.message?.content?.trim() ??
    "Unable to produce guidance.";
  return content as string;
}

serve(async (req: Request): Promise<Response> => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    if (!OPENAI_API_KEY) {
      throw new HttpError(500, "AI provider is not configured.");
    }
    if (!OPENAI_API_KEY.startsWith("sk-")) {
      throw new HttpError(500, "OPENAI_API_KEY appears malformed (expected to start with \"sk-\").");
    }

    const supabase = createSupabaseClient(req);
    await requireUserId(supabase);

    let payload: z.infer<typeof RequestSchema>;
    try {
      const json = await req.json();
      const parsed = RequestSchema.safeParse(json);
      if (!parsed.success) {
        return jsonResponse(
          req,
          { ok: false, error: parsed.error.message },
          400,
        );
      }
      payload = parsed.data;
    } catch (err) {
      console.error("[v1-sandbox-strategist] failed to parse body", err);
      return jsonResponse(
        req,
        { ok: false, error: "Invalid JSON body" },
        400,
      );
    }

    const promptParts = [
      `Posture: ${payload.posture ?? "base"}`,
      "User question:",
      payload.prompt,
      "Current sandbox settings (do not list all, reference only what's relevant):",
      JSON.stringify(payload.settings ?? {}, null, 2),
    ].join("\n\n");

    const markdown = await callOpenAI(promptParts);

    return jsonResponse(req, {
      ok: true,
      markdown,
      provider: "openai",
      model: MODEL,
    });
  } catch (err) {
    if (err instanceof HttpError) {
      return jsonResponse(req, { ok: false, error: err.message }, err.status);
    }
    console.error("[v1-sandbox-strategist] unexpected error", err);
    return jsonResponse(
      req,
      { ok: false, error: "Internal server error" },
      500,
    );
  }
});
