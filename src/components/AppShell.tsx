"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  ScrollText,
  ExternalLink,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/", label: "Insights", icon: LayoutDashboard },
  { href: "/import", label: "Import data", icon: Upload },
  { href: "/sync-logs", label: "Sync logs", icon: ScrollText },
];

const COLLAPSE_KEY = "azzurro-sidebar-collapsed";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  useEffect(() => {
    try {
      setDesktopCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  function toggleDesktop() {
    setDesktopCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <div className="flex min-h-full">
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-azzurro-line/80 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
        <BrandMark compact />
        <button
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          className="rounded-lg p-2 text-azzurro-navy hover:bg-azzurro-mist"
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Desktop reopen when collapsed */}
      {desktopCollapsed && (
        <button
          type="button"
          aria-label="Open sidebar"
          onClick={toggleDesktop}
          className="fixed left-3 top-3 z-30 hidden items-center gap-1.5 rounded-xl border border-azzurro-line bg-white px-2.5 py-2 text-xs font-semibold text-azzurro-navy shadow-sm hover:bg-azzurro-mist md:inline-flex"
        >
          <PanelLeftOpen className="h-4 w-4" />
          Menu
        </button>
      )}

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu overlay"
          className="fixed inset-0 z-30 bg-azzurro-navy/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[min(16rem,85vw)] flex-col bg-azzurro-navy text-white transition-transform duration-200 md:sticky md:top-0 md:h-screen md:w-64 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${desktopCollapsed ? "md:-translate-x-full md:pointer-events-none md:invisible md:w-0 md:overflow-hidden" : "md:translate-x-0 md:visible"}`}
      >
        <div className="relative overflow-hidden border-b border-white/10 px-5 py-5">
          <div className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-azzurro-accent/25 blur-2xl" />
          <div className="flex items-start justify-between gap-2">
            <BrandMark />
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Close sidebar"
                className="hidden rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white md:inline-flex"
                onClick={toggleDesktop}
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Close menu"
                className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white md:hidden"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-white/65">
            Ops console for Sydney properties · free dinner, cozy pods
          </p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-white text-azzurro-navy shadow-sm"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${active ? "text-azzurro-accent" : "text-white/55 group-hover:text-white/90"}`}
                />
                {label}
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-azzurro-accent" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-white/10 p-4">
          <a
            href="https://www.azzurrohotels.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-white/60 transition hover:text-white"
          >
            azzurrohotels.com
            <ExternalLink className="h-3 w-3" />
          </a>
          <p className="text-[11px] text-white/45">
            Daily auto sync · 00:00 Sydney
          </p>
        </div>
      </aside>

      <main
        className={`min-w-0 flex-1 pt-14 transition-[padding] md:pt-0 ${
          desktopCollapsed ? "md:pt-14" : ""
        }`}
      >
        {children}
      </main>
    </div>
  );
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/15">
        <Image
          src="/azzurro-mark.png"
          alt="Azzurro"
          fill
          className="object-cover"
          sizes="40px"
          priority
        />
      </div>
      <div className="min-w-0">
        <p
          className={`font-display font-semibold tracking-tight ${compact ? "text-azzurro-navy text-base" : "text-white text-lg"}`}
        >
          Azzurro
        </p>
        {!compact && (
          <p className="text-[11px] font-medium tracking-wide text-azzurro-accent">
            Review Insights
          </p>
        )}
        {compact && (
          <p className="truncate text-[10px] font-medium text-azzurro-muted">
            Review Insights
          </p>
        )}
      </div>
    </div>
  );
}
