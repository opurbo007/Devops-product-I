import type { FiltersState } from "@/lib/catalog";
import FilterControls from "./FilterControls";

export default function FilterSidebar({
  filters,
  onChange,
  onClear,
}: {
  filters: FiltersState;
  onChange: (next: FiltersState) => void;
  onClear: () => void;
}) {
  return (
    <aside className="hidden w-60 shrink-0 lg:block" aria-label="Product filters">
      <div className="sticky top-4 rounded-sm border border-zinc-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between border-b border-zinc-200 pb-3">
          <h2 className="text-[14px] font-bold text-zinc-950">Filters</h2>
          <button
            type="button"
            onClick={onClear}
            className="text-[12.5px] font-semibold text-zinc-500 underline underline-offset-2 hover:text-zinc-950"
          >
            Clear all
          </button>
        </div>
        <FilterControls filters={filters} onChange={onChange} />
      </div>
    </aside>
  );
}
