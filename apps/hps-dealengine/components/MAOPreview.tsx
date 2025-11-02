'use client';

type Props = {
  capValue: number | null;
  listPct?: string | null;
  concessionsPct?: string | null;
  sellClosePct?: string | null;
};

function toNum(s?: string | null) {
  const n = s == null ? NaN : Number(s);
  return Number.isFinite(n) ? n : 0;
}

function toMoney(n: number) {
  return Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

export default function MAOPreview(props: Props) {
  const cap = props.capValue ?? NaN;
  if (!Number.isFinite(cap)) {
    return (
      <section className="rounded-2xl p-5 border border-white/10 bg-white/5 backdrop-blur">
        <div className="mb-2 text-lg font-semibold">Preview MAO (sanity)</div>
        <div className="text-sm opacity-70">Enter AIV to compute a cap first.</div>
      </section>
    );
  }

  const listPct = toNum(props.listPct);
  const concessionsPct = toNum(props.concessionsPct);
  const sellClosePct = toNum(props.sellClosePct);

  const listFee = Math.round(cap * listPct);
  const concessions = Math.round(cap * concessionsPct);
  const sellClose = Math.round(cap * sellClosePct);
  const totalFees = listFee + concessions + sellClose;
  const maoPreview = cap - totalFees;

  return (
    <section className="rounded-2xl p-5 border border-white/10 bg-white/5 backdrop-blur">
      <div className="mb-2 text-lg font-semibold">Preview MAO (sanity)</div>
      <div className="text-xs opacity-60 mb-3">
        UI-only sanity check using fee tokens vs the capped value. Not the official engine MAO.
      </div>

      <div className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        <div>Capped value</div>
        <div className="text-right font-medium">{toMoney(cap)}</div>

        <div>List commission ({(listPct * 100).toFixed(2)}%)</div>
        <div className="text-right">{toMoney(listFee)}</div>

        <div>Concessions ({(concessionsPct * 100).toFixed(2)}%)</div>
        <div className="text-right">{toMoney(concessions)}</div>

        <div>Sell-side closing ({(sellClosePct * 100).toFixed(2)}%)</div>
        <div className="text-right">{toMoney(sellClose)}</div>

        <div className="opacity-80">Total fees</div>
        <div className="text-right opacity-80">{toMoney(totalFees)}</div>
      </div>

      <div className="mt-2 pt-3 border-t border-white/10 flex items-center justify-between">
        <div className="font-semibold">Preview MAO</div>
        <div className="text-right text-xl font-bold">{toMoney(maoPreview)}</div>
      </div>
    </section>
  );
}
