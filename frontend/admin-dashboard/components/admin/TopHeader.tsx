"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

const NOTIFICATIONS = [
  { title: "18 orders awaiting fulfilment", detail: "Oldest is 6h 12m — SLA 24h", tone: "red" as const },
  { title: "inventory-service lag 42s", detail: "Consumer group stock-sync, eu-west-2", tone: "amber" as const },
  { title: "Refund #R-9041 approved", detail: "£129.00 · Sony WH-1000XM5", tone: "zinc" as const },
];

function useDismiss(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [onClose]);
  return ref;
}

function Notifications() {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(() => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Notifications, 3 unread"
        className="relative flex h-9 w-9 items-center justify-center rounded-sm border border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:text-zinc-950"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
          <path d="M13.7 20a2 2 0 0 1-3.4 0" />
        </svg>
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#b3261e]" aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-sm border border-zinc-200 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
          <p className="border-b border-zinc-200 px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-500">
            Notifications
          </p>
          <ul className="divide-y divide-zinc-100">
            {NOTIFICATIONS.map((n) => (
              <li key={n.title}>
                <button onClick={() => setOpen(false)} className="flex w-full items-start gap-2.5 px-4 py-3 text-left hover:bg-zinc-50">
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.tone === "red" ? "bg-[#b3261e]" : n.tone === "amber" ? "bg-amber-500" : "bg-zinc-300"}`}
                  />
                  <span>
                    <span className="block text-[13.5px] font-semibold text-zinc-950">{n.title}</span>
                    <span className="block text-[12.5px] text-zinc-500">{n.detail}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button onClick={() => setOpen(false)} className="block w-full border-t border-zinc-200 px-4 py-2.5 text-center text-[13px] font-semibold text-zinc-800 hover:bg-zinc-50">
            View all activity
          </button>
        </div>
      )}
    </div>
  );
}

function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(() => setOpen(false));
  const router = useRouter();
  const { user, logout } = useAuth();
  const name = user?.email.split("@")[0] ?? "Operator";
  const initials = name.slice(0, 2).toUpperCase();

  const signOut = () => {
    setOpen(false);
    logout();
    router.replace("/login");
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Account menu for ${user?.email ?? "operator"}`}
        className="flex items-center gap-2.5 rounded-sm px-1.5 py-1 hover:bg-zinc-100"
      >
        <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-950 text-[12px] font-bold text-white">
          {initials}
        </span>
        <span className="hidden text-left leading-tight xl:block">
          <span className="block max-w-40 truncate text-[13px] font-semibold text-zinc-950">{user?.email ?? "Not signed in"}</span>
          <span className="block text-[11.5px] text-zinc-500">Operations · {user?.role ?? "—"}</span>
        </span>
        <span aria-hidden="true" className="hidden text-[11px] text-zinc-400 sm:inline">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-sm border border-zinc-200 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
          <div className="border-b border-zinc-200 px-4 py-3">
            <p className="truncate text-[13.5px] font-semibold text-zinc-950">{user?.email ?? "Not signed in"}</p>
            <p className="mt-1 inline-block bg-zinc-100 px-1.5 py-px text-[11px] font-bold uppercase tracking-wide text-zinc-600">
              {user?.role ?? "—"} · Full access
            </p>
          </div>
          <div className="border-t border-zinc-200 py-1">
            <button onClick={signOut} className="block w-full px-4 py-2 text-left text-[13.5px] font-semibold text-[#b3261e] hover:bg-zinc-50">
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function TopHeader({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-4 sm:px-6">
      <button
        onClick={onMenu}
        aria-label="Open navigation"
        className="flex h-9 w-9 items-center justify-center rounded-sm border border-zinc-200 lg:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      <span className="hidden items-center gap-1.5 rounded-sm bg-green-700 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white sm:inline-flex" title="All systems operational">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-white" />
        Production
      </span>

      <div className="hidden min-w-0 flex-1 justify-center md:flex">
        <label className="relative block w-full max-w-md">
          <span className="sr-only">Search orders, products, customers</span>
          <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-zinc-400">⌕</span>
          <input
            type="search"
            placeholder="Search orders, products, customers…"
            className="h-9 w-full rounded-sm border border-zinc-200 bg-zinc-50 pl-9 pr-12 text-[13px] placeholder:text-zinc-400 focus:border-zinc-950 focus:bg-white focus:outline-none"
          />
          <kbd aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm border border-zinc-200 bg-white px-1.5 py-px font-mono text-[10.5px] text-zinc-500">
            ⌘K
          </kbd>
        </label>
      </div>

      <div className="ml-auto flex items-center gap-2 md:ml-0">
        <a
          href={process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3006"}
          className="hidden h-9 items-center rounded-sm border border-zinc-200 px-3 text-[13px] font-semibold text-zinc-700 hover:border-zinc-400 hover:text-zinc-950 sm:inline-flex"
        >
          View storefront
        </a>
        <Notifications />
        <span aria-hidden="true" className="h-6 w-px bg-zinc-200" />
        <ProfileMenu />
      </div>
    </header>
  );
}
