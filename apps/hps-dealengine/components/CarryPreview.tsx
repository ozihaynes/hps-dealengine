'use client';

type Props = {
  domDays?: number | '';
  rule?: string | null;
  capMonths?: number | null;
};

function domToMonths(dom: number, rule: string | null | undefined): number {
  if (!Number.isFinite(dom)) return NaN;
  const r = (rule ?? '').trim().toUpperCase();
  // Supported pattern: DOM/<n>, e.g., "DOM/30"
  const m = /^DOM\/(\d+(?:\.\d+)?)$/.exec(r);
  const divisor = m ? parseFloat(m[1]) : 30;
  if (!isFinite(divisor) || divisor <= 0) return dom / 30;
  return dom / divisor;
}

export default function CarryPreview({ domDays, rule, capMonths }: Props) {
  const dom = typeof domDays === 'number' ? domDays : NaN;
  const rawMonths = domToMonths(dom, rule);
  const roundedRaw = Number.isFinite(rawMonths) ? Math.round(rawMonths * 100) / 100 : NaN;
  const eff =
    Number.isFinite(roundedRaw) && Number.isFinite(capMonths ?? NaN)
      ? Math.min(roundedRaw, capMonths as number)
      : roundedRaw;
  const roundedEff = Number.isFinite(eff) ? Math.round(eff * 100) / 100 : NaN;

  return (
    <div className="rounded-2xl p-4 border border-white/10 bg-white/5 backdrop-blur">
      <div className="mb-2 text-base font-semibold">Carry Months (Preview)</div>
      <div className="text-xs opacity-70 mb-3">
        UI-only preview for quick intuition. Engine remains the source of truth.
      </div>
      <div className="text-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <div>
          DOM (ZIP) days: <span className="opacity-80">{Number.isFinite(dom) ? dom : '—'}</span>
        </div>
        <div>
          Rule: <span className="opacity-80">{rule ?? '—'}</span>
        </div>
        <div>
          Raw months:{' '}
          <span className="opacity-80">{Number.isFinite(roundedRaw) ? roundedRaw : '—'}</span>
        </div>
        <div>
          Cap (months): <span className="opacity-80">{capMonths ?? '—'}</span>
        </div>
        <div className="col-span-1 sm:col-span-2 lg:col-span-1">
          Effective months:{' '}
          <span className="opacity-100 font-semibold">
            {Number.isFinite(roundedEff) ? roundedEff : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
