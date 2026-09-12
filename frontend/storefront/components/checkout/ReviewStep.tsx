import type { CheckoutData } from "./types";
import { DELIVERY_OPTIONS } from "@/lib/cart";

export default function ReviewStep({
  data,
  onEdit,
}: {
  data: CheckoutData;
  onEdit: (step: number) => void;
}) {
  const deliveryLabel = DELIVERY_OPTIONS.find((d) => d.id === data.delivery)?.label ?? "Standard";
  const payLabel =
    data.payMethod === "card"
      ? `Card ending ${data.cardNumber.replace(/\D/g, "").slice(-4)}`
      : data.payMethod === "paypal"
        ? "PayPal"
        : "Klarna — pay in 3";

  const blocks = [
    {
      title: "Contact",
      lines: [data.email, data.phone],
      step: 1,
    },
    {
      title: "Delivery address",
      lines: [
        `${data.firstName} ${data.lastName}`,
        data.address1,
        data.address2,
        `${data.town}${data.county ? `, ${data.county}` : ""}`,
        data.postcode.toUpperCase(),
      ].filter((l) => l && l.trim() !== ","),
      step: 1,
    },
    {
      title: `Delivery method — ${deliveryLabel}`,
      lines: [DELIVERY_OPTIONS.find((d) => d.id === data.delivery)?.detail ?? ""],
      step: 1,
    },
    {
      title: "Payment",
      lines: data.payMethod === "card" ? [payLabel, data.cardName] : [payLabel],
      step: 2,
    },
  ];

  return (
    <div>
      <h2 className="mb-3 text-[16px] font-bold tracking-tight text-zinc-950">
        Check your order
      </h2>
      <div className="divide-y divide-zinc-200 rounded-sm border border-zinc-200">
        {blocks.map((b) => (
          <div key={b.title} className="flex items-start justify-between gap-4 px-4 py-3.5 sm:px-5">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-500">{b.title}</p>
              <div className="mt-1 space-y-0.5 text-[13.5px] text-zinc-800">
                {b.lines.map((l, i) => (
                  <p key={i}>{l}</p>
                ))}
              </div>
            </div>
            <button
              onClick={() => onEdit(b.step)}
              className="shrink-0 text-[13px] font-semibold text-zinc-950 underline underline-offset-2 hover:text-zinc-600"
            >
              Change
            </button>
          </div>
        ))}
      </div>
      <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-[13px] leading-relaxed text-zinc-700">
        <input type="checkbox" defaultChecked className="mt-0.5 h-4 w-4 accent-zinc-950" />
        Email me exclusive deals and price drops. Unsubscribe anytime — we never share your details.
      </label>
    </div>
  );
}
