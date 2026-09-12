import { InputHTMLAttributes } from "react";

const inputCls = (bad: boolean) =>
  `h-11 w-full rounded-sm border bg-white px-3.5 text-[14px] placeholder:text-zinc-400 focus:outline-none ${
    bad ? "border-[#b3261e]" : "border-zinc-300 focus:border-zinc-950"
  }`;

export function TextField({
  label,
  error,
  optional,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  optional?: boolean;
}) {
  const id = props.id ?? props.name;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-zinc-900">
        {label} {optional && <span className="font-normal text-zinc-500">(optional)</span>}
      </label>
      <input id={id} {...props} aria-invalid={!!error} className={inputCls(!!error)} />
      {error && (
        <p role="alert" className="mt-1 text-[12.5px] font-medium text-[#b3261e]">
          {error}
        </p>
      )}
    </div>
  );
}

export function Stepper({ step }: { step: number }) {
  const steps = ["Delivery", "Payment", "Review"];
  return (
    <ol className="flex items-center" aria-label="Checkout steps">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const current = n === step;
        return (
          <li key={label} className={`flex items-center ${i < steps.length - 1 ? "flex-1" : ""}`}>
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold ${
                  done
                    ? "bg-green-700 text-white"
                    : current
                      ? "bg-zinc-950 text-white"
                      : "bg-zinc-200 text-zinc-500"
                }`}
              >
                {done ? "✓" : n}
              </span>
              <span
                aria-current={current ? "step" : undefined}
                className={`text-[13px] ${current ? "font-bold text-zinc-950" : done ? "font-semibold text-zinc-800" : "text-zinc-500"}`}
              >
                {label}
              </span>
            </span>
            {i < steps.length - 1 && (
              <span aria-hidden="true" className={`mx-3 h-px flex-1 ${done ? "bg-green-700" : "bg-zinc-200"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
