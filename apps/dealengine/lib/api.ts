/* apps/dealengine/lib/api.ts */
export async function postUnderwrite(deal: any) {
  const res = await fetch("/api/underwrite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deal }),
  });
  if (!res.ok) throw new Error(`Underwrite failed: ${res.status}`);
  return res.json();
}
