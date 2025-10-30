/* apps/dealengine/app/underwrite/debug/page.tsx */
function fmt(n: unknown) {
  return typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString('en-US') : String(n ?? '');
}

export default async function UnderwriteDebugPage() {
  const body = {
    deal: {
      market: { aiv: 300000, arv: 360000, dom_zip: 45, moi_zip: 2.3 },
      costs: {
        repairs_base: 40000,
        contingency_pct: 0.15,
        monthly: { taxes: 3600, insurance: 2400, hoa: 0, utilities: 250 },
        close_cost_items_seller: [{ label: 'doc stamps (seller)', amount: 2100 }],
        close_cost_items_buyer: [{ label: 'lender/title/buyer items', amount: 18000 }],
        essentials_moveout_cash: 2000,
      },
      debt: {
        senior_principal: 180000,
        senior_per_diem: 45,
        good_thru_date: '2025-10-01',
        juniors: [{ label: 'HELOC', amount: 10000 }],
      },
      timeline: { days_to_ready_list: 0, days_to_sale_manual: 28 },
    },
  };

  const res = await fetch('http://localhost:3000/api/underwrite', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await res.json();

  const { dtm, carry, floors, ceilings } = data?.math ?? {};
  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Underwrite Debug</h1>

      <section className="rounded-xl border border-white/10 p-4">
        <h2 className="text-lg font-semibold mb-2">Deal → API Echo</h2>
        <pre className="text-xs whitespace-pre-wrap">
          {JSON.stringify(data?.echoes?.deal ?? {}, null, 2)}
        </pre>
      </section>

      <section className="rounded-xl border border-white/10 p-4">
        <h2 className="text-lg font-semibold mb-2">DTM</h2>
        <ul className="text-sm space-y-1">
          <li>manual_days: {fmt(dtm?.manual_days)}</li>
          <li>default_cash_close_days: {fmt(dtm?.default_cash_close_days)}</li>
          <li>chosen_days: {fmt(dtm?.chosen_days)}</li>
          <li>reason: {String(dtm?.reason ?? '')}</li>
        </ul>
      </section>

      <section className="rounded-xl border border-white/10 p-4">
        <h2 className="text-lg font-semibold mb-2">Carry</h2>
        <ul className="text-sm space-y-1">
          <li>hold_monthly: {fmt(carry?.hold_monthly)}</li>
          <li>hold_months: {fmt(carry?.hold_months)}</li>
          <li>total_days: {fmt(carry?.total_days)}</li>
        </ul>
      </section>

      <section className="rounded-xl border border-white/10 p-4">
        <h2 className="text-lg font-semibold mb-2">Respect Floor</h2>
        <ul className="text-sm space-y-1">
          <li>payoff_plus_essentials: {fmt(floors?.payoff_plus_essentials)}</li>
          <li>investor.typical_floor: {fmt(floors?.investor?.typical_floor ?? null)}</li>
          <li>operational: {fmt(floors?.operational)}</li>
        </ul>
      </section>

      <section className="rounded-xl border border-white/10 p-4">
        <h2 className="text-lg font-semibold mb-2">Buyer Ceiling</h2>
        <ul className="text-sm space-y-1">
          <li>
            chosen: {fmt(ceilings?.chosen?.value ?? null)}{' '}
            {ceilings?.chosen?.label ? `(${ceilings.chosen.label})` : ''}
          </li>
          <li>candidates: {ceilings?.candidates?.length ?? 0} rows</li>
          <li>reasons: {Array.isArray(ceilings?.reasons) ? ceilings.reasons.join(', ') : ''}</li>
        </ul>
      </section>

      <section className="rounded-xl border border-white/10 p-4">
        <h2 className="text-lg font-semibold mb-2">Raw JSON</h2>
        <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
      </section>
    </main>
  );
}
