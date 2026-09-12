import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function EmptyCart() {
  return (
    <div className="mx-auto max-w-md rounded-sm border border-zinc-200 bg-white px-6 py-14 text-center">
      <div aria-hidden="true" className="mx-auto flex h-16 w-16 items-center justify-center rounded-sm bg-zinc-100">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
          <path d="M6 7h15l-1.5 9h-12z" />
          <path d="M6 7 5 4H2" />
          <circle cx="9" cy="20" r="1.4" />
          <circle cx="17" cy="20" r="1.4" />
        </svg>
      </div>
      <h1 className="mt-4 text-[22px] font-bold tracking-tight text-zinc-950">Your basket is empty</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-zinc-600">
        Browse our best sellers or grab a clearance deal — new stock lands every week.
      </p>
      <div className="mt-6 flex flex-col gap-2.5">
        <Link href="/products">
          <Button className="w-full" size="lg">Shop laptops &amp; PCs</Button>
        </Link>
        <Link href="/#best-sellers">
          <Button variant="outline" className="w-full" size="lg">View best sellers</Button>
        </Link>
      </div>
      <p className="mt-5 text-[12.5px] text-zinc-500">
        Need help choosing? Call our UK tech team on <span className="font-semibold text-zinc-800">0800 048 1234</span>.
      </p>
    </div>
  );
}
