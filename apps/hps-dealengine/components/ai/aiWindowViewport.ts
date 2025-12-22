"use client";

import { useEffect, useState } from "react";
import defaultTheme from "tailwindcss/defaultTheme";

export type RndGeometry = { x: number; y: number; width: number; height: number };

const DESKTOP_MIN_WIDTH_PX = Number.parseInt(
  String(defaultTheme.screens?.lg ?? "1024px").replace("px", ""),
  10,
);
const MOBILE_TABLET_QUERY = `(max-width:${DESKTOP_MIN_WIDTH_PX - 1}px)`;
export const COMPACT_SCALE = 1 / 1.5;
export const VIEWPORT_MARGIN_PX = 16;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function clampGeometryToViewport(
  geom: RndGeometry,
  viewportWidth: number,
  viewportHeight: number,
  margin = VIEWPORT_MARGIN_PX,
): RndGeometry {
  const maxWidth = Math.max(0, viewportWidth - margin * 2);
  const maxHeight = Math.max(0, viewportHeight - margin * 2);

  const width = Math.min(geom.width, maxWidth);
  const height = Math.min(geom.height, maxHeight);

  const minX = margin;
  const minY = margin;
  const maxX = Math.max(minX, viewportWidth - width - margin);
  const maxY = Math.max(minY, viewportHeight - height - margin);

  return {
    width,
    height,
    x: clamp(geom.x, minX, maxX),
    y: clamp(geom.y, minY, maxY),
  };
}

export function computeCompactGeometry(params: {
  baseWidth: number;
  baseHeight: number;
  baseX: number;
  baseY: number;
  viewportWidth: number;
  viewportHeight: number;
  scaleFactor?: number;
  margin?: number;
  anchor?: "bottomRight" | "center";
}): RndGeometry {
  const {
    baseWidth,
    baseHeight,
    baseX,
    baseY,
    viewportWidth,
    viewportHeight,
    scaleFactor = COMPACT_SCALE,
    margin = VIEWPORT_MARGIN_PX,
    anchor = "bottomRight",
  } = params;

  let width = Math.max(0, Math.round(baseWidth * scaleFactor));
  let height = Math.max(0, Math.round(baseHeight * scaleFactor));

  width = Math.min(width, Math.max(0, viewportWidth - margin * 2));
  height = Math.min(height, Math.max(0, viewportHeight - margin * 2));

  const fallbackX = Number.isFinite(baseX) ? baseX : margin;
  const fallbackY = Number.isFinite(baseY) ? baseY : margin;

  let x = anchor === "center" ? (viewportWidth - width) / 2 : viewportWidth - width - margin;
  let y = viewportHeight - height - margin;
  if (!Number.isFinite(x)) x = fallbackX;
  if (!Number.isFinite(y)) y = fallbackY;

  return clampGeometryToViewport({ x, y, width, height }, viewportWidth, viewportHeight, margin);
}

export function useIsMobileOrTablet(): boolean {
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const mql = window.matchMedia(MOBILE_TABLET_QUERY);
    const handler = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsMobileOrTablet(!!event.matches);
    };

    handler(mql);
    mql.addEventListener("change", handler as EventListener);
    return () => mql.removeEventListener("change", handler as EventListener);
  }, []);

  return isMobileOrTablet;
}

export { DESKTOP_MIN_WIDTH_PX };
