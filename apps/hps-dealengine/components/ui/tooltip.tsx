import React, { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

/**
 * Minimal accessible tooltip primitive used by InfoTooltip.
 * Hover or focus shows the content; Escape hides it.
 */
export function Tooltip({
  content,
  children,
  className = "",
  side = "top",
  align = "start",
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const updatePosition = () => {
    const node = triggerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const offset = 8;
    let top = rect.top;
    let left = rect.left;

    if (side === "bottom") {
      top = rect.bottom + offset;
    } else if (side === "top") {
      top = rect.top - offset;
    } else {
      top = rect.top + rect.height / 2;
    }

    if (side === "left") {
      left = rect.left - offset;
    } else if (side === "right") {
      left = rect.right + offset;
    } else if (align === "center") {
      left = rect.left + rect.width / 2;
    } else if (align === "end") {
      left = rect.right;
    }

    setCoords({ top, left });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, side, align]);

  return (
    <div
      className={`relative inline-flex items-center overflow-visible ${className}`}
      ref={triggerRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      style={{ overflow: "visible" }}
    >
      {children}
      {open
        ? createPortal(
            <div
              role="tooltip"
              className="pointer-events-none fixed z-[100000]"
              style={{
                top: coords.top,
                left: coords.left,
                transform:
                  side === "top"
                    ? align === "center"
                      ? "translate(-50%, -100%)"
                      : align === "end"
                      ? "translate(-100%, -100%)"
                      : "translate(0, -100%)"
                    : side === "bottom"
                    ? align === "center"
                      ? "translate(-50%, 0)"
                      : align === "end"
                      ? "translate(-100%, 0)"
                      : "translate(0, 0)"
                    : side === "left"
                    ? "translate(-100%, -50%)"
                    : "translate(0, -50%)",
              }}
            >
              <div
                className={`inline-flex min-w-[200px] max-w-[280px] flex-row items-start gap-1 whitespace-normal rounded-xl border px-2 py-1.5 text-[11px] leading-snug text-[color:var(--text-primary)] shadow-lg`}
                style={{
                  borderColor: "var(--glass-border)",
                  background:
                    "linear-gradient(135deg, color-mix(in srgb, var(--accent-color) 16%, transparent) 0%, color-mix(in srgb, var(--glass-bg) 90%, transparent) 100%)",
                  boxShadow: "0 8px 24px -10px rgba(0,0,0,0.45)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  overflow: "visible",
                }}
              >
                <div className="w-full rounded-md bg-[color:var(--glass-bg)] px-1.5 py-1 text-[11px] leading-snug text-[color:var(--text-primary)]">
                  {content}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
