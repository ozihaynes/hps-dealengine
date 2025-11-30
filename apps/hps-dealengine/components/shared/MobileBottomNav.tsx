"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();

  if (!items?.length) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[rgba(2,6,23,0.92)] backdrop-blur-lg md:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-around px-3">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (pathname?.startsWith(item.href + "/") ?? false);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={[
                "flex flex-1 flex-col items-center justify-center gap-1 py-3 text-[11px] font-semibold transition-colors",
                isActive
                  ? "text-accent-blue"
                  : "text-text-secondary hover:text-text-primary",
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
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
