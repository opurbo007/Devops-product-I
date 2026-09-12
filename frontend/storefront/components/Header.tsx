"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";

const categories = [
  "TVs & Projectors",
  "Laptops & PCs",
  "Audio",
  "Mobile",
  "Appliances",
  "Smart Home",
  "Gaming",
  "Cameras",
];

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function BasketIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 7h15l-1.5 9h-12z" />
      <path d="M6 7 5 4H2" />
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="17" cy="20" r="1.4" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const { itemCount: count } = useCart();

  return (
    <header className="bg-white text-zinc-900">
      {/* Utility bar */}
      <div className="bg-zinc-950 text-zinc-200">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-4 text-[12.5px] sm:px-6">
          <p className="truncate">
            Free delivery on orders over £50 <span className="mx-2 text-zinc-600">|</span>
            <span className="hidden sm:inline">0% finance available over £300</span>
          </p>
          <nav className="hidden items-center gap-5 md:flex" aria-label="Utility">
            <a href="#" className="hover:text-white">Stores</a>
            <a href="#" className="hover:text-white">Help &amp; Contact</a>
            <a href="#" className="hover:text-white">Track my order</a>
            <a href="#" className="hover:text-white">Trade</a>
          </nav>
          <a href="#" className="md:hidden hover:text-white">Stores</a>
        </div>
      </div>

      {/* Main bar */}
      <div className="border-b border-zinc-200">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-6 sm:px-6 sm:py-4">
          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Toggle menu"
            className="flex h-10 w-10 items-center justify-center rounded-sm border border-zinc-200 lg:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>

          {/* Logo */}
          <a href="/" className="flex items-baseline gap-1.5" aria-label="Volt Electricals home">
            <span className="bg-zinc-950 px-2 py-1 text-[17px] font-extrabold tracking-tight text-white">
              VOLT
            </span>
            <span className="hidden text-[13px] font-semibold uppercase tracking-[0.14em] text-zinc-500 xs:inline sm:inline">
              Electricals
            </span>
          </a>

          {/* Search (desktop) */}
          <form role="search" className="hidden flex-1 md:flex" action="#">
            <label htmlFor="site-search" className="sr-only">Search products</label>
            <div className="flex w-full">
              <input
                id="site-search"
                type="search"
                placeholder="Search TVs, laptops, headphones, brands…"
                className="h-11 w-full rounded-l-sm border border-r-0 border-zinc-300 bg-white px-4 text-[14px] placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none"
              />
              <button
                type="submit"
                className="flex h-11 items-center gap-2 rounded-r-sm bg-zinc-950 px-5 text-[14px] font-semibold text-white hover:bg-zinc-800"
              >
                <SearchIcon />
                <span className="hidden lg:inline">Search</span>
              </button>
            </div>
          </form>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <a href="#" className="hidden items-center gap-2 rounded-sm px-3 py-2 text-[13.5px] font-medium hover:bg-zinc-100 sm:flex">
              <PinIcon />
              <span className="hidden text-left leading-tight xl:block">
                <span className="block text-[11px] font-normal text-zinc-500">Deliver to</span>
                London E2
              </span>
            </a>
            <a href="#" className="hidden items-center gap-2 rounded-sm px-3 py-2 text-[13.5px] font-medium hover:bg-zinc-100 sm:flex">
              <AccountIcon />
              <span className="hidden text-left leading-tight xl:block">
                <span className="block text-[11px] font-normal text-zinc-500">Hello, Sign in</span>
                Account
              </span>
            </a>
            <a
              href="/cart"
              className="relative flex items-center gap-2 rounded-sm bg-zinc-100 px-3 py-2.5 text-[13.5px] font-semibold hover:bg-zinc-200"
              aria-label={`Basket, ${count} ${count === 1 ? "item" : "items"}`}
            >
              <BasketIcon />
              <span className="hidden sm:inline">Basket</span>
              {count > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#b3261e] px-1 text-[11px] font-bold text-white">
                  {count}
                </span>
              )}
            </a>
          </div>
        </div>

        {/* Search (mobile) */}
        <div className="px-4 pb-3 md:hidden">
          <form role="search" action="#" className="flex w-full">
            <label htmlFor="site-search-m" className="sr-only">Search products</label>
            <input
              id="site-search-m"
              type="search"
              placeholder="Search products, brands…"
              className="h-10 w-full rounded-l-sm border border-r-0 border-zinc-300 px-3 text-[14px] focus:border-zinc-950 focus:outline-none"
            />
            <button type="submit" aria-label="Search" className="flex h-10 w-12 items-center justify-center rounded-r-sm bg-zinc-950 text-white">
              <SearchIcon />
            </button>
          </form>
        </div>
      </div>

      {/* Category nav (desktop) */}
      <nav className="hidden border-b border-zinc-200 lg:block" aria-label="Categories">
        <div className="mx-auto flex max-w-7xl items-center gap-1 px-6">
          {categories.map((c) => (
            <a
              key={c}
              href={c === "Laptops & PCs" ? "/products" : "#"}
              className="border-b-2 border-transparent px-3 py-3 text-[13.5px] font-medium text-zinc-700 hover:border-zinc-950 hover:text-zinc-950"
            >
              {c}
            </a>
          ))}
          <a href="#" className="ml-auto px-3 py-3 text-[13.5px] font-semibold text-[#b3261e] hover:underline">
            Clearance deals
          </a>
        </div>
      </nav>

      {/* Category nav (mobile) */}
      {open && (
        <nav className="border-b border-zinc-200 bg-white lg:hidden" aria-label="Categories mobile">
          <ul className="mx-auto max-w-7xl divide-y divide-zinc-100 px-4 py-2">
            {categories.map((c) => (
              <li key={c}>
                <a href={c === "Laptops & PCs" ? "/products" : "#"} className="flex items-center justify-between py-3 text-[14.5px] font-medium text-zinc-800">
                  {c}
                  <span aria-hidden="true" className="text-zinc-400">›</span>
                </a>
              </li>
            ))}
            <li>
              <a href="#" className="flex items-center justify-between py-3 text-[14.5px] font-semibold text-[#b3261e]">
                Clearance deals
                <span aria-hidden="true">›</span>
              </a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
