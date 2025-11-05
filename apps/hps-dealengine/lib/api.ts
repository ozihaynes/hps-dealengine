import type { Settings } from '@hps-internal/contracts';

export async function fetchPolicy(): Promise<Settings> {
  const res = await fetch('/api/policy', { method: 'GET' });
  const data = await res.json();
  if (!data?.ok) throw new Error('Failed to load policy');
  return data.policy as Settings;
}

export async function putPolicy(policy: Settings): Promise<Settings> {
  const res = await fetch('/api/policy', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ policy }),
  });
  const data = await res.json();
  if (!data?.ok) throw new Error('Failed to save policy');
  return data.policy as Settings;
}

/** Post to /api/analyze and normalize the response shape */
export async function analyze(deal: any, policy?: Settings | null): Promise<any> {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deal, policy: policy ?? undefined }),
  });
  const data = await res.json();
  // Our route returns { ok, result }, but tolerate direct objects too.
  return data && typeof data === 'object' && 'result' in data ? (data.result ?? null) : data;
}
