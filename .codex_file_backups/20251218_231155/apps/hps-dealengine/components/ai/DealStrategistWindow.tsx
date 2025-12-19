"use client";

import React from "react";
import { Rnd } from "react-rnd";
import { useAiWindows } from "@/lib/ai/aiWindowsContext";
import DealStrategistPanel from "./DealStrategistPanel";
import AgentSessionHeader from "./AgentSessionHeader";
import AgentChatMenu from "./AgentChatMenu";
import { Menu } from "lucide-react";
import AiWindowShell from "./AiWindowShell";

export function DealStrategistWindow() {
  const { state, dispatch } = useAiWindows();
  const w = state.windows.dealStrategist;
  const [menuOpen, setMenuOpen] = React.useState(false);
  const headerRef = React.useRef<HTMLDivElement | null>(null);
  const [renderWindow, setRenderWindow] = React.useState(false);
  const [isClosing, setIsClosing] = React.useState(false);
  const closeTimerRef = React.useRef<NodeJS.Timeout | null>(null);

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
  const minHeight = 440;
  const isVisible = w.visibility === "open" && !!w.activeSessionId;

  React.useEffect(() => {
    if (isVisible) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setIsClosing(false);
      setRenderWindow(true);
      return;
    }
    if (renderWindow) {
      setIsClosing(true);
      closeTimerRef.current = setTimeout(() => {
        setRenderWindow(false);
        setIsClosing(false);
      }, 180);
    }
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [isVisible, renderWindow]);

  if (!renderWindow) return null;

  const { x, y, width } = w.geometry;
  const height = Math.min(maxHeight, Math.max(w.geometry.height ?? 520, minHeight));

  const handleDragStop = (_: any, data: { x: number; y: number }) => {
    dispatch({ type: "UPDATE_GEOMETRY", id: "dealStrategist", geometry: { x: data.x, y: data.y } });
    dispatch({ type: "FOCUS_WINDOW", id: "dealStrategist" });
  };

  const handleResizeStop = (_: any, __: any, ref: HTMLElement, ___: any, pos: { x: number; y: number }) => {
    dispatch({
      type: "UPDATE_GEOMETRY",
      id: "dealStrategist",
      geometry: { x: pos.x, y: pos.y, width: ref.offsetWidth, height: ref.offsetHeight },
    });
    dispatch({ type: "FOCUS_WINDOW", id: "dealStrategist" });
  };

  return (
    <Rnd
      size={{ width, height }}
      position={{ x, y }}
      bounds="window"
      minHeight={minHeight}
      maxHeight={maxHeight}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      onDragStart={() => dispatch({ type: "FOCUS_WINDOW", id: "dealStrategist" })}
      style={{ zIndex: w.zIndex, position: "fixed", pointerEvents: "auto" }}
      dragHandleClassName="de-ai-window-drag"
      cancel=".de-ai-window-actions"
    >
      <AiWindowShell
        className={isClosing ? "ai-window-animate-out" : "ai-window-animate-in"}
        header={
          <div ref={headerRef} className="relative">
            <div className="de-ai-window-header flex items-center justify-between gap-3 border-b border-[color:var(--glass-border)] px-3 py-3 text-xs font-semibold text-[color:var(--text-secondary)]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Open chat menu"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] text-text-primary transition hover:border-[color:var(--accent-color)]"
                >
                  <Menu size={16} />
                </button>
                <div className="de-ai-window-drag flex-1 cursor-move">
                  <AgentSessionHeader agentId="strategist" />
                </div>
              </div>
              <div className="de-ai-window-actions flex items-center gap-2 text-text-primary">
                <button
                  type="button"
                  aria-label="Minimize Strategist window"
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={() => dispatch({ type: "MINIMIZE_WINDOW", id: "dealStrategist" })}
                  className="flex h-5 w-5 items-center justify-center rounded-full border border-[color:var(--glass-border)] text-[10px]"
                >
                  -
                </button>
                <button
                  type="button"
                  aria-label="Close Strategist window"
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={() => dispatch({ type: "CLOSE_WINDOW", id: "dealStrategist" })}
                  className="flex h-5 w-5 items-center justify-center rounded-full border border-[color:var(--glass-border)] text-[10px]"
                >
                  x
                </button>
              </div>
            </div>
            <AgentChatMenu agentId="strategist" isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
          </div>
        }
      >
        <div className="flex flex-1 flex-col gap-3 p-3">
          <DealStrategistPanel
            onClose={() => dispatch({ type: "CLOSE_WINDOW", id: "dealStrategist" })}
            onMinimize={() => dispatch({ type: "MINIMIZE_WINDOW", id: "dealStrategist" })}
          />
        </div>
      </AiWindowShell>
    </Rnd>
  );
}

export default DealStrategistWindow;
