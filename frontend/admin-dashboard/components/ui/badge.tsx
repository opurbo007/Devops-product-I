import { HTMLAttributes } from "react";

type Variant = "default" | "success" | "warning" | "danger" | "muted" | "outline";

const variants: Record<Variant, string> = {
  default: "bg-zinc-950 text-white",
  success: "bg-green-100 text-green-900",
  warning: "bg-amber-100 text-amber-900",
  danger: "bg-[#b3261e] text-white",
  muted: "bg-zinc-100 text-zinc-700",
  outline: "border border-zinc-300 text-zinc-700",
};

export function Badge({
  variant = "muted",
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap px-1.5 py-0.5 text-[11.5px] font-semibold ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
