export async function callUnderwriteAPI(input: any) {
  const res = await fetch('/api/underwrite', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-internal-key': process.env.NEXT_PUBLIC_INTERNAL_KEY ?? '',
    },
    body: JSON.stringify({ deal: input }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}
