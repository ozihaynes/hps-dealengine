import * as engine from '@hps-internal/engine';

Deno.serve(async (req) => {
  const body = await req.json().catch(() => ({}));
  const names = Object.getOwnPropertyNames(engine);
  const sig = Object.fromEntries(names.map((k) => [k, typeof (engine as any)[k]]));
  const marker = `inspector-${new Date().toISOString()}`;
  return new Response(JSON.stringify({ ok: true, marker, engine: sig, echo: body }, null, 2), {
    headers: { 'content-type': 'application/json' },
  });
});
