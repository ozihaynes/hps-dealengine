"use client";

import React from "react";
import { Rnd } from "react-rnd";
import { useAiWindows } from "@/lib/ai/aiWindowsContext";
import DealAnalystPanel from "./DealAnalystPanel";
import { sortSessionsForPersona } from "@/lib/ai/aiWindowsContext";

export function DealAnalystWindow() {
  const { state, dispatch } = useAiWindows();
  const w = state.windows.dealAnalyst;

  if (w.visibility === "closed" || !w.activeSessionId) return null;
  if (w.visibility === "minimized") return null;

  const { x, y, width, height } = w.geometry;

  const handleDragStop = (_: any, data: { x: number; y: number }) => {
    dispatch({ type: "UPDATE_GEOMETRY", id: "dealAnalyst", geometry: { x: data.x, y: data.y } });
    dispatch({ type: "FOCUS_WINDOW", id: "dealAnalyst" });
  };

  const handleResizeStop = (_: any, __: any, ref: HTMLElement, ___: any, pos: { x: number; y: number }) => {
    dispatch({
      type: "UPDATE_GEOMETRY",
      id: "dealAnalyst",
      geometry: { x: pos.x, y: pos.y, width: ref.offsetWidth, height: ref.offsetHeight },
    });
    dispatch({ type: "FOCUS_WINDOW", id: "dealAnalyst" });
  };

  return (
    <Rnd
      size={{ width, height }}
      position={{ x, y }}
      bounds="window"
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      onDragStart={() => dispatch({ type: "FOCUS_WINDOW", id: "dealAnalyst" })}
      style={{ zIndex: w.zIndex, position: "fixed" }}
      dragHandleClassName="de-ai-window-header"
    >
      <div className="flex h-full flex-col rounded-xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] backdrop-blur shadow-xl">
        <div className="de-ai-window-header flex items-center justify-between border-b border-[color:var(--glass-border)] px-3 py-2 text-xs font-semibold text-[color:var(--text-secondary)] cursor-move">
          <div className="flex flex-col gap-1">
            <input
              className="w-48 rounded border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] px-2 py-1 text-[12px] text-text-primary focus:outline-none"
              value={
                w.activeSessionId
                  ? w.sessions.find((s) => s.id === w.activeSessionId)?.title ?? "Deal Analyst session"
                  : "Deal Analyst session"
              }
              onChange={(e) =>
                w.activeSessionId &&
                dispatch({
                  type: "RENAME_SESSION",
                  id: "dealAnalyst",
                  sessionId: w.activeSessionId,
                  title: e.target.value || "Deal Analyst session",
                })
              }
            />
            <button
              type="button"
              className="text-[11px] text-[color:var(--accent-color)]"
              onClick={() => {
                if (!w.activeSessionId) return;
                dispatch({ type: "TOGGLE_PIN_SESSION", id: "dealAnalyst", sessionId: w.activeSessionId });
              }}
            >
              {w.activeSessionId && w.sessions.find((s) => s.id === w.activeSessionId)?.pinned ? "★ Pinned" : "☆ Pin"}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => dispatch({ type: "MINIMIZE_WINDOW", id: "dealAnalyst" })}
              className="h-5 w-5 rounded-full border border-[color:var(--glass-border)] text-[10px] flex items-center justify-center"
            >
              –
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "CLOSE_WINDOW", id: "dealAnalyst" })}
              className="h-5 w-5 rounded-full border border-[color:var(--glass-border)] text-[10px] flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2 overflow-hidden p-2">
          <div className="border border-[color:var(--glass-border)] rounded-lg bg-[color:var(--glass-bg)] p-2">
            <div className="mb-1 text-[11px] font-semibold text-text-secondary">History</div>
            <div className="flex flex-wrap gap-1">
              {sortSessionsForPersona(w.sessions).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => dispatch({ type: "LOAD_SESSION", id: "dealAnalyst", sessionId: s.id })}
                  className={`rounded-full border px-2 py-0.5 text-[11px] ${
                    s.id === w.activeSessionId
                      ? "border-[color:var(--accent-color)] bg-[color:var(--accent-color)]/10 text-text-primary"
                      : "border-[color:var(--glass-border)] text-text-secondary"
                  }`}
                  title={s.title ?? "Session"}
                >
                  {s.pinned ? "★ " : ""}
                  {s.title ?? "Session"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <DealAnalystPanel
              onClose={() => dispatch({ type: "CLOSE_WINDOW", id: "dealAnalyst" })}
              onMinimize={() => dispatch({ type: "MINIMIZE_WINDOW", id: "dealAnalyst" })}
            />
          </div>
        </div>
      </div>
    </Rnd>
  );
}

export default DealAnalystWindow;
