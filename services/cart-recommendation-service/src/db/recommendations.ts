import { prisma } from "./prisma.js";

export interface Recommendation {
  sku: string;
  /** Number of carts containing this SKU alongside the user's items. */
  score: number;
}

// "Frequently bought together" from live cart data: find other users whose
// carts overlap with this user's SKUs, rank their *other* SKUs by frequency.
// Falls back to globally popular SKUs for empty carts or no overlap.
export async function getRecommendations(
  userId: string,
  limit = 10,
): Promise<Recommendation[]> {
  const take = Math.min(Math.max(limit, 1), 50);

  const mine = await prisma.cartItem.findMany({
    where: { userId },
    select: { sku: true },
  });
  const mySkus = [...new Set(mine.map((m) => m.sku))];

  if (mySkus.length === 0) {
    return popularSkus([], take);
  }

  const overlapping = await prisma.cartItem.findMany({
    where: { sku: { in: mySkus }, userId: { not: userId } },
    select: { userId: true },
    distinct: ["userId"],
    take: 500,
  });
  const otherIds = [...new Set(overlapping.map((o) => o.userId))];

  if (otherIds.length === 0) {
    return popularSkus(mySkus, take);
  }

  const co = await prisma.cartItem.groupBy({
    by: ["sku"],
    where: { userId: { in: otherIds }, sku: { notIn: mySkus } },
    _count: { sku: true },
    orderBy: { _count: { sku: "desc" } },
    take,
  });
  if (co.length > 0) {
    return co.map((c) => ({ sku: c.sku, score: c._count.sku }));
  }
  return popularSkus(mySkus, take);
}

async function popularSkus(
  exclude: string[],
  take: number,
): Promise<Recommendation[]> {
  const rows = await prisma.cartItem.groupBy({
    by: ["sku"],
    ...(exclude.length > 0 ? { where: { sku: { notIn: exclude } } } : {}),
    _count: { sku: true },
    orderBy: { _count: { sku: "desc" } },
    take,
  });
  return rows.map((r) => ({ sku: r.sku, score: r._count.sku }));
}
