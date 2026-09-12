"use client";

import { useEffect, useState } from "react";
import { SidebarBrand, SidebarNav } from "./Sidebar";
import { TopHeader } from "./TopHeader";
import { Breadcrumbs } from "./Breadcrumbs";
import type { Crumb } from "./nav";

export function AdminShell({
  crumbs,
  title,
  actions,
  children,
}: {
  crumbs: Crumb[];
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!navOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [navOpen]);

  return (
    <div className="flex min-h-screen bg-[#f6f6f7] text-zinc-900">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col border-r border-zinc-200 bg-white lg:flex">
        <SidebarBrand />
        <SidebarNav />
        <div className="border-t border-zinc-200 px-5 py-3 text-[11.5px] leading-relaxed text-zinc-500">
          <p className="flex items-center gap-1.5 font-semibold text-green-800">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-green-700" />
            All services operational
          </p>
          <p className="mt-0.5">Event lag p99 · 1.2s · eu-west-2</p>
        </div>
      </aside>

      {/* Mobile navigation drawer */}
      {navOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation">
          <div className="absolute inset-0 bg-zinc-950/50" onClick={() => setNavOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 flex w-[84vw] max-w-xs flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 pr-3">
              <SidebarBrand />
              <button
                onClick={() => setNavOpen(false)}
                aria-label="Close navigation"
                className="flex h-9 w-9 items-center justify-center rounded-sm border border-zinc-200 text-[18px] leading-none text-zinc-700"
              >
                ×
              </button>
            </div>
            <SidebarNav onNavigate={() => setNavOpen(false)} />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30">
          <TopHeader onMenu={() => setNavOpen(true)} />
        </div>
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto w-full max-w-[1200px]">
            <Breadcrumbs items={crumbs} />
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-[22px] font-bold tracking-tight text-zinc-950 sm:text-[24px]">{title}</h1>
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
            {children}
          </div>
        </main>
        <footer className="border-t border-zinc-200 bg-white px-6 py-3 text-[12px] text-zinc-500">
          Volt Ops · Environment: production (eu-west-2) · Build 2026.09.1 · All times Europe/London
        </footer>
      </div>
    </div>
  );
}
