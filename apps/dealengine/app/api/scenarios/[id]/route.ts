import { NextResponse } from 'next/server';

type Ctx = { params: { id: string } };

export async function GET(_req: Request, ctx: Ctx) {
  return NextResponse.json({ ok: true, id: ctx.params.id });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  return NextResponse.json({ ok: true, deleted: ctx.params.id });
}
