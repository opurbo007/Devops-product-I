import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`h-10 w-full rounded-sm border border-zinc-300 bg-white px-3.5 text-[13.5px] placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none disabled:bg-zinc-50 disabled:text-zinc-400 ${className}`}
      {...props}
    />
  )
);
Input.displayName = "Input";
