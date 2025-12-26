import { handleOptions, jsonResponse } from "../_shared/cors.ts";

Deno.serve((req) => {
  const preflight = handleOptions(req);
  if (preflight) {
    return preflight;
  }

  return jsonResponse(req, { ok: true });
});
