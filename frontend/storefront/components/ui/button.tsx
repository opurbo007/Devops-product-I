import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "default" | "secondary" | "outline" | "ghost" | "sale";
type Size = "sm" | "default" | "lg" | "icon";

const variants: Record<Variant, string> = {
  default: "bg-zinc-950 text-white hover:bg-zinc-800",
  secondary: "bg-zinc-100 text-zinc-950 hover:bg-zinc-200",
  outline: "border border-zinc-300 bg-white text-zinc-950 hover:border-zinc-950",
  ghost: "text-zinc-800 hover:bg-zinc-100",
  sale: "bg-[#b3261e] text-white hover:bg-[#8f1d17]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px]",
  default: "h-11 px-5 text-[14px]",
  lg: "h-12 px-7 text-[15px]",
  icon: "h-10 w-10",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

/** shadcn-style button — flat, small radius, no shadows. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "default", className = "", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  )
);
Button.displayName = "Button";
