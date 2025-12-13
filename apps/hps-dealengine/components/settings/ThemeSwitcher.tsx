"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import type { ThemeSetting } from "@/components/theme/ThemeProvider";
import { cn } from "@/components/ui";
import { THEME_METADATA } from "@/lib/themeTokens";

// Order: Red (burgundy) → Green → Blue (navy) → Pink → Black
const THEME_ORDER: Array<ThemeSetting> = ["burgundy", "green", "navy", "pink", "black"];

export function ThemeSwitcher({
  onSelect,
}: {
  onSelect?: (value: ThemeSetting) => void;
}) {
  const { theme, themeSetting, setTheme, saving } = useTheme();

  const isSelected = (key: string) => themeSetting === key || theme === key;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Theme</h2>
      <p className="text-xs text-[color:var(--text-muted)]">
        Choose your preferred dashboard theme. Navy Blue is the default.
      </p>
      <div className="flex flex-wrap gap-3">
        {THEME_ORDER.map((key) => {
          const meta = THEME_METADATA[key as keyof typeof THEME_METADATA];
          const selected = isSelected(key);

          const gradientClass =
            key === "burgundy"
              ? "bg-gradient-to-br from-[#3d0d0d] to-[#b11225]"
              : key === "green"
                ? "bg-gradient-to-br from-[#0d1f19] to-[#1ABC9C]"
                : key === "navy"
                  ? "bg-gradient-to-br from-[#00070f] to-[#0096FF]"
                  : key === "pink"
                    ? "bg-gradient-to-br from-[#2f0f20] to-[#ff83a6]"
                    : "bg-gradient-to-br from-[#000000] to-[#4b5563]";

          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTheme(key);
                onSelect?.(key as ThemeSetting);
              }}
              className={cn(
                "relative flex h-14 w-14 items-center justify-center rounded-xl border-2 transition-all duration-300",
                gradientClass,
                selected
                  ? "border-white shadow-[0_0_0_3px_rgba(255,255,255,0.5)]"
                  : "border-transparent hover:-translate-y-0.5 hover:shadow-lg",
                saving ? "opacity-70 cursor-wait" : ""
              )}
              aria-label={meta.label}
              title={meta.label}
              disabled={saving}
            >
              <span className="sr-only">{meta.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
