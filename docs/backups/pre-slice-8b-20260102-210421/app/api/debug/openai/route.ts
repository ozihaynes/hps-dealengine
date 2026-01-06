import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getOpenAIKey() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    const error = new Error("OPENAI_API_KEY is missing in environment");
    (error as any).code = "OPENAI_API_KEY_MISSING";
    throw error;
  }
  if (!key.startsWith("sk-")) {
    const error = new Error("OPENAI_API_KEY appears malformed (expected to start with \"sk-\")");
    (error as any).code = "OPENAI_API_KEY_MALFORMED";
    throw error;
  }
  return key;
}

function normalizeError(err: unknown) {
  const message = err instanceof Error ? err.message : "OpenAI health check failed";
  const status = (err as any)?.status as number | undefined;
  const code = (err as any)?.code as string | undefined;
  const details =
    (err as any)?.response?.data ??
    (err as any)?.data ??
    (err as any)?.body ??
    (err as any)?.details ??
    undefined;

  return { ok: false, error: message, code, status: status ?? null, details };
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "disabled_in_production" }, { status: 404 });
  }

  try {
    const apiKey = getOpenAIKey();
    const res = await fetch("https://api.openai.com/v1/models?limit=1", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const bodyText = await res.text();
    let bodyJson: any = null;
    if (bodyText) {
      try {
        bodyJson = JSON.parse(bodyText);
      } catch {
        bodyJson = null;
      }
    }

    if (!res.ok) {
      const err = new Error(bodyJson?.error?.message ?? "OpenAI returned an error");
      (err as any).status = res.status;
      (err as any).details = bodyJson ?? bodyText;
      throw err;
    }

    return NextResponse.json({
      ok: true,
      sampleModel: bodyJson?.data?.[0]?.id ?? null,
      totalModels: Array.isArray(bodyJson?.data) ? bodyJson.data.length : null,
    });
  } catch (err) {
    const payload = normalizeError(err);
    return NextResponse.json(payload, { status: payload.status && payload.status >= 400 ? payload.status : 500 });
  }
}
