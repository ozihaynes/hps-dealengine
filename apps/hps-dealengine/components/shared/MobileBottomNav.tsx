"use client";

import { usePathname, useRouter } from "next/navigation";
import { Icon } from "../ui";

type MobileNavItem = {
  href: string;
  label: string;
  icon: string; // SVG path from Icons
};

type MobileBottomNavProps = {
  items: MobileNavItem[];
};

/**
 * Glassy mobile bottom nav with icons + labels.
 * - Fixed to bottom
 * - Hidden on md+ via Tailwind (md:hidden)
 * - Uses route (pathname) for active state
 */
const MobileBottomNav = ({ items }: MobileBottomNavProps) => {
  const pathname = usePathname() ?? "";
  const router = useRouter();

  if (!items?.length) return null;

  const resolvePathname = (href: string) => {
    try {
      return new URL(href, typeof window !== "undefined" ? window.location.href : "http://localhost").pathname;
    } catch {
      return href.split("?")[0] ?? href;
    }
  };

  const handleNavigate = (href: string, isActive: boolean) => {
    if (isActive) return;
    router.push(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[color:var(--glass-border)] bg-[color:var(--bg-primary)] backdrop-blur-lg md:hidden"
      style={{ backgroundColor: "color-mix(in srgb, var(--bg-primary) 92%, transparent)" }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-around px-3">
        {items.map((item) => {
          const targetPath = resolvePathname(item.href);
          const isActive =
            pathname === targetPath ||
            pathname.startsWith(`${targetPath}/`);

          return (
            <button
              key={`${item.label}-${item.href}`}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => handleNavigate(item.href, isActive)}
              className={[
                "flex flex-1 flex-col items-center justify-center gap-1 py-3 text-[11px] font-semibold transition-colors",
                isActive
                  ? "text-[color:var(--accent-contrast)]"
                  : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]",
              ].join(" ")}
            >
              <Icon
                d={item.icon}
                size={22}
                className={
                  isActive
                    ? "drop-shadow-[0_0_6px_var(--accent-blue)]"
                    : undefined
                }
              />
              <span className={isActive ? "opacity-100" : "opacity-80"}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
