"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useDealSession } from "../dealSessionContext";
import { getSupabaseClient } from "../supabaseClient";
import { fetchAiThreads, persistAiMessages, persistAiThread } from "./chatHistory";
import type { AiPersona, AiTone, AiChatMessage } from "./types";
import { deriveChatTitleFromMessage, isPlaceholderTitle } from "./chatTitle";

type WindowId = "dealAnalyst" | "dealStrategist" | "dealNegotiator";
const WINDOW_BASE_Z = 80;
const WINDOW_ORDER: WindowId[] = ["dealAnalyst", "dealStrategist", "dealNegotiator"];
const MIN_Z_BY_WINDOW: Record<WindowId, number> = {
  dealAnalyst: WINDOW_BASE_Z,
  dealStrategist: WINDOW_BASE_Z + 1,
  dealNegotiator: WINDOW_BASE_Z + 2,
};

type WindowGeometry = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type WindowVisibility = "open" | "minimized" | "closed";

type ChatMessage = AiChatMessage;

export type AiSession = {
  id: string;
  persona: AiPersona;
  createdAt: string;
  updatedAt: string;
  title?: string;
  pinned?: boolean;
  tone?: AiTone;
  messages: ChatMessage[];
  dealId?: string;
  orgId?: string;
  runId?: string;
  posture?: string;
  isStale?: boolean;
};

type WindowState = {
  id: WindowId;
  persona: AiPersona;
  visibility: WindowVisibility;
  geometry: WindowGeometry;
  zIndex: number;
  activeSessionId: string | null;
  sessions: AiSession[];
};

export type AiWindowsState = {
  windows: Record<WindowId, WindowState>;
  nextZIndex: number;
};

type AiWindowsAction =
  | { type: "OPEN_WINDOW"; id: WindowId }
  | { type: "MINIMIZE_WINDOW"; id: WindowId }
  | { type: "CLOSE_WINDOW"; id: WindowId }
  | { type: "FOCUS_WINDOW"; id: WindowId }
  | { type: "UPDATE_GEOMETRY"; id: WindowId; geometry: Partial<WindowGeometry> }
  | { type: "APPEND_MESSAGE"; id: WindowId; message: ChatMessage }
  | {
      type: "START_NEW_SESSION";
      id: WindowId;
      sessionId: string;
      title?: string;
      tone?: AiTone;
      context?: { dealId?: string; orgId?: string; runId?: string; posture?: string };
    }
  | { type: "LOAD_SESSION"; id: WindowId; sessionId: string }
  | { type: "RENAME_SESSION"; id: WindowId; sessionId: string; title: string }
  | { type: "TOGGLE_PIN_SESSION"; id: WindowId; sessionId: string }
  | { type: "SET_SESSION_TONE"; id: WindowId; sessionId: string; tone: AiTone }
  | { type: "HYDRATE_FROM_STORAGE"; state: AiWindowsState }
  | { type: "SET_SESSIONS"; id: WindowId; sessions: AiSession[] }
  | { type: "CLEAR_ALL" };

const STORAGE_KEY = "dealengine.ai.windows.v1";

const AiWindowsContext = createContext<{
  state: AiWindowsState;
  dispatch: React.Dispatch<AiWindowsAction>;
} | null>(null);

function applyZFloor(windows: Record<WindowId, WindowState>) {
  const next = { ...windows };
  for (const id of WINDOW_ORDER) {
    const current = next[id];
    if (!current) continue;
    next[id] = { ...current, zIndex: Math.max(current.zIndex ?? 0, MIN_Z_BY_WINDOW[id]) };
  }
  return next;
}

const defaultState: AiWindowsState = {
  windows: {
    dealAnalyst: {
      id: "dealAnalyst",
      persona: "dealAnalyst",
      visibility: "closed",
      geometry: { x: 80, y: 80, width: 600, height: 520 },
      zIndex: MIN_Z_BY_WINDOW.dealAnalyst,
      activeSessionId: null,
      sessions: [],
    },
    dealStrategist: {
      id: "dealStrategist",
      persona: "dealStrategist",
      visibility: "closed",
      geometry: { x: 140, y: 140, width: 600, height: 520 },
      zIndex: MIN_Z_BY_WINDOW.dealStrategist,
      activeSessionId: null,
      sessions: [],
    },
    dealNegotiator: {
      id: "dealNegotiator",
      persona: "dealNegotiator",
      visibility: "closed",
      geometry: { x: 200, y: 200, width: 600, height: 520 },
      zIndex: MIN_Z_BY_WINDOW.dealNegotiator,
      activeSessionId: null,
      sessions: [],
    },
  },
  nextZIndex: WINDOW_BASE_Z + WINDOW_ORDER.length,
};

function aiWindowsReducer(state: AiWindowsState, action: AiWindowsAction): AiWindowsState {
  switch (action.type) {
    case "HYDRATE_FROM_STORAGE":
      return {
        ...defaultState,
        ...action.state,
        windows: applyZFloor({
          ...defaultState.windows,
          ...(action.state?.windows ?? {}),
        }),
        nextZIndex: Math.max(
          action.state?.nextZIndex ?? defaultState.nextZIndex,
          WINDOW_BASE_Z + WINDOW_ORDER.length,
        ),
      };

    case "OPEN_WINDOW": {
      const w = state.windows[action.id];
      const zIndex = state.nextZIndex;
      return {
        ...state,
        windows: {
          ...state.windows,
          [action.id]: { ...w, visibility: "open", zIndex: Math.max(zIndex, MIN_Z_BY_WINDOW[action.id]) },
        },
        nextZIndex: zIndex + 1,
      };
    }

    case "MINIMIZE_WINDOW": {
      const w = state.windows[action.id];
      return {
        ...state,
        windows: { ...state.windows, [action.id]: { ...w, visibility: "minimized" } },
      };
    }

    case "CLOSE_WINDOW": {
      const w = state.windows[action.id];
      return {
        ...state,
        windows: {
          ...state.windows,
          [action.id]: { ...w, visibility: "closed", activeSessionId: null },
        },
      };
    }

    case "FOCUS_WINDOW": {
      const w = state.windows[action.id];
      const zIndex = state.nextZIndex;
      return {
        ...state,
        windows: { ...state.windows, [action.id]: { ...w, zIndex } },
        nextZIndex: zIndex + 1,
      };
    }

    case "UPDATE_GEOMETRY": {
      const w = state.windows[action.id];
      return {
        ...state,
        windows: {
          ...state.windows,
          [action.id]: { ...w, geometry: { ...w.geometry, ...action.geometry } },
        },
      };
    }

    case "APPEND_MESSAGE": {
      const w = state.windows[action.id];
      if (!w.activeSessionId) return state;
      const sessions = w.sessions.map((s) => {
        if (s.id !== w.activeSessionId) return s;
        const updatedAt = new Date().toISOString();
        const nextMessages = [...s.messages, action.message];
        let nextTitle = s.title;
        if (
          action.message.role === "user" &&
          isPlaceholderTitle(nextTitle, s.persona) &&
          action.message.content
        ) {
          nextTitle = deriveChatTitleFromMessage(action.message.content);
        }
        return { ...s, updatedAt, messages: nextMessages, title: nextTitle };
      });
      return {
        ...state,
        windows: { ...state.windows, [action.id]: { ...w, sessions } },
      };
    }

    case "START_NEW_SESSION": {
      const w = state.windows[action.id];
      const now = new Date().toISOString();
      const newSession: AiSession = {
        id: action.sessionId,
        persona: w.persona,
        createdAt: now,
        updatedAt: now,
        orgId: action.context?.orgId,
        dealId: action.context?.dealId,
        runId: action.context?.runId,
        posture: action.context?.posture,
        title:
          action.title ??
          (w.persona === "dealAnalyst"
            ? "New Chat"
            : w.persona === "dealStrategist"
              ? "New Chat"
              : "Negotiator Playbook"),
        pinned: false,
        tone:
          action.tone ??
          (w.persona === "dealAnalyst"
            ? ("direct" as AiTone)
            : w.persona === "dealStrategist"
              ? ("visionary" as AiTone)
              : ("neutral" as AiTone)),
        messages: [],
      };
      return {
        ...state,
        windows: {
          ...state.windows,
          [action.id]: {
            ...w,
            sessions: [newSession, ...w.sessions],
            activeSessionId: action.sessionId,
            visibility: "open",
          },
        },
      };
    }

    case "RENAME_SESSION": {
      const w = state.windows[action.id];
      const sessions = w.sessions.map((s) =>
        s.id === action.sessionId ? { ...s, title: action.title, updatedAt: new Date().toISOString() } : s,
      );
      return { ...state, windows: { ...state.windows, [action.id]: { ...w, sessions } } };
    }

    case "TOGGLE_PIN_SESSION": {
      const w = state.windows[action.id];
      const sessions = w.sessions.map((s) =>
        s.id === action.sessionId ? { ...s, pinned: !s.pinned } : s,
      );
      return { ...state, windows: { ...state.windows, [action.id]: { ...w, sessions } } };
    }

    case "SET_SESSION_TONE": {
      const w = state.windows[action.id];
      const sessions = w.sessions.map((s) =>
        s.id === action.sessionId ? { ...s, tone: action.tone, updatedAt: new Date().toISOString() } : s,
      );
      return { ...state, windows: { ...state.windows, [action.id]: { ...w, sessions } } };
    }

    case "LOAD_SESSION": {
      const w = state.windows[action.id];
      const exists = w.sessions.some((s) => s.id === action.sessionId);
      if (!exists) return state;
      return {
        ...state,
        windows: {
          ...state.windows,
          [action.id]: { ...w, activeSessionId: action.sessionId, visibility: "open" },
        },
      };
    }

    case "SET_SESSIONS": {
      const w = state.windows[action.id];
      const nextSessions = action.sessions ?? [];
      const nextActive =
        w.activeSessionId && nextSessions.some((s) => s.id === w.activeSessionId)
          ? w.activeSessionId
          : nextSessions[0]?.id ?? null;
      return {
        ...state,
        windows: {
          ...state.windows,
          [action.id]: { ...w, sessions: nextSessions, activeSessionId: nextActive },
        },
      };
    }

    case "CLEAR_ALL":
      return defaultState;

    default:
      return state;
  }
}

export function AiWindowsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(aiWindowsReducer, defaultState);
  const supabase = useMemo<SupabaseClient>(() => getSupabaseClient(), []);
  const { dbDeal, lastRunId, posture } = useDealSession();
  const [userId, setUserId] = useState<string | null>(null);
  const persistedCountsRef = useRef<Record<string, number>>({});
  const sessionGroups = useMemo(
    () => ({
      dealAnalyst: state.windows.dealAnalyst.sessions,
      dealStrategist: state.windows.dealStrategist.sessions,
      dealNegotiator: state.windows.dealNegotiator.sessions,
    }),
    [state.windows.dealAnalyst.sessions, state.windows.dealStrategist.sessions, state.windows.dealNegotiator.sessions],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as AiWindowsState;
      dispatch({ type: "HYDRATE_FROM_STORAGE", state: parsed });
    } catch {
      // ignore bad storage
    }
  }, []);

  useEffect(() => {
    let active = true;
    const loadUser = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        setUserId(data.session?.user?.id ?? null);
      } catch {
        if (!active) return;
        setUserId(null);
      }
    };
    void loadUser();
    return () => {
      active = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!userId || !dbDeal?.org_id) return;
    let cancelled = false;
    const hydrateFromRemote = async () => {
      try {
        const threads = await fetchAiThreads(supabase, { orgId: dbDeal.org_id });
        if (cancelled || !threads) return;
        const grouped: Record<WindowId, AiSession[]> = {
          dealAnalyst: [],
          dealStrategist: [],
          dealNegotiator: [],
        };
        threads.forEach((thread) => {
          if (!WINDOW_ORDER.includes(thread.persona as WindowId)) return;
          const sortedMessages =
            thread.messages?.slice().sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? "")) ?? [];
          const messages: ChatMessage[] = sortedMessages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt ?? new Date().toISOString(),
          }));
          const session: AiSession = {
            id: thread.id,
            persona: thread.persona as AiPersona,
            createdAt: thread.createdAt ?? thread.lastMessageAt ?? new Date().toISOString(),
            updatedAt: thread.updatedAt ?? thread.createdAt ?? new Date().toISOString(),
            title: thread.title ?? undefined,
            tone: (thread.tone as AiTone | undefined) ?? undefined,
            messages,
            dealId: thread.dealId ?? undefined,
            orgId: thread.orgId ?? dbDeal.org_id,
            runId: thread.runId ?? undefined,
            posture: thread.posture ?? posture,
          };
          grouped[thread.persona as WindowId].push(session);
          persistedCountsRef.current[thread.id] = messages.length;
        });

        dispatch({ type: "SET_SESSIONS", id: "dealAnalyst", sessions: sortSessionsForPersona(grouped.dealAnalyst) });
        dispatch({
          type: "SET_SESSIONS",
          id: "dealStrategist",
          sessions: sortSessionsForPersona(grouped.dealStrategist),
        });
        dispatch({
          type: "SET_SESSIONS",
          id: "dealNegotiator",
          sessions: sortSessionsForPersona(grouped.dealNegotiator),
        });
      } catch (err) {
        console.error("[AiWindows] failed to hydrate chat threads", err);
      }
    };

    void hydrateFromRemote();
    return () => {
      cancelled = true;
    };
  }, [dbDeal?.org_id, posture, supabase, userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage failures
    }
  }, [state]);

  useEffect(() => {
    if (!userId || !dbDeal?.org_id) return;
    const orgId = dbDeal.org_id;
    const syncSessions = async () => {
      const allSessions = [
        ...sessionGroups.dealAnalyst,
        ...sessionGroups.dealStrategist,
        ...sessionGroups.dealNegotiator,
      ];

      for (const session of allSessions) {
        const targetOrgId = session.orgId ?? orgId;
        if (session.orgId && session.orgId !== orgId) {
          continue;
        }
        if (session.persona === "dealStrategist") {
          persistedCountsRef.current[session.id] = session.messages.length;
          continue;
        }
        try {
          await persistAiThread(supabase, {
            id: session.id,
            persona: session.persona,
            title: session.title ?? null,
            tone: session.tone ?? null,
            dealId: session.dealId ?? dbDeal?.id ?? null,
            runId: session.runId ?? lastRunId ?? null,
            posture: session.posture ?? posture ?? null,
            orgId: targetOrgId,
            userId,
            lastMessageAt: session.messages.at(-1)?.createdAt ?? session.updatedAt,
          });
        } catch (err) {
          console.error("[AiWindows] failed to persist thread", err);
        }

        const previousCount = persistedCountsRef.current[session.id] ?? 0;
        if (session.messages.length > previousCount) {
          const newMessages = session.messages.slice(previousCount);
          try {
            await persistAiMessages(supabase, session.id, newMessages);
            persistedCountsRef.current[session.id] = session.messages.length;
          } catch (err) {
            console.error("[AiWindows] failed to persist chat messages", err);
          }
        } else if (!(session.id in persistedCountsRef.current)) {
          persistedCountsRef.current[session.id] = session.messages.length;
        }
      }
    };

    void syncSessions();
  }, [dbDeal?.id, dbDeal?.org_id, lastRunId, posture, sessionGroups, supabase, userId]);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <AiWindowsContext.Provider value={value}>{children}</AiWindowsContext.Provider>;
}

export function useAiWindows() {
  const ctx = useContext(AiWindowsContext);
  if (!ctx) throw new Error("useAiWindows must be used within AiWindowsProvider");
  return ctx;
}

export function clearAiWindowsStorage() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function sortSessionsForPersona(sessions: AiSession[]) {
  return [...sessions].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt);
  });
}
