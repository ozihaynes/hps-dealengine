'use client';

import React, { useEffect, useState } from 'react';
import type { Settings } from '@hps-internal/contracts';
import { fetchPolicy, putPolicy } from '@/lib/api';

type ApprovalRole = 'Owner' | 'Admin' | 'VP';

export default function SettingsForm() {
  const [policy, setPolicy] = useState<Settings | null>(null);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    (async () => {
      try {
        setPolicy(await fetchPolicy());
      } catch {
        setPolicy({
          aiv: {},
          carry: {},
          floors: { respect_floor_enabled: true },
          fees: {},
          evidence: {},
        } as Settings);
      }
    })();
  }, []);

  const update = (mut: (p: Settings) => Settings) => {
    if (!policy) return;
    setPolicy((prev) => (prev ? mut({ ...prev }) : prev));
  };

  async function save() {
    if (!policy) return;
    try {
      setSaving('saving');
      const saved = await putPolicy(policy);
      setPolicy(saved);
      setSaving('saved');
      setTimeout(() => setSaving('idle'), 800);
    } catch {
      setSaving('error');
    }
  }

  if (!policy) return <div className="text-sm opacity-70">Loading policy…</div>;

  const floorsEnabled = !!policy.floors?.respect_floor_enabled;

  return (
    <div className="space-y-6">
      {/* AIV */}
      <Section title="AIV (tokens + override gate)">
        <div className="grid md:grid-cols-2 gap-3">
          <Field
            label="Hard Max Token"
            value={policy.aiv.hard_max_token ?? ''}
            onChange={(v) =>
              update((p) => ({ ...p, aiv: { ...p.aiv, hard_max_token: v || undefined } }))
            }
          />
          <Field
            label="Hard Min Token"
            value={policy.aiv.hard_min_token ?? ''}
            onChange={(v) =>
              update((p) => ({ ...p, aiv: { ...p.aiv, hard_min_token: v || undefined } }))
            }
          />
          <Field
            label="Safety Cap % Token"
            value={policy.aiv.safety_cap_pct_token ?? ''}
            onChange={(v) =>
              update((p) => ({ ...p, aiv: { ...p.aiv, safety_cap_pct_token: v || undefined } }))
            }
          />
          <Field
            label="Soft Max vs ARV Multiplier Token"
            value={policy.aiv.soft_max_vs_arv_multiplier_token ?? ''}
            onChange={(v) =>
              update((p) => ({
                ...p,
                aiv: { ...p.aiv, soft_max_vs_arv_multiplier_token: v || undefined },
              }))
            }
          />
          <Field
            label="Soft Max Comps Age (days) Token"
            value={policy.aiv.soft_max_comps_age_days_token ?? ''}
            onChange={(v) =>
              update((p) => ({
                ...p,
                aiv: { ...p.aiv, soft_max_comps_age_days_token: v || undefined },
              }))
            }
          />
          <Field
            label="Soft Min Comps Token"
            value={policy.aiv.soft_min_comps_token ?? ''}
            onChange={(v) =>
              update((p) => ({ ...p, aiv: { ...p.aiv, soft_min_comps_token: v || undefined } }))
            }
          />
          <Field
            label="Soft Min Radius (miles) Token"
            value={policy.aiv.soft_min_radius_miles_token ?? ''}
            onChange={(v) =>
              update((p) => ({
                ...p,
                aiv: { ...p.aiv, soft_min_radius_miles_token: v || undefined },
              }))
            }
          />
        </div>

        <div className="grid md:grid-cols-3 gap-3 pt-2">
          <Checkbox
            label="Override requires bindable insurance"
            checked={!!policy.aiv.cap_override?.requires_bindable_insurance}
            onChange={() =>
              update((p) => ({
                ...p,
                aiv: {
                  ...p.aiv,
                  cap_override: {
                    requires_bindable_insurance: !p.aiv.cap_override?.requires_bindable_insurance,
                    approval_role: (p.aiv.cap_override?.approval_role ?? undefined) as
                      | ApprovalRole
                      | undefined,
                  },
                },
              }))
            }
          />
          <Select
            label="Override approval role"
            value={(policy.aiv.cap_override?.approval_role ?? '') as string}
            options={['', 'Owner', 'Admin', 'VP']}
            onChange={(v) =>
              update((p) => ({
                ...p,
                aiv: {
                  ...p.aiv,
                  cap_override: {
                    requires_bindable_insurance: !!p.aiv.cap_override?.requires_bindable_insurance,
                    approval_role: (v || undefined) as ApprovalRole | undefined,
                  },
                },
              }))
            }
          />
        </div>
      </Section>

      {/* Carry */}
      <Section title="Carry (tokens)">
        <div className="grid md:grid-cols-2 gap-3">
          <Field
            label="DOM Add Days Default Token"
            value={policy.carry.dom_add_days_default_token ?? ''}
            onChange={(v) =>
              update((p) => ({
                ...p,
                carry: { ...p.carry, dom_add_days_default_token: v || undefined },
              }))
            }
          />
          <Field
            label="Months Cap Token (blank = none)"
            value={policy.carry.months_cap_token ?? ''}
            onChange={(v) =>
              update((p) => ({ ...p, carry: { ...p.carry, months_cap_token: v || undefined } }))
            }
          />
        </div>
      </Section>

      {/* Fees */}
      <Section title="Fees (tokens)">
        <div className="grid md:grid-cols-3 gap-3">
          <Field
            label="List Commission % Token"
            value={policy.fees.list_commission_pct_token ?? ''}
            onChange={(v) =>
              update((p) => ({
                ...p,
                fees: { ...p.fees, list_commission_pct_token: v || undefined },
              }))
            }
          />
          <Field
            label="Concessions % Token"
            value={policy.fees.concessions_pct_token ?? ''}
            onChange={(v) =>
              update((p) => ({ ...p, fees: { ...p.fees, concessions_pct_token: v || undefined } }))
            }
          />
          <Field
            label="Seller Close % Token"
            value={policy.fees.sell_close_pct_token ?? ''}
            onChange={(v) =>
              update((p) => ({ ...p, fees: { ...p.fees, sell_close_pct_token: v || undefined } }))
            }
          />
        </div>
      </Section>

      {/* Floors */}
      <Section title="Floors (flags)">
        <div className="grid md:grid-cols-2 gap-3">
          <Checkbox
            label="Respect Floor Enabled"
            checked={floorsEnabled}
            onChange={() =>
              update((p) => ({
                ...p,
                floors: { ...(p.floors ?? {}), respect_floor_enabled: !floorsEnabled },
              }))
            }
          />
        </div>
      </Section>

      {/* Save Bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20"
          disabled={saving === 'saving'}
        >
          {saving === 'saving' ? 'Saving…' : 'Save settings'}
        </button>
        <div className="text-xs opacity-70">
          {saving === 'saved' && 'Saved ✓'}
          {saving === 'error' && 'Save failed'}
        </div>
      </div>
    </div>
  );
}

/* UI bits */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-3">
      <div className="text-sm font-semibold opacity-90">{title}</div>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs opacity-70">{label}</span>
      <input
        className="px-2 py-1 rounded-xl bg-white/5 border border-white/10 focus:outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="<TOKEN_NAME>"
      />
    </label>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm opacity-80">
      <input type="checkbox" checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs opacity-70">{label}</span>
      <select
        className="px-2 py-1 rounded-xl bg-white/5 border border-white/10 focus:outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt === '' ? '—' : opt}
          </option>
        ))}
      </select>
    </label>
  );
}
