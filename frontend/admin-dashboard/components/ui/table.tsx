import { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

export function Table({ className = "", ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full text-left text-[13px] ${className}`} {...props} />
    </div>
  );
}

export function TableHead({ className = "", ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} />;
}

export function TableHeaderRow(props: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className="border-b border-zinc-200" {...props} />;
}

export function TableHeadCell({ className = "", ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`whitespace-nowrap px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-zinc-500 first:pl-5 last:pr-5 ${className}`}
      {...props}
    />
  );
}

export function TableBody({ className = "", ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={`divide-y divide-zinc-100 ${className}`} {...props} />;
}

export function TableRow({
  className = "",
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={`hover:bg-zinc-50 ${className}`} {...props} />;
}

export function TableCell({ className = "", ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={`px-4 py-2.5 first:pl-5 last:pr-5 ${className}`} {...props} />;
}
