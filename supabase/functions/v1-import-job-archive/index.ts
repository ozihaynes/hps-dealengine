import { handleOptions, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  return jsonResponse(
    req,
    {
      error: "Not Implemented",
      message: "v1-import-job-archive is not yet implemented",
      status: 501,
    },
    501
  );
});
