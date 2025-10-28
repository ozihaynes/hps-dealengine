// apps/dealengine/app/api/underwrite/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { computeUnderwriting } from '@hps-internal/engine';
import { getDeal, getScenario } from '../../../lib/repos';

// ---- helpers ----

function deepMerge<T>(base: T, patch: Partial<T>): T {
  if (patch == null || typeof patch !== 'object') return (base ?? patch) as T;
  if (base == null || typeof base !== 'object') return patch as T;
  if (Array.isArray(base) || Array.isArray(patch)) return (patch as T) ?? base;

  const out: any = { ...base };
  for (const k of Object.keys(patch)) {
    const pv: any = (patch as any)[k];
    const bv: any = (base as any)[k];
    out[k] = pv && typeof pv === 'object' && !Array.isArray(pv) ? deepMerge(bv, pv) : (pv ?? bv);
  }
  return out as T;
}

// SOT-aligned input: either persistent ids or ad-hoc payload.
const BodySchema = z.union([
  z.object({
    dealId: z.string().uuid(),
    scenarioId: z.string().uuid().optional(),
  }),
  z.object({
    deal: z.any(),
    overrides: z.any().optional(),
  }),
]);

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'bad request', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Case A/B: dealId (+ optional scenarioId)
    if ('dealId' in parsed.data) {
      const { dealId, scenarioId } = parsed.data;

      const dealRec = await getDeal(dealId);
      if (!dealRec) {
        return NextResponse.json({ ok: false, error: 'deal not found' }, { status: 404 });
      }

      let inputDeal = dealRec.deal;
      if (scenarioId) {
        const sc = await getScenario(dealId, scenarioId);
        if (!sc) {
          return NextResponse.json({ ok: false, error: 'scenario not found' }, { status: 404 });
        }
        inputDeal = deepMerge(inputDeal, sc.overrides ?? {});
      }

      const results = computeUnderwriting(inputDeal);
      return NextResponse.json({ ok: true, dealId, results }, { status: 200 });
    }

    // Case C: ad-hoc deal (+ optional overrides)
    const { deal, overrides } = parsed.data;
    const inputDeal = overrides ? deepMerge(deal, overrides) : deal;

    const results = computeUnderwriting(inputDeal);
    return NextResponse.json({ ok: true, results }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'internal error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: false, error: 'Method Not Allowed' }, { status: 405 });
}
