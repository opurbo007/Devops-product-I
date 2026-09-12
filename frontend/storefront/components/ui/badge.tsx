import { HTMLAttributes } from "react";

type Variant = "default" | "secondary" | "outline" | "sale" | "success";

const variants: Record<Variant, string> = {
  default: "bg-zinc-950 text-white",
  secondary: "bg-zinc-100 text-zinc-800",
  outline: "border border-zinc-300 text-zinc-700",
  sale: "bg-[#b3261e] text-white",
  success: "bg-green-700 text-white",
};

export function Badge({
  variant = "default",
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
