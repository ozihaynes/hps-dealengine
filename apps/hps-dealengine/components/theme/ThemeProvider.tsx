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

const ALLOWED_THEMES: DealEngineThemeName[] = ["burgundy", "green", "navy", "pink", "black"];
const THEME_ALIASES: Record<string, DealEngineThemeName> = {
  pink2: "pink",
  pink3: "pink",
};
const ALLOWED_SETTINGS: ThemeSetting[] = ["system", "dark", "light", ...ALLOWED_THEMES];
const SYSTEM_DARK_THEME: DealEngineThemeName = DEFAULT_THEME;
const SYSTEM_LIGHT_THEME: DealEngineThemeName = DEFAULT_THEME;

const normalizeThemeSetting = (value: unknown): ThemeSetting | null => {
  if (typeof value !== "string") return null;
  if (THEME_ALIASES[value]) return THEME_ALIASES[value] as ThemeSetting;
  if ((ALLOWED_SETTINGS as string[]).includes(value)) return value as ThemeSetting;
  return null;
};

const normalizeSetting = (value: unknown): ThemeSetting => normalizeThemeSetting(value) ?? DEFAULT_THEME;

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
    const normalized = normalizeThemeSetting(stored);
    if (normalized) return normalized;
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
      : DEFAULT_THEME;

  const initialTheme: DealEngineThemeName =
    typeof document !== "undefined"
      ? (normalizeThemeSetting(document.documentElement.getAttribute("data-theme")) as DealEngineThemeName | null) ??
        DEFAULT_THEME
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
    // If nothing stored, fall back to default theme
    setThemeSettingState(DEFAULT_THEME);
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

        const remoteRaw = settings.theme as ThemeSetting | string | undefined;
        const normalized = normalizeSetting(remoteRaw);
        const current = themeSettingRef.current;
        const legacyDefault = remoteRaw === "system" || remoteRaw === "dark" || remoteRaw === "light" || remoteRaw === "white";
        // If remote is a legacy default but user already chose a concrete theme, keep local and persist it back.
        if (legacyDefault && current && !["system", "dark", "light", DEFAULT_THEME].includes(current as any)) {
          remoteThemeRef.current = remoteRaw as ThemeSetting;
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
