import { TextField } from "./fields";
import type { CheckoutData, PayMethod } from "./types";
import type { FieldErrors } from "@/lib/validation";
import { formatCardNumber, formatExpiry } from "@/lib/validation";

const METHODS: { id: PayMethod; label: string; detail: string }[] = [
  { id: "card", label: "Debit / credit card", detail: "Visa, Mastercard, Amex" },
  { id: "paypal", label: "PayPal", detail: "Redirected to PayPal to approve" },
  { id: "klarna", label: "Klarna", detail: "Pay in 3 interest-free instalments" },
];

export default function PaymentForm({
  data,
  errors,
  onChange,
}: {
  data: CheckoutData;
  errors: FieldErrors;
  onChange: (patch: Partial<CheckoutData>) => void;
}) {
  return (
    <div className="space-y-6">
      <section aria-label="Payment method">
        <h2 className="mb-3 text-[16px] font-bold tracking-tight text-zinc-950">Payment method</h2>
        <div className="grid gap-2" role="radiogroup" aria-label="Payment method">
          {METHODS.map((m) => (
            <label
              key={m.id}
              className={`flex cursor-pointer items-center gap-3 rounded-sm border px-4 py-3 ${
                data.payMethod === m.id ? "border-zinc-950 bg-zinc-50" : "border-zinc-200 hover:border-zinc-400"
              }`}
            >
              <input
                type="radio"
                name="pay-method"
                checked={data.payMethod === m.id}
                onChange={() => onChange({ payMethod: m.id })}
                className="h-4 w-4 accent-zinc-950"
              />
              <span className="text-[14px]">
                <span className="block font-semibold text-zinc-950">{m.label}</span>
                <span className="block text-[12.5px] text-zinc-500">{m.detail}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      {data.payMethod === "card" && (
        <section aria-label="Card details" className="rounded-sm border border-zinc-200 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <TextField
                label="Name on card"
                name="cardName"
                autoComplete="cc-name"
                value={data.cardName}
                error={errors.cardName}
                onChange={(e) => onChange({ cardName: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <TextField
                label="Card number"
                name="cardNumber"
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="4242 4242 4242 4242"
                value={data.cardNumber}
                error={errors.cardNumber}
                onChange={(e) => onChange({ cardNumber: formatCardNumber(e.target.value) })}
              />
            </div>
            <TextField
              label="Expiry"
              name="expiry"
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM/YY"
              value={data.expiry}
              error={errors.expiry}
              onChange={(e) => onChange({ expiry: formatExpiry(e.target.value) })}
            />
            <TextField
              label="Security code (CVC)"
              name="cvc"
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="123"
              value={data.cvc}
              error={errors.cvc}
              onChange={(e) => onChange({ cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })}
            />
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-zinc-500">
            <span aria-hidden="true">🔒</span> Demo checkout — no real payment is taken. Test card 4242 4242 4242 4242 succeeds; a card ending 0002 is declined.
          </p>
        </section>
      )}

      {data.payMethod !== "card" && (
        <div className="rounded-sm border border-zinc-200 bg-zinc-50 p-4 text-[13.5px] leading-relaxed text-zinc-700">
          {data.payMethod === "paypal"
            ? "You'll be redirected to PayPal to approve this payment after you place your order."
            : "You'll be redirected to Klarna to split this order into 3 interest-free payments after you place your order."}{" "}
          No charge is made until you confirm.
        </div>
      )}
    </div>
  );
}
