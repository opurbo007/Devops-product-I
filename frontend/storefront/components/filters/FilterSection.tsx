import type { ReactNode } from "react";

export default function FilterSection({
  title,
  children,
  defaultOpen = true,
  active = 0,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  active?: number;
}) {
  return (
    <details open={defaultOpen} className="group border-b border-zinc-200 py-4 first:pt-0 last:border-0">
      <summary className="flex cursor-pointer list-none items-center justify-between text-[13.5px] font-bold text-zinc-950 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          {title}
          {active > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-950 px-1 text-[11px] font-bold text-white">
              {active}
            </span>
          )}
        </span>
        <span aria-hidden="true" className="text-[16px] font-normal leading-none text-zinc-400 group-open:hidden">
          +
        </span>
        <span aria-hidden="true" className="hidden text-[16px] font-normal leading-none text-zinc-400 group-open:inline">
          −
        </span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

export function CheckRow({
  label,
  count,
  checked,
  onChange,
  hint,
}: {
  label: string;
  count?: number;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1.5 text-[13.5px] text-zinc-800 hover:text-zinc-950">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 shrink-0 accent-zinc-950"
      />
      <span className="flex-1">
        {label}
        {hint && <span className="block text-[12px] font-normal text-zinc-500">{hint}</span>}
      </span>
      {count !== undefined && <span className="text-[12px] tabular-nums text-zinc-400">({count})</span>}
    </label>
  );
}
