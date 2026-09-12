import { catalog, type Product } from "@/data/catalog";

export function getProduct(slug: string): Product | undefined {
  return catalog.find((p) => p.id === slug);
}

/** Deterministic SKU, e.g. VL-APL-MBA13M3. */
export function skuFor(p: Product): string {
  const brand = p.brand.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase().padEnd(3, "X");
  const code = p.id
    .split("-")
    .filter((s) => !["refurb", "exdisplay", "a", "b"].includes(s))
    .map((s) => s.replace(/[^a-z0-9]/gi, "").slice(0, 4))
    .join("")
    .toUpperCase()
    .slice(0, 10);
  return `VL-${brand}-${code}`;
}

export function storageLabel(gb?: number): string {
  if (gb === undefined) return "—";
  return gb >= 1000 ? `${gb / 1000}TB SSD` : `${gb}GB SSD`;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function screenInches(p: Product): string {
  const m = p.name.match(/(\d+(?:\.\d+)?)\s*"/);
  return m ? `${m[1]}"` : "15.6\"";
}

function chipHint(p: Product): string {
  const n = p.name;
  if (/M4 Max/.test(n)) return "Apple M4 Max (16-core CPU, 40-core GPU)";
  if (/M4\b/.test(n)) return "Apple M4 (10-core CPU, 10-core GPU)";
  if (/M3\b/.test(n)) return "Apple M3 (8-core CPU, 10-core GPU)";
  if (/M2\b/.test(n)) return "Apple M2 (8-core CPU, 10-core GPU)";
  if (/Snapdragon/.test(n)) return "Snapdragon X Elite (12-core, NPU 45 TOPS)";
  if (/Ultra 7/.test(n)) return "Intel Core Ultra 7 155H (16-core, NPU)";
  if (/Ryzen 7/.test(n)) return "AMD Ryzen 7 8840HS (8-core)";
  if (/Ryzen 5/.test(n)) return "AMD Ryzen 5 8640HS (6-core)";
  if (/i7/i.test(n)) return "Intel Core i7-13700H (14-core)";
  if (/i5/i.test(n)) return "Intel Core i5-1335U (10-core)";
  if (/i3/i.test(n)) return "Intel Core i3-N305 (8-core)";
  return "Multi-core processor";
}

export type SpecGroup = { title: string; rows: [string, string][] };

export function getSpecs(p: Product): SpecGroup[] {
  const apple = p.brand === "Apple" || p.brand === "Microsoft" || p.brand === "Samsung";
  return [
    {
      title: "Display",
      rows: [
        ["Screen size", `${screenInches(p)} ${/OLED/.test(p.name) ? "OLED" : /360/.test(p.name) ? "AMOLED touchscreen" : "IPS"}`],
        ["Resolution", /MacBook|Surface/.test(p.name) ? "2560 × 1664 (Retina-calibre)" : "1920 × 1080 Full HD"],
        ["Refresh rate", /ROG|OMEN|Legion/.test(p.name) ? "165Hz" : "60Hz"],
      ],
    },
    {
      title: "Performance",
      rows: [
        ["Processor", chipHint(p)],
        ["Memory", `${p.ramGB ?? 8}GB ${apple ? "unified" : "DDR5"} RAM`],
        ["Storage", storageLabel(p.storageGB)],
        ["Graphics", /RTX 4070/.test(p.name) ? "NVIDIA GeForce RTX 4070 8GB" : /RTX 4060/.test(p.name) ? "NVIDIA GeForce RTX 4060 8GB" : "Integrated graphics"],
        ["Operating system", p.brand === "Apple" ? "macOS Sequoia" : "Windows 11 Home"],
      ],
    },
    {
      title: "Design & battery",
      rows: [
        ["Colour", p.colour ?? "Silver"],
        ["Battery life", /MacBook|Galaxy Book|Zenbook/.test(p.name) ? "Up to 18 hours" : "Up to 10 hours"],
        ["Weight", /14"|13"/.test(p.name) ? "From 1.24kg" : "From 1.7kg"],
        ["Keyboard", "Backlit keyboard with fingerprint reader"],
      ],
    },
    {
      title: "In the box & warranty",
      rows: [
        ["In the box", "Laptop, USB-C charger, quick-start guide"],
        ["Condition", p.condition === "New" ? "Brand new, sealed" : `${p.condition}${p.grade ? ` — ${p.grade}` : ""}, data-wiped & 40-point tested`],
        ["Guarantee", p.condition === "New" ? "2-year guarantee included" : "12-month guarantee included"],
        ["Returns", "30-day returns"],
      ],
    },
  ];
}

export function getDescription(p: Product): string[] {
  const cond = p.condition !== "New";
  return [
    `The ${p.brand} ${p.name.split("·")[0].trim()} is a ${/16"|15"/.test(p.name) ? "large-screen" : "portable"} laptop built for ${
      /ROG|OMEN|Legion/.test(p.name) ? "gaming and creative workloads" : /ThinkPad|Latitude|EliteBook/.test(p.name) ? "business use, with a spill-resistant keyboard and MIL-STD durability testing" : "everyday work, study and streaming"
    }. With ${p.ramGB ?? 8}GB of RAM and a fast ${storageLabel(p.storageGB).toLowerCase()}, it boots in seconds and keeps dozens of tabs, spreadsheets and video calls running smoothly.`,
    cond
      ? `This is a ${p.condition?.toLowerCase()}${p.grade ? ` (${p.grade})` : ""} unit: professionally data-wiped, tested across 40+ checkpoints and graded honestly by our engineers. You get the same 30-day returns as new, plus a 12-month guarantee — a smart way to save ${p.wasPrice ? `against the original price` : "money"}.`
      : `Supplied brand new and sealed, with our 2-year guarantee included as standard — double the cover most retailers include. Our UK-based support team can help with setup, data transfer from your old machine, and Microsoft 365 or antivirus bundles at checkout.`,
  ];
}

export type Review = {
  author: string;
  location: string;
  date: string;
  rating: number;
  title: string;
  body: string;
  helpful: number;
  verified: boolean;
};

const REVIEW_POOL: Review[] = [
  { author: "Priya K.", location: "Manchester", date: "12 January 2026", rating: 5, title: "Brilliant machine for uni work", body: "Battery easily lasts a full day of lectures and the screen is lovely for essays and Netflix. Setup took ten minutes and Volt's delivery arrived a day early.", helpful: 214, verified: true },
  { author: "Daniel W.", location: "Leeds", date: "28 February 2026", rating: 5, title: "Fast, quiet and light", body: "Upgraded from a five-year-old laptop and the difference is night and day. Silent under normal use, boots in seconds. Keyboard is comfortable for long typing sessions.", helpful: 156, verified: true },
  { author: "Margaret H.", location: "Bristol", date: "3 March 2026", rating: 4, title: "Very good, one small gripe", body: "Does everything I need for photo editing and office work. Only complaint is the charger is a bit bulky to carry around. Otherwise faultless, and the refurb condition was genuinely as-new.", helpful: 98, verified: true },
  { author: "Tom R.", location: "Glasgow", date: "19 March 2026", rating: 5, title: "Great value in the sale", body: "Picked this up with £200 off and it's superb. Handles Football Manager, 30 Chrome tabs and Teams calls without breaking a sweat. Click and collect was ready in 40 minutes.", helpful: 121, verified: true },
  { author: "Aisha B.", location: "London", date: "2 April 2026", rating: 4, title: "Solid all-rounder", body: "Bought for my daughter's A-levels. Screen is sharp, build feels sturdy enough to survive a school bag. Took one star off as I'd have liked an extra USB port, but a hub sorted it.", helpful: 64, verified: true },
  { author: "Chris P.", location: "Newcastle", date: "21 April 2026", rating: 5, title: "Exceeds expectations", body: "Was nervous about buying refurbished but you honestly cannot tell it isn't new — not a mark on it. Runs cool and quiet. The 12-month guarantee gave me confidence.", helpful: 187, verified: true },
  { author: "Sofia M.", location: "Birmingham", date: "9 May 2026", rating: 5, title: "Perfect for video calls", body: "Camera and mics are noticeably better than my old laptop — colleagues commented on it unprompted. Fingerprint login works every time.", helpful: 73, verified: true },
  { author: "James L.", location: "Sheffield", date: "24 May 2026", rating: 3, title: "Good laptop, slow delivery", body: "The laptop itself is great and exactly as described. Delivery took four days instead of two during the sale rush, though support kept me updated throughout.", helpful: 41, verified: false },
];

export function getReviews(p: Product): Review[] {
  const start = hash(p.id) % REVIEW_POOL.length;
  return [0, 1, 2, 3].map((i) => REVIEW_POOL[(start + i) % REVIEW_POOL.length]);
}

export function getRatingBreakdown(p: Product): { stars: number; pct: number }[] {
  const h = hash(p.id + "breakdown");
  const five = Math.min(92, Math.round(p.rating * 18 + (h % 5)));
  const four = Math.min(20, Math.max(4, 100 - five - 6 - (h % 4)));
  const three = Math.max(1, 100 - five - four - 3);
  const two = 2;
  const one = Math.max(1, 100 - five - four - three - two);
  return [
    { stars: 5, pct: five },
    { stars: 4, pct: four },
    { stars: 3, pct: three },
    { stars: 2, pct: two },
    { stars: 1, pct: one },
  ];
}

export type QA = { q: string; meta: string; a: string };

export function getQAs(p: Product): QA[] {
  const model = p.name.split("·")[0].trim();
  return [
    {
      q: "Is this laptop compatible with Microsoft Office?",
      meta: "Asked by Helen · 14 February 2026",
      a: `Yes. The ${model} runs the full Microsoft 365 apps (Word, Excel, PowerPoint, Teams) via download or browser. We can pre-install a 1-year Microsoft 365 Personal licence at checkout.`,
    },
    {
      q: "Can I add more RAM or storage later?",
      meta: "Asked by Rob · 6 March 2026 · Answered by Volt Tech Team",
      a: (p.brand === "Apple" || p.brand === "Microsoft")
        ? "Memory and storage are soldered on this model, so we'd recommend choosing the specification you'll need for the next 3–4 years. Our team can advise — call 0800 048 1234."
        : "Storage can be upgraded by our service team after purchase (from £49 including parts labour estimate); RAM is soldered. Any upgrade keeps your guarantee intact when fitted by us.",
    },
    {
      q: "What does the guarantee cover?",
      meta: "Asked by Nisha · 22 March 2026 · Answered by Volt Tech Team",
      a: p.condition === "New"
        ? "Our 2-year guarantee covers parts and labour for electrical faults, including battery failure below 70% health. Accidental damage cover can be added for £6.99/month."
        : "This unit includes a 12-month parts-and-labour guarantee covering electrical faults, plus 30-day returns. You can extend to 24 months at checkout for £79.",
    },
    {
      q: "How fast is delivery to Scotland?",
      meta: "Asked by Ewan · 9 April 2026",
      a: "Standard delivery (2–3 working days, free over £50) covers all of mainland Scotland. Next-day is available to most AB, DD, EH, G and PH postcodes when you order before 8pm.",
    },
  ];
}

/** Same model family, different spec/colour — real variant switching. */
export function getVariants(p: Product): Product[] {
  const family = p.name.split("·")[0].trim().slice(0, 18);
  const same = catalog.filter(
    (x) => x.brand === p.brand && x.name.startsWith(family) && x.id !== p.id
  );
  if (same.length > 0) return [p, ...same].slice(0, 4);
  const brandOthers = catalog.filter((x) => x.brand === p.brand && x.id !== p.id).slice(0, 3);
  return [p, ...brandOthers];
}

export function variantLabel(p: Product): string {
  return [p.storageGB ? storageLabel(p.storageGB).replace(" SSD", "") : null, p.colour ?? null]
    .filter(Boolean)
    .join(" · ");
}

export function getRelated(p: Product): Product[] {
  const others = catalog.filter((x) => x.id !== p.id);
  const diffBrand = others.filter((x) => x.brand !== p.brand);
  const sameBrand = others.filter((x) => x.brand === p.brand);
  return [...diffBrand, ...sameBrand].slice(0, 4);
}

export function deliveryFor(p: Product): { label: string; detail: string; price: string }[] {
  const orderIn = p.stock === "Order in";
  return [
    {
      label: "Standard",
      detail: orderIn ? "Ships in 3–5 working days" : "2–3 working days",
      price: p.price >= 50 ? "Free" : "£3.99",
    },
    {
      label: "Next-day",
      detail: orderIn ? "Not available on ordered-in stock" : "Order before 8pm Mon–Fri",
      price: orderIn ? "—" : "£5.99",
    },
    {
      label: "Click & Collect",
      detail: orderIn ? "Available in 3–5 days" : "Ready in 60 mins, 120+ stores",
      price: "Free",
    },
  ];
}
