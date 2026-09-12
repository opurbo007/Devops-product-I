import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";

export default function SkuNotFound() {
  return (
    <AdminShell crumbs={[{ label: "Catalogue" }, { label: "Inventory", href: "/inventory" }, { label: "Not found" }]} title="SKU not found">
      <div className="max-w-md rounded-sm border border-zinc-200 bg-white px-6 py-10 text-center">
        <p className="text-[15px] font-bold text-zinc-950">We couldn&apos;t find that SKU</p>
        <p className="mt-1 text-[13.5px] text-zinc-600">It may have been merged or the link is out of date.</p>
        <Link
          href="/inventory"
          className="mt-5 inline-flex h-10 items-center rounded-sm bg-zinc-950 px-5 text-[13.5px] font-semibold text-white"
        >
          Back to inventory
        </Link>
      </div>
    </AdminShell>
  );
}
