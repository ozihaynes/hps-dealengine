'use client';
import { useMemo } from 'react';

type Field = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'checkbox';
  suffix?: string;
  min?: number;
  max?: number;
  title?: string;
};

export default function PolicyEditor({
  value,
  onChange,
  filter = '',
  includeSections,
}: {
  value: any;
  onChange: (next: any) => void;
  filter?: string;
  includeSections?: string[];
}) {
  const sections = useMemo(
    () => [
      {
        key: 'aiv',
        title: 'AIV',
        fields: [
          {
            key: 'hardCapPct',
            label: 'Hard Cap (%)',
            type: 'number',
            suffix: '%',
            min: 0,
            max: 100,
            title: 'Max % of ARV allowed (cap clamp)',
          },
          {
            key: 'softMaxAgeDays',
            label: 'Soft Max Age (days)',
            type: 'number',
            suffix: 'days',
            min: 0,
            title: 'Max age of comps for soft cap',
          },
          {
            key: 'overrideRole',
            label: 'Override Role',
            type: 'text',
            title: 'Role allowed to approve cap override',
          },
          {
            key: 'overrideNeedsBindableInsurance',
            label: 'Override needs bindable insurance',
            type: 'checkbox',
            title: 'Require bindable insurance for override',
          },
        ] as Field[],
      },
      {
        key: 'arv',
        title: 'ARV',
        fields: [
          {
            key: 'minComps',
            label: 'Min Comps',
            type: 'number',
            min: 0,
            title: 'Minimum comps required',
          },
          {
            key: 'softMaxAgeDays',
            label: 'Soft Max Age (days)',
            type: 'number',
            suffix: 'days',
            min: 0,
            title: 'Max age of comps for ARV',
          },
        ] as Field[],
      },
      {
        key: 'carry',
        title: 'Carry',
        fields: [
          {
            key: 'domToMonthsRule',
            label: 'DOM → Months Rule',
            type: 'text',
            title: 'Formula for converting DOM to months',
          },
          {
            key: 'monthsHardCap',
            label: 'Months Hard Cap',
            type: 'number',
            suffix: 'mos',
            min: 0,
            max: 60,
            title: 'Absolute cap for carry months',
          },
        ] as Field[],
      },
      {
        key: 'gates',
        title: 'Gates',
        fields: [
          {
            key: 'greenLightSpreadOverPayoff',
            label: 'Green Light: Spread over payoff ($)',
            type: 'number',
            suffix: '$',
            min: 0,
            title: 'Minimum spread over payoff for green light',
          },
          {
            key: 'borderlineBand',
            label: 'Borderline band (±$)',
            type: 'number',
            suffix: '$',
            min: 0,
            title: 'Band around threshold that flags borderline',
          },
        ] as Field[],
      },
    ],
    []
  );

  const wanted = new Set(
    includeSections && includeSections.length ? includeSections : sections.map((s) => s.key)
  );
  const f = (filter ?? '').trim().toLowerCase();

  function set(path: string, v: any) {
    const next = structuredClone(value ?? {});
    const segs = path.split('.');
    let c = next;
    for (let i = 0; i < segs.length - 1; i++) {
      c[segs[i]] ??= {};
      c = c[segs[i]];
    }
    c[segs[segs.length - 1]] = v;
    onChange(next);
  }
  function get(path: string) {
    return path.split('.').reduce((a: any, k) => (a ? a[k] : undefined), value);
  }

  function validate(fld: Field, v: any): string | null {
    if (fld.type !== 'number') return null;
    if (v === '' || v === null || typeof v === 'undefined') return null;
    if (typeof v !== 'number' || Number.isNaN(v) || !Number.isFinite(v)) return 'Invalid number';
    if (typeof fld.min === 'number' && v < fld.min) return `Min ${fld.min}`;
    if (typeof fld.max === 'number' && v > fld.max) return `Max ${fld.max}`;
    return null;
  }

  return (
    <div className="grid gap-6">
      {sections
        .filter((s) => wanted.has(s.key))
        .map((s) => {
          const fields = s.fields.filter(
            (fld) =>
              !f ||
              s.title.toLowerCase().includes(f) ||
              fld.label.toLowerCase().includes(f) ||
              `${s.key}.${fld.key}`.includes(f)
          );
          if (fields.length === 0) return null;

          return (
            <div
              id={s.key}
              key={s.key}
              className="rounded-2xl p-4 bg-white/5 border border-white/10"
            >
              <h3 className="text-base font-semibold mb-3">{s.title}</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {fields.map((fld) => {
                  const path = `${s.key}.${fld.key}`;
                  const val = get(path);
                  const err = validate(fld, val);

                  if (fld.type === 'checkbox') {
                    return (
                      <label key={path} className="flex items-center gap-2" title={fld.title}>
                        <input
                          type="checkbox"
                          checked={!!val}
                          onChange={(e) => set(path, e.target.checked)}
                          aria-label={fld.label}
                        />
                        <span>{fld.label}</span>
                      </label>
                    );
                  }

                  return (
                    <label key={path} className="grid gap-1" title={fld.title}>
                      <span className="text-sm opacity-80">{fld.label}</span>
                      <div className="input-wrap">
                        <input
                          className={`input w-full pr-12 ${err ? 'error' : ''}`}
                          type={fld.type}
                          value={val ?? ''}
                          onChange={(e) =>
                            set(
                              path,
                              fld.type === 'number'
                                ? e.target.value === ''
                                  ? null
                                  : Number(e.target.value)
                                : e.target.value
                            )
                          }
                          placeholder="(unset)"
                          aria-label={fld.label}
                          min={typeof fld.min === 'number' ? fld.min : undefined}
                          max={typeof fld.max === 'number' ? fld.max : undefined}
                        />
                        {fld.suffix ? <span className="suffix">{fld.suffix}</span> : null}
                      </div>
                      {err ? <div className="help error">{err}</div> : null}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
    </div>
  );
}
