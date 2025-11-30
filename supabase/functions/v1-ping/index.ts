const to = (ms: number) => {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(`timeout ${ms}ms`), ms);
  return { ctrl, cancel: () => clearTimeout(id) };
};

Deno.serve(async () => {
  const url  = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const target = url ? `${url}/auth/v1/health` : "MISSING_SUPABASE_URL";

  const { ctrl, cancel } = to(2000);
  let probe: unknown;
  try {
    const r = await fetch(target, { headers: { apikey: anon }, signal: ctrl.signal });
    const body = await r.text();
    probe = { ok: r.ok, status: r.status, body: body.slice(0, 256) };
  } catch (e) {
    probe = { error: String(e) };
  } finally {
    cancel();
  }

  const payload = {
    SUPABASE_URL: url,
    anon_present: anon.length > 0,
    target,
    probe,
  };
  return new Response(JSON.stringify(payload, null, 2), {
    headers: { "content-type": "application/json" },
  });
});
