"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "./nav";

function badgeCls(tone: "red" | "amber" | "zinc" = "zinc") {
  if (tone === "red") return "bg-[#b3261e] text-white";
  if (tone === "amber") return "bg-amber-100 text-amber-900";
  return "bg-zinc-100 text-zinc-600";
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-4">
      <div className="space-y-5">
        {NAV.map((section) => (
          <div key={section.title}>
            <p className="mb-1 px-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-zinc-400">
              {section.title}
            </p>
            <ul className="space-y-px">
              {section.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={onNavigate}
                      className={`flex items-center justify-between rounded-sm px-2 py-[7px] text-[13.5px] ${
                        active
                          ? "bg-zinc-950 font-semibold text-white"
                          : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
                      }`}
                    >
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className={`px-1.5 py-px text-[11px] font-bold tabular-nums ${badgeCls(item.badgeTone)}`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2 px-5" aria-label="Volt Ops home">
      <span className="bg-zinc-950 px-1.5 py-0.5 text-[14px] font-extrabold tracking-tight text-white">
        VOLT
      </span>
      <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        Ops
      </span>
    </Link>
  );
}

export function SidebarBrand() {
  return (
    <div className="flex h-14 shrink-0 items-center border-b border-zinc-200">
      <Wordmark />
    </div>
  );
}
