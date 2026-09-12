import { ReactNode } from "react";

/** shadcn-style accordion built on native <details> — accessible, no JS needed. */
export function Accordion({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`divide-y divide-zinc-200 border-y border-zinc-200 ${className}`}>{children}</div>;
}

export function AccordionItem({
  title,
  meta,
  children,
  defaultOpen = false,
}: {
  title: string;
  meta?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-[14.5px] font-semibold text-zinc-950">{title}</span>
          {meta && <span className="mt-0.5 block text-[12.5px] text-zinc-500">{meta}</span>}
        </span>
        <span aria-hidden="true" className="shrink-0 text-[18px] font-normal leading-none text-zinc-400 group-open:hidden">
          +
        </span>
        <span aria-hidden="true" className="hidden shrink-0 text-[18px] font-normal leading-none text-zinc-400 group-open:inline">
          −
        </span>
      </summary>
      <div className="pt-3 text-[13.5px] leading-relaxed text-zinc-700">{children}</div>
    </details>
  );
}
