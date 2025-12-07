"use client";

import React, { useEffect, useState } from "react";
import type { DealEngineThemeName } from "@/lib/themeTokens";
import { DEFAULT_THEME } from "@/lib/themeTokens";

const STORAGE_KEY = "dealengine.theme";

type ThemeContextValue = {
  theme: DealEngineThemeName;
  setTheme: (next: DealEngineThemeName) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

const ALLOWED_THEMES: DealEngineThemeName[] = ["navy", "burgundy", "green", "black", "white"];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<DealEngineThemeName>(DEFAULT_THEME);

  // On mount, hydrate from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY) as DealEngineThemeName | null;
    if (stored && ALLOWED_THEMES.includes(stored)) {
      setThemeState(stored);
    }
  }, []);

  // Apply to <html data-theme> and persist
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", theme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, theme);
    }
  }, [theme]);

  const setTheme = (next: DealEngineThemeName) => {
    if (!ALLOWED_THEMES.includes(next)) return;
    setThemeState(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
