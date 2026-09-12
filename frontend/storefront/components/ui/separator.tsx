import { HTMLAttributes } from "react";

export function Separator({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`h-px w-full bg-zinc-200 ${className}`} />;
}

export function FieldLabel(props: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className="mb-2 block text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-500" {...props} />
  );
}
