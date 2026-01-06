"use client";

const TITLE_LIMIT = 72;

export function deriveChatTitleFromMessage(text: string, fallback = "New Chat") {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (!normalized) return fallback;
  if (normalized.length <= TITLE_LIMIT) return normalized;
  return `${normalized.slice(0, TITLE_LIMIT).trimEnd()}...`;
}

export function isPlaceholderTitle(title?: string | null, persona?: string) {
  const t = (title ?? "").trim().toLowerCase();
  if (!t) return true;
  if (t === "new chat") return true;
  if (t.includes("session")) return true;
  if (persona === "dealNegotiator" && t.includes("playbook")) return true;
  return false;
}
