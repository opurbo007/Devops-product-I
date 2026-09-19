import Link from "next/link";
import { Button } from "@/components/ui/button";
import { gbp } from "@/lib/format";

export type PlacedOrder = {
  number: string;
  email: string;
  total: number;
  itemCount: number;
  deliveryLabel: string;
  orderId?: string;
};

export default function OrderSuccess({ order }: { order: PlacedOrder }) {
  return (
    <div className="mx-auto max-w-lg rounded-sm border border-zinc-200 bg-white px-6 py-10 text-center sm:px-10">
      <div aria-hidden="true" className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-700 text-[24px] font-bold text-white">
        ✓
      </div>
      <h1 className="mt-4 text-[24px] font-bold tracking-tight text-zinc-950">Thank you — order placed</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-zinc-600">
        Order <strong className="text-zinc-950">{order.number}</strong> · {order.itemCount}{" "}
        {order.itemCount === 1 ? "item" : "items"} · {gbp(order.total)}
      </p>
      <div className="mt-5 rounded-sm bg-zinc-50 p-4 text-left text-[13px] leading-relaxed text-zinc-700">
        <p><strong className="text-zinc-950">What happens next</strong></p>
        <ul className="mt-1.5 list-disc space-y-1 pl-5">
          <li>Confirmation email on its way to {order.email}</li>
          <li>{order.deliveryLabel} — tracking added as soon as it ships</li>
          <li>30-day returns and your guarantee start on delivery day</li>
        </ul>
      </div>
      <div className="mt-6 flex flex-col gap-2.5">
        {order.orderId && (
          <Link href={`/orders/${order.orderId}`}>
            <Button className="w-full" size="lg">Track your order</Button>
          </Link>
        )}
        <Link href="/products">
          <Button className="w-full" size="lg" variant={order.orderId ? "outline" : "default"}>Continue shopping</Button>
        </Link>
        <Link href="/">
          <Button variant="outline" className="w-full" size="lg">Back to home</Button>
        </Link>
      </div>
    </div>
  );
}
