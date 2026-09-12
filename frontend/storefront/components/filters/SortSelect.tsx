import { SORT_OPTIONS, type SortId } from "@/data/catalog";

export default function SortSelect({
  value,
  onChange,
  id = "sort",
}: {
  value: SortId;
  onChange: (next: SortId) => void;
  id?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="hidden text-[13px] font-medium text-zinc-500 sm:inline">
        Sort by
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as SortId)}
        className="h-10 rounded-sm border border-zinc-300 bg-white px-2.5 text-[13.5px] font-medium text-zinc-900 focus:border-zinc-950 focus:outline-none"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
