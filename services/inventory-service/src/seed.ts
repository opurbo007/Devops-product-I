import dotenv from "dotenv";
import { prisma } from "./db/prisma.js";

dotenv.config();

// Demo seed: upserts sellable stock rows (idempotent — safe to re-run).
// Defaults mirror the storefront catalog SKUs (see frontend/storefront
// lib/productDetails.ts skuFor) so demo checkout reserves real stock.
// Override via SEED_SKUS="SKU-A:100,SKU-B:50".
const DEFAULT_SEED = [
  { sku: "VL-APP-APPLMBA13M", qty: 50 },
  { sku: "VL-APP-APPLMBA15M", qty: 50 },
  { sku: "VL-APP-APPLMBP14M", qty: 30 },
  { sku: "VL-APP-APPLMBP16M", qty: 20 },
  { sku: "VL-APP-APPLMACBAI", qty: 40 },
  { sku: "VL-APP-APPLWATCS1", qty: 60 },
  { sku: "VL-LEN-LENOSLIM14", qty: 40 },
  { sku: "VL-LEN-LENOTHINE1", qty: 40 },
  { sku: "VL-LEN-LENOLEGIRT", qty: 25 },
  { sku: "VL-LEN-LENOT14S", qty: 30 },
  { sku: "VL-LEN-LENOIDEASL", qty: 30 },
  { sku: "VL-HPX-HPPAVII516", qty: 35 },
  { sku: "VL-HPX-HPELIT840", qty: 30 },
  { sku: "VL-HPX-HPOMENRTX4", qty: 20 },
  { sku: "VL-DEL-DELLXPS1UL", qty: 30 },
  { sku: "VL-DEL-DELLINSPI3", qty: 40 },
  { sku: "VL-DEL-DELLLATI54", qty: 30 },
  { sku: "VL-ASU-ASUSVIVOR5", qty: 40 },
  { sku: "VL-ASU-ASUSZENBUL", qty: 30 },
  { sku: "VL-ASU-ASUSROGSTR", qty: 20 },
  { sku: "VL-ACE-ACERASPII5", qty: 40 },
  { sku: "VL-ACE-ACERSWIFGO", qty: 35 },
  { sku: "VL-SAM-SAMSGALABO", qty: 30 },
  { sku: "VL-SAM-SAMSBOOK36", qty: 25 },
  { sku: "VL-SAM-SAMSGALAS2", qty: 50 },
  { sku: "VL-MIC-MSSURFLAPT", qty: 30 },
  { sku: "VL-MIC-MSSURFPRO1", qty: 25 },
  { sku: "VL-LGX-LGC455OLED", qty: 20 },
  { sku: "VL-SON-SONYWH10", qty: 50 },
  { sku: "VL-SON-PS5SLIMDIS", qty: 15 },
  { sku: "VL-DYS-DYSOV15DET", qty: 25 },
  { sku: "VL-CAN-CANOR50KIT", qty: 20 },
  { sku: "VL-BRE-BREVBARI", qty: 30 },
  { sku: "VL-JBL-JBLFLIP", qty: 60 },
  { sku: "VL-PHI-PHIL50PUS", qty: 25 },
];

function parseSeed(): { sku: string; qty: number }[] {
  const raw = process.env.SEED_SKUS?.trim();
  if (!raw) return DEFAULT_SEED;
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [sku, qty] = part.split(":");
      const n = Number(qty);
      if (!sku || !Number.isInteger(n) || n < 0) {
        throw new Error(
          `invalid SEED_SKUS entry "${part}" (want SKU:qty with qty >= 0)`,
        );
      }
      return { sku, qty: n };
    });
}

const rows = parseSeed();
for (const { sku, qty } of rows) {
  const row = await prisma.stock.upsert({
    where: { sku },
    update: { availableQuantity: qty },
    create: { sku, availableQuantity: qty },
  });
  console.log(`seeded ${row.sku}: available_quantity=${row.availableQuantity}`);
}

await prisma.$disconnect();
