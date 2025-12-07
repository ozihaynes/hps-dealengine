"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import { cn } from "@/components/ui";
import { THEME_METADATA } from "@/lib/themeTokens";

const THEME_ORDER: Array<keyof typeof THEME_METADATA> = ["navy", "burgundy", "green", "black", "white"];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Theme</h2>
      <p className="text-xs text-[color:var(--text-muted)]">
        Choose your preferred dashboard theme. Navy Blue is the default.
      </p>
      <div className="flex flex-wrap gap-3">
        {THEME_ORDER.map((key) => {
          const meta = THEME_METADATA[key];
          const selected = theme === key;

          const gradientClass =
            key === "navy"
              ? "bg-gradient-to-br from-[#00070f] to-[#0096FF]"
              : key === "burgundy"
                ? "bg-gradient-to-br from-[#3d0d0d] to-[#b11225]"
                : key === "green"
                  ? "bg-gradient-to-br from-[#0d1f19] to-[#1ABC9C]"
                  : key === "black"
                    ? "bg-gradient-to-br from-[#000000] to-[#4b5563]"
                    : "bg-gradient-to-br from-[#f9fafb] to-[#111827]";

          return (
            <button
              key={key}
              type="button"
              onClick={() => setTheme(key)}
              className={cn(
                "relative flex h-14 w-14 items-center justify-center rounded-xl border-2 transition-all duration-300",
                gradientClass,
                selected
                  ? "border-white shadow-[0_0_0_3px_rgba(255,255,255,0.5)]"
                  : "border-transparent hover:-translate-y-0.5 hover:shadow-lg"
              )}
              aria-label={meta.label}
              title={meta.label}
            >
              <span className="sr-only">{meta.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
