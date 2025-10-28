import { NextResponse, NextRequest } from 'next/server'; // Import NextRequest
import { z } from 'zod';
import { listScenarios, createScenario } from '../../../lib/repos';

const DEAL_HEADER = 'x-deal-id';

// --- THIS FUNCTION IS FOR GET REQUESTS ---
function readDealId(req: NextRequest): string | null {
  // Use req.nextUrl.searchParams, which is reliable
  const fromQuery = req.nextUrl.searchParams.get('dealId')?.trim();
  const fromHeader = req.headers.get(DEAL_HEADER)?.trim();
  return fromQuery || fromHeader || null;
}

function readLimit(url: URL, def = 20, max = 100) {
  const raw = url.searchParams.get('limit');
  const n = Number(raw);
  if (!raw || !Number.isFinite(n) || n < 1) return def;
  return Math.min(max, Math.floor(n));
}

// --- THIS SCHEMA IS FOR POST REQUESTS ---
const PostSchema = z.object({
  dealId: z.string().uuid(), // It MUST be in the body
  label: z.string().trim().default(''),
  overrides: z.any().default({}),
});

export async function GET(req: NextRequest) {
  // Use NextRequest
  const url = new URL(req.url);
  const dealId = readDealId(req); // Now uses the fixed function
  if (!dealId) {
    return NextResponse.json({ ok: false, error: 'dealId required' }, { status: 400 });
  }
  const limit = readLimit(url);
  const cursor = url.searchParams.get('cursor') ?? null;

  const { items, nextCursor } = await listScenarios(dealId, { limit, cursor });
  return NextResponse.json({ ok: true, items, nextCursor });
}

export async function POST(req: NextRequest) {
  // Use NextRequest
  const body = await req.json().catch(() => null);

  // --- NEW SIMPLIFIED LOGIC ---
  // The PostSchema requires dealId. We just pass the body directly.
  const parsed = PostSchema.safeParse(body);

  if (!parsed.success) {
    // This will now correctly show the error if dealId is missing from the body
    return NextResponse.json(
      { ok: false, error: 'bad body', issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // If we are here, parsed.data.dealId is a valid string from the body
  const { dealId, overrides, label } = parsed.data;

  const res = await createScenario(dealId, overrides, label);
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error }, { status: 404 });
  }
  return NextResponse.json({ ok: true, scenario: res.scenario });
}
