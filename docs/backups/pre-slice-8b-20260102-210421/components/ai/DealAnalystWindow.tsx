"use client";

import React from "react";
import { Rnd } from "react-rnd";
import { useAiWindows } from "@/lib/ai/aiWindowsContext";
import DealAnalystPanel from "./DealAnalystPanel";
import AgentSessionHeader from "./AgentSessionHeader";
import AgentChatMenu from "./AgentChatMenu";
import { Menu } from "lucide-react";
import AiWindowShell from "./AiWindowShell";
import {
  COMPACT_SCALE,
  VIEWPORT_MARGIN_PX,
  clampGeometryToViewport,
  computeCompactGeometry,
  type RndGeometry,
  useIsMobileOrTablet,
} from "./aiWindowViewport";

export function DealAnalystWindow() {
  const { state, dispatch } = useAiWindows();
  const w = state.windows.dealAnalyst;
  const [menuOpen, setMenuOpen] = React.useState(false);
  const headerRef = React.useRef<HTMLDivElement | null>(null);
  const [renderWindow, setRenderWindow] = React.useState(false);
  const [isClosing, setIsClosing] = React.useState(false);
  const closeTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const isMobileOrTablet = useIsMobileOrTablet();
  const [compactGeom, setCompactGeom] = React.useState<RndGeometry | null>(null);

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
  const baseHeight = Math.min(maxHeight, Math.max(w.geometry.height ?? 520, minHeight));
  const baseWidth = w.geometry.width;
  const isVisible = w.visibility === "open" && !!w.activeSessionId;
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : baseWidth;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : baseHeight;
  const scaledMinHeight = Math.round(minHeight * COMPACT_SCALE);
  const effectiveMinHeight = isMobileOrTablet
    ? Math.min(Math.max(scaledMinHeight, 200), Math.max(200, baseHeight))
    : minHeight;
  const effectiveMaxHeight = isMobileOrTablet
    ? Math.round(Math.min(maxHeight, viewportHeight - VIEWPORT_MARGIN_PX * 2))
    : maxHeight;

  const ensureCompactGeometry = React.useCallback(() => {
    if (!isMobileOrTablet || typeof window === "undefined") return null;
    const geom = computeCompactGeometry({
      baseWidth,
      baseHeight,
      baseX: w.geometry.x,
      baseY: w.geometry.y,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });
    setCompactGeom(geom);
    return geom;
  }, [isMobileOrTablet, baseWidth, baseHeight, w.geometry.x, w.geometry.y]);

  React.useEffect(() => {
    if (isVisible && isMobileOrTablet) {
      ensureCompactGeometry();
    }
  }, [ensureCompactGeometry, isMobileOrTablet, isVisible]);

  React.useEffect(() => {
    if (!isMobileOrTablet) {
      setCompactGeom(null);
    }
  }, [isMobileOrTablet]);

  React.useEffect(() => {
    if (!isVisible || !isMobileOrTablet) return;
    const handleResize = () => {
      if (typeof window === "undefined") return;
      setCompactGeom((prev) => {
        const next =
          prev ??
          computeCompactGeometry({
            baseWidth,
            baseHeight,
            baseX: w.geometry.x,
            baseY: w.geometry.y,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
          });
        return clampGeometryToViewport(next, window.innerWidth, window.innerHeight, VIEWPORT_MARGIN_PX);
      });
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [baseHeight, baseWidth, isMobileOrTablet, isVisible, w.geometry.x, w.geometry.y]);

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

  const { x, y, width } = w.geometry;
  const desktopHeight = baseHeight;

  const clampedGeometry: RndGeometry = React.useMemo(() => {
    if (!isMobileOrTablet) {
      return { x, y, width, height: desktopHeight };
    }
    const geom =
      compactGeom ??
      computeCompactGeometry({
        baseWidth,
        baseHeight: desktopHeight,
        baseX: x,
        baseY: y,
        viewportWidth,
        viewportHeight,
      });
    return clampGeometryToViewport(geom, viewportWidth, viewportHeight, VIEWPORT_MARGIN_PX);
  }, [
    baseWidth,
    compactGeom,
    desktopHeight,
    isMobileOrTablet,
    viewportHeight,
    viewportWidth,
    x,
    y,
    width,
  ]);

  if (!renderWindow) return null;

  const handleDragStop = (_: any, data: { x: number; y: number }) => {
    if (isMobileOrTablet) {
      const next = clampGeometryToViewport(
        { ...clampedGeometry, x: data.x, y: data.y },
        viewportWidth,
        viewportHeight,
        VIEWPORT_MARGIN_PX,
      );
      setCompactGeom(next);
      dispatch({ type: "FOCUS_WINDOW", id: "dealAnalyst" });
      return;
    }
    dispatch({ type: "UPDATE_GEOMETRY", id: "dealAnalyst", geometry: { x: data.x, y: data.y } });
    dispatch({ type: "FOCUS_WINDOW", id: "dealAnalyst" });
  };

  const handleResizeStop = (_: any, __: any, ref: HTMLElement, ___: any, pos: { x: number; y: number }) => {
    if (isMobileOrTablet) {
      const next = clampGeometryToViewport(
        { x: pos.x, y: pos.y, width: ref.offsetWidth, height: ref.offsetHeight },
        viewportWidth,
        viewportHeight,
        VIEWPORT_MARGIN_PX,
      );
      setCompactGeom(next);
      dispatch({ type: "FOCUS_WINDOW", id: "dealAnalyst" });
      return;
    }
    dispatch({
      type: "UPDATE_GEOMETRY",
      id: "dealAnalyst",
      geometry: { x: pos.x, y: pos.y, width: ref.offsetWidth, height: ref.offsetHeight },
    });
    dispatch({ type: "FOCUS_WINDOW", id: "dealAnalyst" });
  };

  return (
    <Rnd
      size={{ width: clampedGeometry.width, height: clampedGeometry.height }}
      position={{ x: clampedGeometry.x, y: clampedGeometry.y }}
      bounds="window"
      minHeight={effectiveMinHeight}
      maxHeight={effectiveMaxHeight > 0 ? effectiveMaxHeight : undefined}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      onDragStart={() => dispatch({ type: "FOCUS_WINDOW", id: "dealAnalyst" })}
      style={{ zIndex: w.zIndex, position: "fixed", pointerEvents: "auto" }}
      dragHandleClassName="de-ai-window-drag"
      cancel=".de-ai-window-actions"
    >
      <AiWindowShell
        className={isClosing ? "ai-window-animate-out" : "ai-window-animate-in"}
        header={
          <div ref={headerRef} className="relative">
            <div className="de-ai-window-header flex items-center justify-between gap-3 border-b border-[color:var(--ai-window-divider)] px-3 py-3 text-xs font-semibold text-[color:var(--text-secondary)]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Open chat menu"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-[color:var(--ai-window-divider)] bg-[color:var(--ai-window-surface)] text-text-primary transition hover:border-[color:var(--ai-window-border-strong)]"
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
                  className="flex h-5 w-5 items-center justify-center rounded-full border border-[color:var(--ai-window-divider)] text-[10px]"
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
                  className="flex h-5 w-5 items-center justify-center rounded-full border border-[color:var(--ai-window-divider)] text-[10px]"
                >
                  x
                </button>
              </div>
            </div>
            <AgentChatMenu agentId="analyst" isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
          </div>
        }
      >
        <div className="flex flex-1 flex-col gap-3 p-3">
          <DealAnalystPanel
            onClose={() => dispatch({ type: "CLOSE_WINDOW", id: "dealAnalyst" })}
            onMinimize={() => dispatch({ type: "MINIMIZE_WINDOW", id: "dealAnalyst" })}
          />
        </div>
      </AiWindowShell>
    </Rnd>
  );
}

export default DealAnalystWindow;
