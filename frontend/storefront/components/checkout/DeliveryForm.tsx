import { TextField } from "./fields";
import type { CheckoutData } from "./types";
import type { FieldErrors } from "@/lib/validation";
import { DELIVERY_OPTIONS } from "@/lib/cart";

export default function DeliveryForm({
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
      <section aria-label="Contact details">
        <h2 className="mb-3 text-[16px] font-bold tracking-tight text-zinc-950">Contact details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Email address"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.co.uk"
            value={data.email}
            error={errors.email}
            onChange={(e) => onChange({ email: e.target.value })}
          />
          <TextField
            label="Mobile number"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="07700 900123"
            value={data.phone}
            error={errors.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
          />
        </div>
        <p className="mt-2 text-[12.5px] text-zinc-500">
          We&apos;ll send order updates and delivery tracking here. No marketing without your permission.
        </p>
      </section>

      <section aria-label="Delivery address">
        <h2 className="mb-3 text-[16px] font-bold tracking-tight text-zinc-950">Delivery address</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="First name"
            name="firstName"
            autoComplete="given-name"
            value={data.firstName}
            error={errors.firstName}
            onChange={(e) => onChange({ firstName: e.target.value })}
          />
          <TextField
            label="Last name"
            name="lastName"
            autoComplete="family-name"
            value={data.lastName}
            error={errors.lastName}
            onChange={(e) => onChange({ lastName: e.target.value })}
          />
          <div className="sm:col-span-2">
            <TextField
              label="Address line 1"
              name="address1"
              autoComplete="address-line1"
              placeholder="Flat, house number and street"
              value={data.address1}
              error={errors.address1}
              onChange={(e) => onChange({ address1: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <TextField
              label="Address line 2"
              name="address2"
              optional
              autoComplete="address-line2"
              value={data.address2}
              onChange={(e) => onChange({ address2: e.target.value })}
            />
          </div>
          <TextField
            label="Town / City"
            name="town"
            autoComplete="address-level2"
            value={data.town}
            error={errors.town}
            onChange={(e) => onChange({ town: e.target.value })}
          />
          <TextField
            label="County"
            name="county"
            optional
            autoComplete="address-level1"
            value={data.county}
            onChange={(e) => onChange({ county: e.target.value })}
          />
          <TextField
            label="Postcode"
            name="postcode"
            autoComplete="postal-code"
            placeholder="E2 8DP"
            value={data.postcode}
            error={errors.postcode}
            onChange={(e) => onChange({ postcode: e.target.value.toUpperCase() })}
          />
        </div>
      </section>

      <section aria-label="Delivery method">
        <h2 className="mb-3 text-[16px] font-bold tracking-tight text-zinc-950">Delivery method</h2>
        <div className="grid gap-2" role="radiogroup" aria-label="Delivery method">
          {DELIVERY_OPTIONS.map((o) => (
            <label
              key={o.id}
              className={`flex cursor-pointer items-center gap-3 rounded-sm border px-4 py-3 ${
                data.delivery === o.id ? "border-zinc-950 bg-zinc-50" : "border-zinc-200 hover:border-zinc-400"
              }`}
            >
              <input
                type="radio"
                name="checkout-delivery"
                checked={data.delivery === o.id}
                onChange={() => onChange({ delivery: o.id })}
                className="h-4 w-4 accent-zinc-950"
              />
              <span className="flex-1 text-[14px]">
                <span className="block font-semibold text-zinc-950">{o.label}</span>
                <span className="block text-[12.5px] text-zinc-500">{o.detail}</span>
              </span>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
