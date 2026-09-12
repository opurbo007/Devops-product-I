"use client";

import { useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import FilterSidebar from "@/components/filters/FilterSidebar";
import MobileFilterSheet from "@/components/filters/MobileFilterSheet";
import SortSelect from "@/components/filters/SortSelect";
import Pagination from "@/components/filters/Pagination";
import { catalog, type SortId } from "@/data/catalog";
import {
  EMPTY_FILTERS,
  applyFilters,
  countActive,
  sortProducts,
  type FiltersState,
} from "@/lib/catalog";

const PAGE_SIZE = 12;

const SUB_CATEGORIES = [
  "Gaming laptops",
  "Business laptops",
  "MacBook",
  "2-in-1s",
  "Student picks",
  "Refurbished",
];

export default function ProductsPage() {
  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortId>("featured");
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const updateFilters = (next: FiltersState) => {
    setFilters(next);
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const filtered = useMemo(() => sortProducts(applyFilters(catalog, filters), sort), [filters, sort]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const active = countActive(filters);

  const changePage = (next: number) => {
    setPage(next);
    topRef.current?.scrollIntoView({ block: "start" });
  };

  const chips: { key: string; label: string; remove: () => void }[] = [
    ...filters.brands.map((b) => ({
      key: `brand-${b}`,
      label: b,
      remove: () => updateFilters({ ...filters, brands: filters.brands.filter((v) => v !== b) }),
    })),
    ...filters.priceBands.map((b) => ({
      key: `price-${b}`,
      label: b.replace("under-300", "Under £300").replace("over-1200", "Over £1,200").replace("-", " – £"),
      remove: () => updateFilters({ ...filters, priceBands: filters.priceBands.filter((v) => v !== b) }),
    })),
    ...filters.conditions.map((c) => ({
      key: `cond-${c}`,
      label: c,
      remove: () => updateFilters({ ...filters, conditions: filters.conditions.filter((v) => v !== c) }),
    })),
    ...filters.grades.map((g) => ({
      key: `grade-${g}`,
      label: g,
      remove: () => updateFilters({ ...filters, grades: filters.grades.filter((v) => v !== g) }),
    })),
    ...filters.ram.map((r) => ({
      key: `ram-${r}`,
      label: `${r}GB RAM`,
      remove: () => updateFilters({ ...filters, ram: filters.ram.filter((v) => v !== r) }),
    })),
    ...filters.storage.map((s) => ({
      key: `storage-${s}`,
      label: s >= 1000 ? `${s / 1000}TB SSD` : `${s}GB SSD`,
      remove: () => updateFilters({ ...filters, storage: filters.storage.filter((v) => v !== s) }),
    })),
    ...filters.colours.map((c) => ({
      key: `colour-${c}`,
      label: c,
      remove: () => updateFilters({ ...filters, colours: filters.colours.filter((v) => v !== c) }),
    })),
    ...filters.availability.map((a) => ({
      key: `avail-${a}`,
      label: a,
      remove: () => updateFilters({ ...filters, availability: filters.availability.filter((v) => v !== a) }),
    })),
    ...(filters.minRating !== null
      ? [{ key: "rating", label: `${filters.minRating}★ & up`, remove: () => updateFilters({ ...filters, minRating: null }) }]
      : []),
  ];

  const from = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const to = Math.min(safePage * PAGE_SIZE, filtered.length);

  return (
    <div className="flex min-h-full flex-col bg-white text-zinc-900">
      <Header />

      <main className="flex-1 bg-zinc-50">
        <div ref={topRef} className="mx-auto max-w-7xl scroll-mt-4 px-4 py-6 sm:px-6">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-3 text-[12.5px] text-zinc-500">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li><a href="/" className="hover:text-zinc-950 hover:underline">Home</a></li>
              <li aria-hidden="true">/</li>
              <li><a href="#" className="hover:text-zinc-950 hover:underline">Computing</a></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="font-semibold text-zinc-900">Laptops &amp; PCs</li>
            </ol>
          </nav>

          {/* Title row */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-[26px] font-bold tracking-tight text-zinc-950 sm:text-[30px]">
                Laptops &amp; PCs
              </h1>
              <p className="mt-1 text-[13.5px] text-zinc-600">
                {filtered.length} {filtered.length === 1 ? "product" : "products"}
                {active > 0 ? ` · ${active} ${active === 1 ? "filter" : "filters"} applied` : ""}
                {" · "}Prices include VAT · Free delivery over £50
              </p>
            </div>
          </div>

          {/* Sub-category pills */}
          <div className="mt-4 flex flex-wrap gap-2" aria-label="Sub-categories">
            {SUB_CATEGORIES.map((s) => (
              <a
                key={s}
                href="#"
                className="rounded-full border border-zinc-300 bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-zinc-800 hover:border-zinc-950 hover:text-zinc-950"
              >
                {s}
              </a>
            ))}
          </div>

          {/* Toolbar */}
          <div className="mt-4 flex items-center gap-3 border-y border-zinc-200 bg-white px-3 py-2.5 sm:px-4">
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="flex h-10 items-center gap-2 rounded-sm border border-zinc-300 px-4 text-[13.5px] font-semibold lg:hidden"
              aria-label={`Open filters${active > 0 ? `, ${active} active` : ""}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 6h16M7 12h10M10 18h4" />
              </svg>
              Filters
              {active > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-950 px-1 text-[11px] font-bold text-white">
                  {active}
                </span>
              )}
            </button>
            <p className="hidden text-[13px] text-zinc-500 sm:block" aria-live="polite">
              Showing {from}–{to} of {filtered.length}
            </p>
            <div className="ml-auto">
              <SortSelect
                value={sort}
                onChange={(s) => {
                  setSort(s);
                  setPage(1);
                }}
              />
            </div>
          </div>

          {/* Active filter chips */}
          {chips.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Active filters">
              {chips.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={c.remove}
                  className="flex items-center gap-1.5 rounded-full bg-zinc-950 py-1 pl-3 pr-2 text-[12.5px] font-medium text-white hover:bg-zinc-800"
                  aria-label={`Remove filter ${c.label}`}
                >
                  {c.label}
                  <span aria-hidden="true" className="text-[14px] leading-none">×</span>
                </button>
              ))}
              <button
                type="button"
                onClick={clearFilters}
                className="text-[12.5px] font-semibold text-zinc-600 underline underline-offset-2 hover:text-zinc-950"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Content */}
          <div className="mt-4 flex items-start gap-6">
            <FilterSidebar filters={filters} onChange={updateFilters} onClear={clearFilters} />

            <div className="min-w-0 flex-1">
              {visible.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-3">
                    {visible.map((p) => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Pagination page={safePage} totalPages={totalPages} onChange={changePage} />
                    <p className="text-[12.5px] text-zinc-500">
                      Page {safePage} of {totalPages}
                    </p>
                  </div>
                </>
              ) : (
                <div className="rounded-sm border border-zinc-200 bg-white px-6 py-16 text-center">
                  <h2 className="text-[18px] font-bold text-zinc-950">No products match those filters</h2>
                  <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-zinc-600">
                    Try removing a filter or two — new stock lands every week, and our
                    buying team can often source specific models.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="h-10 rounded-sm bg-zinc-950 px-5 text-[14px] font-semibold text-white hover:bg-zinc-800"
                    >
                      Clear all filters
                    </button>
                    <a
                      href="#"
                      className="flex h-10 items-center rounded-sm border border-zinc-300 px-5 text-[14px] font-semibold hover:border-zinc-950"
                    >
                      Ask us to source it
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Category footer note */}
          <section className="mt-10 rounded-sm border border-zinc-200 bg-white p-5 sm:p-6" aria-label="About our laptops">
            <h2 className="text-[16px] font-bold tracking-tight text-zinc-950">
              New, refurbished &amp; ex-display laptops
            </h2>
            <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-zinc-600">
              Every refurbished laptop is data-wiped, tested across 40+ checkpoints and graded
              honestly — Grade A is as-new, Grade B may show light marks. All refurbished and
              ex-display models include a 12-month guarantee and 30-day returns, just like new.
              Business customers can open a trade account for volume pricing and leasing.
            </p>
          </section>
        </div>
      </main>

      <Footer />

      <MobileFilterSheet
        open={sheetOpen}
        filters={filters}
        resultCount={filtered.length}
        onChange={updateFilters}
        onClose={() => setSheetOpen(false)}
        onClear={clearFilters}
      />
    </div>
  );
}
