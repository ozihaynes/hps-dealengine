import { NextResponse, NextRequest } from 'next/server'; // Import NextRequest
import { z } from 'zod';
import { getScenario, deleteScenario } from '../../../../lib/repos';

const DEAL_HEADER = 'x-deal-id';

// --- THIS FUNCTION IS NOW FIXED ---
function readDealId(req: NextRequest): string | null {
  // Use req.nextUrl.searchParams, which is reliable
  const fromQuery = req.nextUrl.searchParams.get('dealId')?.trim();
  const fromHeader = req.headers.get(DEAL_HEADER)?.trim();
  return fromQuery || fromHeader || null;
}

const IdSchema = z.object({ id: z.string().uuid() });

export async function GET(
  req: NextRequest, // Use NextRequest
  ctx: { params: { id: string } }
) {
  const dealId = readDealId(req);
  if (!dealId) {
    return NextResponse.json({ ok: false, error: 'dealId required' }, { status: 400 });
  }

  const parsed = IdSchema.safeParse({ id: ctx?.params?.id });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'bad id', issues: parsed.error.format() },
      { status: 400 }
    );
  }

  const scenario = await getScenario(dealId, parsed.data.id);
  if (!scenario) {
    return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, scenario });
}

export async function DELETE(
  req: NextRequest, // Use NextRequest
  ctx: { params: { id: string } }
) {
  const dealId = readDealId(req);
  if (!dealId) {
    return NextResponse.json({ ok: false, error: 'dealId required' }, { status: 400 });
  }

  const parsed = IdSchema.safeParse({ id: ctx?.params?.id });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'bad id', issues: parsed.error.format() },
      { status: 400 }
    );
  }

  const ok = await deleteScenario(dealId, parsed.data.id);
  if (!ok) {
    return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
