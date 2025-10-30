import { NextResponse } from 'next/server';

export async function GET() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA ?? null;
  const ref = process.env.VERCEL_GIT_COMMIT_REF ?? process.env.GIT_COMMIT_REF ?? null;
  const env = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development';
  const buildTime = new Date().toISOString();
  return NextResponse.json({ ok: true, sha, ref, env, buildTime }, { status: 200 });
}
