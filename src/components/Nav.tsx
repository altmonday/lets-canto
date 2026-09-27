"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Today", icon: "⌂" },
  { href: "/learn", label: "Learn", icon: "▤" },
  { href: "/vocabulary", label: "Vocabulary", icon: "字" },
  { href: "/family", label: "Family", icon: "♡" },
  { href: "/progress", label: "Progress", icon: "◔" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur">
      <ul className="mx-auto flex max-w-3xl justify-around px-1 pt-2">
        {ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href) || (item.href === "/learn" && pathname.startsWith("/lesson"));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 min-w-16 flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-[11px] ${
                  active ? "font-extrabold text-forest" : "text-muted"
                }`}
              >
                <span aria-hidden className="text-xl leading-none">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
