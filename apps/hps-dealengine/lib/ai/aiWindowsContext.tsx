"use client";

import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import type { AiPersona, AiTone } from "./types";

type WindowId = "dealAnalyst" | "dealStrategist";

type WindowGeometry = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type WindowVisibility = "open" | "minimized" | "closed";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

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
  | { type: "START_NEW_SESSION"; id: WindowId; sessionId: string; title?: string; tone?: AiTone }
  | { type: "LOAD_SESSION"; id: WindowId; sessionId: string }
  | { type: "RENAME_SESSION"; id: WindowId; sessionId: string; title: string }
  | { type: "TOGGLE_PIN_SESSION"; id: WindowId; sessionId: string }
  | { type: "SET_SESSION_TONE"; id: WindowId; sessionId: string; tone: AiTone }
  | { type: "HYDRATE_FROM_STORAGE"; state: AiWindowsState }
  | { type: "CLEAR_ALL" };

const STORAGE_KEY = "dealengine.ai.windows.v1";

const AiWindowsContext = createContext<{
  state: AiWindowsState;
  dispatch: React.Dispatch<AiWindowsAction>;
} | null>(null);

const defaultState: AiWindowsState = {
  windows: {
    dealAnalyst: {
      id: "dealAnalyst",
      persona: "dealAnalyst",
      visibility: "closed",
      geometry: { x: 80, y: 80, width: 420, height: 520 },
      zIndex: 1,
      activeSessionId: null,
      sessions: [],
    },
    dealStrategist: {
      id: "dealStrategist",
      persona: "dealStrategist",
      visibility: "closed",
      geometry: { x: 140, y: 140, width: 420, height: 520 },
      zIndex: 2,
      activeSessionId: null,
      sessions: [],
    },
  },
  nextZIndex: 3,
};

function aiWindowsReducer(state: AiWindowsState, action: AiWindowsAction): AiWindowsState {
  switch (action.type) {
    case "HYDRATE_FROM_STORAGE":
      return action.state;

    case "OPEN_WINDOW": {
      const w = state.windows[action.id];
      const zIndex = state.nextZIndex;
      return {
        ...state,
        windows: {
          ...state.windows,
          [action.id]: { ...w, visibility: "open", zIndex },
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
          [action.id]: { ...w, visibility: "closed", activeSessionId: null, sessions: [] },
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
      const sessions = w.sessions.map((s) =>
        s.id === w.activeSessionId
          ? { ...s, updatedAt: new Date().toISOString(), messages: [...s.messages, action.message] }
          : s,
      );
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
        title:
          action.title ??
          (w.persona === "dealAnalyst" ? "Deal Analyst session" : "Deal Strategist session"),
        pinned: false,
        tone:
          action.tone ??
          (w.persona === "dealAnalyst" ? ("direct" as AiTone) : ("visionary" as AiTone)),
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

    case "CLEAR_ALL":
      return defaultState;

    default:
      return state;
  }
}

export function AiWindowsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(aiWindowsReducer, defaultState);

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
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage failures
    }
  }, [state]);

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
