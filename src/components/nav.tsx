"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS: Record<string, React.ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  vendors: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.5 3.3-5.5 6.5-5.5s5.9 2 6.5 5.5" />
      <circle cx="17.5" cy="9" r="2.5" />
      <path d="M17 14.5c2.4.2 4 1.8 4.5 4.5" />
    </>
  ),
  budget: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18M7 15h3" />
    </>
  ),
  tickets: (
    <>
      <rect x="3" y="4" width="5" height="16" rx="1.5" />
      <rect x="10" y="4" width="5" height="10" rx="1.5" />
      <rect x="17" y="4" width="4" height="13" rx="1.5" />
    </>
  ),
  tasks: (
    <>
      <path d="m4 7 2 2 4-4M4 16l2 2 4-4M13 7h7M13 16h7" />
    </>
  ),
  team: (
    <>
      <circle cx="8" cy="9" r="3" />
      <circle cx="16" cy="9" r="3" />
      <path d="M2.5 19c.5-3 2.7-4.5 5.5-4.5s5 1.5 5.5 4.5M13 15c.9-.4 1.9-.5 3-.5 2.8 0 5 1.5 5.5 4.5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
};

export const NAV = [
  { href: "/hq", label: "HQ", icon: "home" },
  { href: "/tickets", label: "Tickets", icon: "tickets" },
  { href: "/vendors", label: "Vendors", icon: "vendors" },
  { href: "/budget", label: "Budget", icon: "budget" },
  { href: "/team", label: "Team", icon: "team" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

type Mode = "personal" | "team";

/** The menu adapts to the chosen view: personal hides Team and calls tickets "Tasks". */
function itemsFor(mode: Mode, mobile: boolean) {
  return NAV.filter((item) => {
    if (mode === "personal") return item.href !== "/team";
    return mobile ? item.href !== "/settings" : true;
  }).map((item) =>
    item.href === "/tickets" && mode === "personal" ? { ...item, label: "Tasks", icon: "tasks" } : item
  );
}

function Icon({ name }: { name: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {ICONS[name]}
    </svg>
  );
}

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(href + "/");
}

export function SideNav({ mode }: { mode: Mode }) {
  const isActive = useIsActive();
  return (
    <nav className="space-y-1">
      {itemsFor(mode, false).map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
            isActive(item.href)
              ? "bg-accent-soft text-accent-dark"
              : "text-muted hover:bg-white hover:text-ink"
          }`}
        >
          <Icon name={item.icon} />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function BottomNav({ mode }: { mode: Mode }) {
  const isActive = useIsActive();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-md justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {itemsFor(mode, true).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
              isActive(item.href) ? "text-accent" : "text-muted"
            }`}
          >
            <Icon name={item.icon} />
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
