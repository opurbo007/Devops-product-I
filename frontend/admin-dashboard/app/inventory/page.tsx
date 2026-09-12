"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { Table, TableHead, TableHeaderRow, TableHeadCell, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dropdown } from "@/components/ui/dropdown";
import { SKUS, GRADES, STOCK_FILTERS, type Grade, type StockFilter, type Sku } from "@/data/inventory";
import { coverOf, statusOf, totalOf, updatedLabel } from "@/lib/inventory";

const PAGE_SIZE = 10;

type SortKey = "product" | "available" | "total" | "updated";
type SortDir = "asc" | "desc";

function statusBadge(s: Sku) {
  const st = statusOf(s);
  if (st === "Out of stock") return <Badge variant="danger">Out of stock</Badge>;
  if (st === "Low") return <Badge variant="warning">Low · {coverOf(s)}</Badge>;
  return <Badge variant="success">In stock</Badge>;
}

function SortHeader({
  label,
  k,
  sort,
  onSort,
}: {
  label: string;
  k: SortKey;
  sort: { key: SortKey; dir: SortDir };
  onSort: (k: SortKey) => void;
}) {
  const active = sort.key === k;
  return (
    <TableHeadCell aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        onClick={() => onSort(k)}
        className={`flex items-center gap-1 font-semibold uppercase tracking-[0.08em] hover:text-zinc-950 ${active ? "text-zinc-950" : ""}`}
      >
        {label}
        <span aria-hidden="true" className="text-[10px]">{active ? (sort.dir === "asc" ? "▲" : "▼") : "△"}</span>
      </button>
    </TableHeadCell>
  );
}

export default function InventoryPage() {
  const [query, setQuery] = useState("");
  const [stock, setStock] = useState<StockFilter>("");
  const [grade, setGrade] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "product", dir: "asc" });
  const [page, setPage] = useState(1);

  const resetPage = () => setPage(1);
  const onSort = (k: SortKey) =>
    setSort((s) => (s.key === k ? { key: k, dir: s.dir === "asc" ? "desc" : "asc" } : { key: k, dir: "asc" }));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = SKUS.filter((s) => {
      if (q && ![s.sku, s.product, s.brand].some((f) => f.toLowerCase().includes(q))) return false;
      if (stock === "out" && statusOf(s) !== "Out of stock") return false;
      if (stock === "low" && statusOf(s) !== "Low") return false;
      if (stock === "ok" && statusOf(s) !== "In stock") return false;
      if (grade && s.grade !== (grade as Grade)) return false;
      return true;
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sort.key === "product") return a.product.localeCompare(b.product) * dir;
      if (sort.key === "available") return (a.available - b.available) * dir;
      if (sort.key === "total") return (totalOf(a) - totalOf(b)) * dir;
      return (a.updatedMin - b.updatedMin) * dir;
    });
  }, [query, stock, grade, sort]);

  const outCount = SKUS.filter((s) => statusOf(s) === "Out of stock").length;
  const lowCount = SKUS.filter((s) => statusOf(s) === "Low").length;
  const activeCount = (stock ? 1 : 0) + (grade ? 1 : 0) + (query.trim() ? 1 : 0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const clearAll = () => {
    setQuery("");
    setStock("");
    setGrade("");
    resetPage();
  };

  return (
    <AdminShell
      crumbs={[{ label: "Catalogue" }, { label: "Inventory" }]}
      title="Inventory"
      actions={
        <span className="text-[13px] tabular-nums text-zinc-500" aria-live="polite">
          {outCount} out of stock · {lowCount} low · {filtered.length} of {SKUS.length} SKUs
        </span>
      }
    >
      <div className="mb-4 flex flex-col gap-2.5 rounded-sm border border-zinc-200 bg-white p-3 sm:p-4 lg:flex-row lg:items-center">
        <label className="relative block lg:w-80">
          <span className="sr-only">Search inventory</span>
          <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-zinc-400">⌕</span>
          <Input
            value={query}
            onChange={(e) => { setQuery(e.target.value); resetPage(); }}
            placeholder="Search SKU, product, brand…"
            className="pl-9"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Dropdown
            label="Stock"
            ariaLabel="Filter by stock status"
            allLabel="All levels"
            value={stock}
            onChange={(v) => { setStock(v as StockFilter); resetPage(); }}
            options={STOCK_FILTERS.map((f) => ({ value: f.value, label: f.label }))}
          />
          <Dropdown
            label="Grade"
            ariaLabel="Filter by product grade"
            allLabel="All grades"
            value={grade}
            onChange={(v) => { setGrade(v); resetPage(); }}
            options={GRADES.map((g) => ({ value: g, label: g }))}
          />
          {activeCount > 0 && (
            <button
              onClick={clearAll}
              className="flex h-10 items-center rounded-sm px-3 text-[13px] font-semibold text-zinc-600 underline underline-offset-2 hover:text-zinc-950"
            >
              Clear all ({activeCount})
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-sm border border-zinc-200 bg-white">
        <Table className="min-w-[980px]">
          <TableHead>
            <TableHeaderRow>
              <TableHeadCell>SKU</TableHeadCell>
              <SortHeader label="Product" k="product" sort={sort} onSort={onSort} />
              <TableHeadCell>Grade</TableHeadCell>
              <SortHeader label="Available" k="available" sort={sort} onSort={onSort} />
              <TableHeadCell>Reserved</TableHeadCell>
              <SortHeader label="Total" k="total" sort={sort} onSort={onSort} />
              <TableHeadCell>Status</TableHeadCell>
              <SortHeader label="Updated" k="updated" sort={sort} onSort={onSort} />
              <TableHeadCell><span className="sr-only">Actions</span></TableHeadCell>
            </TableHeaderRow>
          </TableHead>
          <TableBody>
            {visible.length > 0 ? (
              visible.map((s) => (
                <TableRow key={s.sku}>
                  <TableCell className="whitespace-nowrap font-mono text-[12px] font-semibold text-zinc-950">{s.sku}</TableCell>
                  <TableCell>
                    <span className="block font-medium text-zinc-900">{s.product}</span>
                    <span className="block text-[12px] text-zinc-500">{s.brand} · {s.location}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.grade === "New" ? "muted" : "outline"}>{s.grade}</Badge>
                  </TableCell>
                  <TableCell className={`font-bold tabular-nums ${s.available === 0 ? "text-[#b3261e]" : s.available <= s.reorderPoint ? "text-amber-800" : ""}`}>
                    {s.available}
                  </TableCell>
                  <TableCell className="tabular-nums text-zinc-600">{s.reserved}</TableCell>
                  <TableCell className="font-semibold tabular-nums">{totalOf(s)}</TableCell>
                  <TableCell>{statusBadge(s)}</TableCell>
                  <TableCell className="whitespace-nowrap text-zinc-600">{updatedLabel(s.updatedMin)}</TableCell>
                  <TableCell>
                    <Link
                      href={`/inventory/${s.sku}`}
                      className="rounded-sm border border-zinc-300 px-2.5 py-1 text-[12.5px] font-semibold text-zinc-800 hover:border-zinc-950 hover:text-zinc-950"
                    >
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="px-5 py-14 text-center">
                  <p className="text-[15px] font-bold text-zinc-950">No SKUs match these filters</p>
                  <p className="mx-auto mt-1 max-w-sm text-[13px] text-zinc-600">
                    Try a different search term or clear the filters to see all {SKUS.length} SKUs.
                  </p>
                  <button
                    onClick={clearAll}
                    className="mt-4 h-10 rounded-sm bg-zinc-950 px-5 text-[13.5px] font-semibold text-white hover:bg-zinc-800"
                  >
                    Clear all filters
                  </button>
                </td>
              </tr>
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 sm:px-5">
            <p className="text-[12.5px] tabular-nums text-zinc-500">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <nav className="flex items-center gap-1.5" aria-label="Pagination">
              <button
                disabled={safePage === 1}
                onClick={() => setPage(safePage - 1)}
                aria-label="Previous page"
                className="flex h-9 min-w-9 items-center justify-center rounded-sm border border-zinc-300 px-2 text-[13px] font-semibold disabled:opacity-40 enabled:hover:border-zinc-950"
              >
                ←
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  aria-label={`Page ${p}`}
                  aria-current={p === safePage ? "page" : undefined}
                  className={`h-9 min-w-9 rounded-sm border px-2 text-[13px] font-semibold ${
                    p === safePage ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-300 hover:border-zinc-950"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                disabled={safePage === totalPages}
                onClick={() => setPage(safePage + 1)}
                aria-label="Next page"
                className="flex h-9 min-w-9 items-center justify-center rounded-sm border border-zinc-300 px-2 text-[13px] font-semibold disabled:opacity-40 enabled:hover:border-zinc-950"
              >
                →
              </button>
            </nav>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
