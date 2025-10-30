export async function runUnderwriteClient(deal: any) {
  const res = await fetch('/api/run-underwrite', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ deal }),
    cache: 'no-store',
  });
  const data = await res.json();
  if (!data?.ok) throw new Error(data?.error?.message ?? 'Run failed');
  return data.results;
}
