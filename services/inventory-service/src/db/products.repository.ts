import { prisma } from "./prisma.js";

export interface ProductView {
  sku: string;
  name: string | null;
  imageUrl: string | null;
  updatedAt: Date;
}

function toView(r: { sku: string; name: string | null; imageUrl: string | null; updatedAt: Date }): ProductView {
  return { sku: r.sku, name: r.name, imageUrl: r.imageUrl, updatedAt: r.updatedAt };
}

export async function listProducts(): Promise<ProductView[]> {
  const rows = await prisma.product.findMany({ orderBy: { sku: "asc" }, take: 500 });
  return rows.map(toView);
}

export async function getProduct(sku: string): Promise<ProductView | null> {
  const row = await prisma.product.findUnique({ where: { sku } });
  return row ? toView(row) : null;
}

export async function upsertProduct(
  sku: string,
  data: { name?: string | null | undefined; imageUrl?: string | null | undefined },
): Promise<ProductView> {
  const row = await prisma.product.upsert({
    where: { sku },
    update: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
    },
    create: {
      sku,
      name: data.name ?? null,
      imageUrl: data.imageUrl ?? null,
    },
  });
  return toView(row);
}
