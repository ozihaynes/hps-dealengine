export function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "OPTIONS, GET, POST, PUT",
  };
}

export function handleOptions(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  const headers = buildCorsHeaders(req);
  return new Response("ok", { status: 200, headers });
}

export function jsonResponse(
  req: Request,
  body: unknown,
  status = 200,
): Response {
  const headers = buildCorsHeaders(req);
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "content-type": "application/json" },
  });
}
