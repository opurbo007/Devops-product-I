import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import SkuDetail from "@/components/inventory/SkuDetail";
import { SKUS } from "@/data/inventory";

export function generateStaticParams() {
  return SKUS.map((s) => ({ sku: s.sku }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sku: string }>;
}): Promise<Metadata> {
  const { sku } = await params;
  return { title: `${sku} | Inventory | Volt Ops` };
}

export default async function SkuPage({ params }: { params: Promise<{ sku: string }> }) {
  const { sku: skuId } = await params;
  const sku = SKUS.find((s) => s.sku === skuId);
  if (!sku) notFound();

  return (
    <AdminShell
      crumbs={[{ label: "Catalogue" }, { label: "Inventory", href: "/inventory" }, { label: sku.sku }]}
      title={sku.product}
    >
      <SkuDetail sku={sku} />
    </AdminShell>
  );
}
