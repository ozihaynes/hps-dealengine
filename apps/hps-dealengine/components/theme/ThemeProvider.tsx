"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { DealEngineThemeName } from "@/lib/themeTokens";
import { DEFAULT_THEME } from "@/lib/themeTokens";
import { fetchUserSettings, upsertUserSettings } from "@/lib/userSettings";
import { getSupabaseClient } from "@/lib/supabaseClient";

const STORAGE_KEY = "dealengine.theme";

export type ThemeSetting = DealEngineThemeName | "system" | "dark" | "light";

type ThemeContextValue = {
  theme: DealEngineThemeName;
  themeSetting: ThemeSetting;
  setTheme: (next: ThemeSetting) => void;
  saving: boolean;
  source: "local" | "remote" | "system";
};

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

const ALLOWED_THEMES: DealEngineThemeName[] = ["navy", "burgundy", "green", "black", "white"];
const ALLOWED_SETTINGS: ThemeSetting[] = ["system", "dark", "light", ...ALLOWED_THEMES];
const SYSTEM_DARK_THEME: DealEngineThemeName = "navy";
const SYSTEM_LIGHT_THEME: DealEngineThemeName = "white";

const isAllowedSetting = (value: unknown): value is ThemeSetting =>
  typeof value === "string" && (ALLOWED_SETTINGS as string[]).includes(value);

const normalizeSetting = (value: unknown): ThemeSetting =>
  isAllowedSetting(value) ? (value as ThemeSetting) : "system";

const resolveTheme = (setting: ThemeSetting, prefersDark: boolean): DealEngineThemeName => {
  if (setting === "system") {
    return prefersDark ? SYSTEM_DARK_THEME : SYSTEM_LIGHT_THEME;
  }
  if (setting === "dark") return SYSTEM_DARK_THEME;
  if (setting === "light") return SYSTEM_LIGHT_THEME;
  return setting;
};

function safeReadLocalStorage(): ThemeSetting | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && isAllowedSetting(stored)) return stored;
  } catch {
    // ignore
  }
  return null;
}

function safeWriteLocalStorage(value: ThemeSetting) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const prefersDarkInitial =
    typeof window !== "undefined"
      ? window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      : false;

  const initialSetting: ThemeSetting =
    typeof document !== "undefined"
      ? normalizeSetting(document.documentElement.getAttribute("data-theme-setting"))
      : "system";

  const initialTheme: DealEngineThemeName =
    typeof document !== "undefined"
      ? (document.documentElement.getAttribute("data-theme") as DealEngineThemeName | null) ?? DEFAULT_THEME
      : DEFAULT_THEME;

  const [themeSetting, setThemeSettingState] = useState<ThemeSetting>(initialSetting);
  const [theme, setThemeState] = useState<DealEngineThemeName>(initialTheme);
  const [prefersDark, setPrefersDark] = useState<boolean>(prefersDarkInitial);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const pendingPersistRef = useRef(false);
  const remoteThemeRef = useRef<ThemeSetting | null>(null);
  const themeSettingRef = useRef<ThemeSetting>(initialSetting);
  useEffect(() => {
    themeSettingRef.current = themeSetting;
  }, [themeSetting]);
  const supabase = getSupabaseClient();

  const applyThemeAttributes = useCallback(
    (setting: ThemeSetting, resolved: DealEngineThemeName) => {
      if (typeof document === "undefined") return;
      document.documentElement.setAttribute("data-theme", resolved);
      document.documentElement.setAttribute("data-theme-setting", setting);
    },
    [],
  );

  // Resolve current theme + persist to localStorage + DOM
  useEffect(() => {
    const resolved = resolveTheme(themeSetting, prefersDark);
    setThemeState(resolved);
    applyThemeAttributes(themeSetting, resolved);
    safeWriteLocalStorage(themeSetting);
  }, [themeSetting, prefersDark, applyThemeAttributes]);

  // Watch system preference when using system mode
  useEffect(() => {
    if (themeSetting !== "system") return;
    const mql = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    if (!mql) return;

    const handler = (event: MediaQueryListEvent) => setPrefersDark(event.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [themeSetting]);

  // Hydrate from localStorage on mount (fallback to system)
  useEffect(() => {
    const stored = safeReadLocalStorage();
    if (stored) {
      setThemeSettingState(normalizeSetting(stored));
      return;
    }
    // If nothing stored, follow system preference
    setThemeSettingState("system");
  }, []);

  // Auth/session listener to load persisted theme from DB
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        const nextUserId = session?.user?.id ?? null;
        if (cancelled) return;
        setUserId(nextUserId);
        if (!session) return;

        const settings = await fetchUserSettings().catch(() => null);
        if (cancelled || !settings?.theme) return;

        const normalized = normalizeSetting(settings.theme);
        const current = themeSettingRef.current;
        // If remote is default/system but we already have a user-picked theme, keep local and sync later.
        if (normalized === "system" && current !== "system") {
          remoteThemeRef.current = normalized;
          pendingPersistRef.current = true;
          return;
        }
        remoteThemeRef.current = normalized;
        if (normalized !== current) {
          setThemeSettingState(normalized);
        }
      } catch {
        // ignore load errors; stay on local/system preference
      }
    };

    load();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event: unknown, session: Session | null) => {
      if (cancelled) return;
      const nextUserId = session?.user?.id ?? null;
      setUserId(nextUserId);
      if (session) {
        void load();
      }
    });

    return () => {
      cancelled = true;
      authListener?.subscription?.unsubscribe();
    };
  }, [supabase]);

  // Persist to DB when a user is present and change originated locally
  useEffect(() => {
    if (!userId || !pendingPersistRef.current) return;
    pendingPersistRef.current = false;
    setSaving(true);
    upsertUserSettings({ theme: themeSetting })
      .then(() => {
        remoteThemeRef.current = themeSetting;
      })
      .catch(() => {
        // swallow; user can retry via UI
      })
      .finally(() => setSaving(false));
  }, [themeSetting, userId]);

  const setTheme = useCallback((next: ThemeSetting) => {
    const normalized = normalizeSetting(next);
    pendingPersistRef.current = true;
    setThemeSettingState(normalized);
  }, []);

  const source: ThemeContextValue["source"] = useMemo(() => {
    if (themeSetting === "system") return "system";
    if (remoteThemeRef.current && remoteThemeRef.current === themeSetting) return "remote";
    return "local";
  }, [themeSetting]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeSetting,
        setTheme,
        saving,
        source,
      }}
    >
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
