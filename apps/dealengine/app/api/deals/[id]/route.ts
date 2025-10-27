import { NextResponse } from 'next/server';

type Ctx = { params: { id: string } };

export async function GET(_req: Request, ctx: Ctx) {
  return NextResponse.json({ ok: true, id: ctx.params.id });
}

export async function PUT(req: Request, ctx: Ctx) {
  // Later: validate patch and persist
  const patch = await req.json().catch(() => ({}));
  return NextResponse.json({ ok: true, id: ctx.params.id, patch });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  // Later: delete row
  return NextResponse.json({ ok: true, deleted: ctx.params.id });
}
