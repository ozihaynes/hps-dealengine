"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiChatMessage, AiPersona } from "./types";

export const CHAT_RETENTION_DAYS = 30;
const RETENTION_MS = CHAT_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export type PersistedThread = {
  id: string;
  persona: AiPersona;
  title?: string | null;
  tone?: string | null;
  dealId?: string | null;
  runId?: string | null;
  posture?: string | null;
  orgId?: string | null;
  userId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  lastMessageAt?: string | null;
  expiresAt?: string | null;
  messages?: AiChatMessage[];
};

export async function fetchAiThreads(
  supabase: SupabaseClient,
  opts: { orgId: string; personas?: AiPersona[]; limit?: number; dealId?: string | null },
): Promise<PersistedThread[]> {
  let query = supabase
    .from("ai_chat_threads")
    .select(
      `
        id,
        persona,
        title,
        tone,
        deal_id,
        run_id,
        posture,
        org_id,
        user_id,
        created_at,
        updated_at,
        last_message_at,
        expires_at,
        messages:ai_chat_messages (
          id,
          role,
          content,
          created_at
        )
      `,
    )
    .eq("org_id", opts.orgId)
    .gte("expires_at", new Date().toISOString())
    .order("last_message_at", { ascending: false })
    .order("created_at", { referencedTable: "ai_chat_messages", ascending: true })
    .limit(opts.limit ?? 100);

  if (opts.personas?.length) {
    query = query.in("persona", opts.personas);
  }
  if (opts.dealId !== undefined) {
    if (opts.dealId) {
      query = query.eq("deal_id", opts.dealId);
    } else {
      query = query.is("deal_id", null);
    }
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = data ?? [];
  const personas = opts.personas ?? null;

  return rows
    .filter((row: any) => !personas || personas.includes(row.persona))
    .map((row: any) => ({
      id: row.id,
      persona: row.persona,
      title: row.title,
      tone: row.tone,
      dealId: row.deal_id,
      runId: row.run_id,
      posture: row.posture,
      orgId: row.org_id,
      userId: row.user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastMessageAt: row.last_message_at,
      expiresAt: row.expires_at,
      messages:
        (row.messages ?? []).map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.created_at,
        })) ?? [],
    })) as PersistedThread[];
}

export async function persistAiThread(
  supabase: SupabaseClient,
  params: {
    id: string;
    persona: AiPersona;
    orgId: string;
    userId: string;
    title?: string | null;
    tone?: string | null;
    dealId?: string | null;
    runId?: string | null;
    posture?: string | null;
    lastMessageAt?: string | null;
    expiresAt?: string | null;
  },
) {
  const expiresAt =
    params.expiresAt ?? new Date(Date.now() + RETENTION_MS).toISOString();
  const lastMessageAt = params.lastMessageAt ?? new Date().toISOString();

  const { error } = await supabase.from("ai_chat_threads").upsert(
    {
      id: params.id,
      persona: params.persona,
      org_id: params.orgId,
      user_id: params.userId,
      title: params.title ?? null,
      tone: params.tone ?? null,
      deal_id: params.dealId ?? null,
      run_id: params.runId ?? null,
      posture: params.posture ?? null,
      last_message_at: lastMessageAt,
      expires_at: expiresAt,
    },
    { onConflict: "id" },
  );

  if (error) {
    throw error;
  }
}

export async function persistAiMessages(
  supabase: SupabaseClient,
  threadId: string,
  messages: AiChatMessage[],
) {
  if (!messages.length) return;

  const rows = messages.map((m) => ({
    id: m.id,
    thread_id: threadId,
    role: m.role,
    content: m.content,
    created_at: m.createdAt ?? new Date().toISOString(),
  }));

  const { error } = await supabase.from("ai_chat_messages").insert(rows);
  if (error) {
    throw error;
  }
}