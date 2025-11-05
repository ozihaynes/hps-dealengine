import { NextRequest, NextResponse } from "next/server";
import { policyDefaults, type Settings, type Posture } from "@hps-internal/contracts";

export const runtime = "nodejs";

function coercePosture(input: unknown): Posture {
  const s = String(input ?? "").toLowerCase();
  if (s === "conservative" || s === "base" || s === "aggressive") return s as Posture;
  return "base";
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any));
  const posture = coercePosture(body?.policy?.posture ?? body?.posture);
  const deal = body?.deal ?? {};
  const overlay = (body?.policy && typeof body.policy === "object") ? body.policy : {};

  // Build a Settings object based on defaults; allow a shallow overlay; and enforce the posture.
  const policy: Settings = { ...policyDefaults, ...overlay, posture };

  // Contracts SettingsSchema defines tokens as Record<string, unknown>. Keep it that way.
  const tokens = policy.tokens;

  return NextResponse.json({ deal, policy, tokens });
}

export async function GET() {
  const policy: Settings = { ...policyDefaults };
  return NextResponse.json({ policy });
}