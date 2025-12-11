"use client";

import React from "react";
import { Rnd } from "react-rnd";
import { useAiWindows } from "@/lib/ai/aiWindowsContext";
import DealAnalystPanel from "./DealAnalystPanel";
import AgentSessionHeader from "./AgentSessionHeader";
import AgentChatMenu from "./AgentChatMenu";
import { Menu } from "lucide-react";

export function DealAnalystWindow() {
  const { state, dispatch } = useAiWindows();
  const w = state.windows.dealAnalyst;
  const [menuOpen, setMenuOpen] = React.useState(false);
  const headerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!menuOpen) return;
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const maxHeight = typeof window !== "undefined" ? Math.round(window.innerHeight * 0.85) : 900;

  if (w.visibility === "closed" || !w.activeSessionId) return null;
  if (w.visibility === "minimized") return null;

  const { x, y, width } = w.geometry;
  const height = Math.max(w.geometry.height ?? 0, 640);

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
      minHeight={560}
      maxHeight={maxHeight}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      onDragStart={() => dispatch({ type: "FOCUS_WINDOW", id: "dealAnalyst" })}
      style={{ zIndex: w.zIndex, position: "fixed", pointerEvents: "auto" }}
      dragHandleClassName="de-ai-window-drag"
      cancel=".de-ai-window-actions"
    >
      <div className="flex h-full flex-col rounded-xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] backdrop-blur shadow-xl">
        <div ref={headerRef} className="relative">
          <div className="de-ai-window-header flex items-center justify-between gap-3 border-b border-[color:var(--glass-border)] px-3 py-3 text-xs font-semibold text-[color:var(--text-secondary)]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Open chat menu"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] text-text-primary hover:border-[color:var(--accent-color)]"
              >
                <Menu size={16} />
              </button>
              <div className="de-ai-window-drag flex-1 cursor-move">
                <AgentSessionHeader agentId="analyst" />
              </div>
            </div>
            <div className="de-ai-window-actions flex items-center gap-2 text-text-primary">
              <button
                type="button"
                aria-label="Minimize Analyst window"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={() => dispatch({ type: "MINIMIZE_WINDOW", id: "dealAnalyst" })}
                className="h-5 w-5 rounded-full border border-[color:var(--glass-border)] text-[10px] flex items-center justify-center"
              >
                -
              </button>
              <button
                type="button"
                aria-label="Close Analyst window"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={() => dispatch({ type: "CLOSE_WINDOW", id: "dealAnalyst" })}
                className="h-5 w-5 rounded-full border border-[color:var(--glass-border)] text-[10px] flex items-center justify-center"
              >
                x
              </button>
            </div>
          </div>
          <AgentChatMenu agentId="analyst" isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        </div>
        <div className="flex flex-col gap-2 overflow-hidden p-2">
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
