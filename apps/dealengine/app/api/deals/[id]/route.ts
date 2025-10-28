import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDeal, updateDeal, deleteDeal } from '../../../../lib/repos';

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const id = ctx.params?.id;
  if (!id) return NextResponse.json({ ok: false, error: 'missing id' }, { status: 400 });
  const rec = await getDeal(id);
  if (!rec) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true, ...rec });
}

const PutSchema = z.object({
  label: z.string().trim().optional(),
  deal: z.any().optional(),
});

export async function PUT(req: Request, ctx: { params: { id: string } }) {
  const id = ctx.params?.id;
  if (!id) return NextResponse.json({ ok: false, error: 'missing id' }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = PutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'bad body', issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const rec = await updateDeal(id, parsed.data);
  if (!rec)
    return NextResponse.json({ ok: false, error: 'update failed or not found' }, { status: 404 });
  return NextResponse.json({ ok: true, ...rec });
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const id = ctx.params?.id;
  if (!id) return NextResponse.json({ ok: false, error: 'missing id' }, { status: 400 });
  const ok = await deleteDeal(id);
  if (!ok) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
