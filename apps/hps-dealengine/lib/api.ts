// apps/hps-dealengine/lib/api.ts

export type RunUnderwriteResult = { ok: boolean; results?: any; error?: string };

export async function runUnderwrite(deal: any): Promise<RunUnderwriteResult> {
  const res = await fetch('/api/run-underwrite', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ deal }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as RunUnderwriteResult;
}
