"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  ScrollText,
  Hotel,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Insights", icon: LayoutDashboard },
  { href: "/import", label: "Import data", icon: Upload },
  { href: "/sync-logs", label: "Sync logs", icon: ScrollText },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full bg-slate-50 text-slate-900">
      <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-4">
          <div className="flex items-center gap-2 text-sky-900">
            <Hotel className="h-5 w-5" />
            <div>
              <p className="text-sm font-semibold leading-tight">Azzurro</p>
              <p className="text-[11px] font-medium text-slate-500">
                Review Insights
              </p>
            </div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-sky-50 text-sky-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <p className="border-t border-slate-200 px-4 py-3 text-[11px] text-slate-400">
          Daily auto sync · 00:00 Sydney
        </p>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
