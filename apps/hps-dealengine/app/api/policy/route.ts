import { NextRequest, NextResponse } from "next/server";
import { policyDefaults, type Settings, type Posture } from "@hps-internal/contracts";

export const runtime = "nodejs";

function coercePosture(input: unknown): Posture {
  const s = String(input ?? "").toLowerCase();
  if (s === "conservative" || s === "base" || s === "aggressive") return s as Posture;
  return "base";
}

export async function GET() {
  const policy: Settings = { ...policyDefaults };
  return NextResponse.json({ policy });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any));
  const posture = coercePosture(body?.posture ?? body?.policy?.posture);
  const overlay = (body?.policy && typeof body.policy === "object") ? body.policy : {};
  const policy: Settings = { ...policyDefaults, ...overlay, posture };
  return NextResponse.json({ policy });
}