export type Product = {
  id: string;
  brand: string;
  name: string;
  category: string;
  price: number;
  wasPrice?: number;
  rating: number;
  reviews: number;
  badge?: "Save" | "New" | "Clearance" | "Bundle";
  financeFrom?: number;
  stock: "In stock" | "Low stock" | "Order in";
  icon: "tv" | "laptop" | "audio" | "phone" | "appliance" | "watch" | "camera" | "console";
  condition?: "New" | "Refurbished" | "Ex-display";
  grade?: "Grade A" | "Grade B" | "Grade C";
  ramGB?: number;
  storageGB?: number;
  colour?: string;
  /** Backend image URL (https://… or /images/<file> via gateway). Absent in mock data. */
  imageUrl?: string;
};

export const bestSellers: Product[] = [
  {
    id: "lg-c4-55-oled",
    brand: "LG",
    name: "C4 55\" 4K OLED evo Smart TV",
    category: "TVs",
    price: 1299,
    wasPrice: 1499,
    rating: 4.8,
    reviews: 2143,
    badge: "Save",
    financeFrom: 36.08,
    stock: "In stock",
    icon: "tv",
  },
  {
    id: "apple-macbook-air-m3",
    brand: "Apple",
    name: "MacBook Air 13\" M3 · 8GB · 256GB",
    category: "Laptops",
    price: 1049,
    wasPrice: 1149,
    rating: 4.9,
    reviews: 5311,
    badge: "Save",
    financeFrom: 29.14,
    stock: "In stock",
    icon: "laptop",
  },
  {
    id: "sony-wh1000xm5",
    brand: "Sony",
    name: "WH-1000XM5 Wireless Noise Cancelling Headphones",
    category: "Audio",
    price: 269,
    wasPrice: 329,
    rating: 4.8,
    reviews: 8924,
    badge: "Save",
    financeFrom: 11.21,
    stock: "In stock",
    icon: "audio",
  },
  {
    id: "samsung-galaxy-s25",
    brand: "Samsung",
    name: "Galaxy S25 5G 128GB · SIM-Free",
    category: "Mobile",
    price: 799,
    rating: 4.7,
    reviews: 1876,
    badge: "New",
    financeFrom: 22.19,
    stock: "In stock",
    icon: "phone",
  },
  {
    id: "dyson-v15-detect",
    brand: "Dyson",
    name: "V15 Detect Absolute Cordless Vacuum",
    category: "Appliances",
    price: 549,
    wasPrice: 649,
    rating: 4.7,
    reviews: 3420,
    badge: "Save",
    financeFrom: 15.25,
    stock: "Low stock",
    icon: "appliance",
  },
  {
    id: "apple-watch-s10",
    brand: "Apple",
    name: "Watch Series 10 GPS 46mm",
    category: "Wearables",
    price: 399,
    rating: 4.8,
    reviews: 1290,
    financeFrom: 11.08,
    stock: "In stock",
    icon: "watch",
  },
  {
    id: "canon-r50-kit",
    brand: "Canon",
    name: "EOS R50 Mirrorless Camera + RF-S 18-45mm",
    category: "Cameras",
    price: 729,
    wasPrice: 799,
    rating: 4.9,
    reviews: 764,
    badge: "Save",
    financeFrom: 20.25,
    stock: "In stock",
    icon: "camera",
  },
  {
    id: "ps5-slim-disc",
    brand: "Sony",
    name: "PlayStation 5 Slim · Disc Edition",
    category: "Gaming",
    price: 479,
    rating: 4.9,
    reviews: 12045,
    badge: "Bundle",
    financeFrom: 13.31,
    stock: "In stock",
    icon: "console",
  },
];

export const categories = [
  { name: "TVs & Projectors", count: 214, note: "OLED, QLED & 4K" },
  { name: "Laptops & PCs", count: 386, note: "Work, study & gaming" },
  { name: "Audio & Headphones", count: 452, note: "Soundbars to earbuds" },
  { name: "Mobile & Wearables", count: 298, note: "SIM-free & contracts" },
  { name: "Home Appliances", count: 531, note: "Laundry to floorcare" },
  { name: "Smart Home", count: 187, note: "Security & heating" },
];

export const clearance: Product[] = [
  {
    id: "breville-barista",
    brand: "Breville",
    name: "Barista Max Espresso Machine",
    category: "Appliances",
    price: 349,
    wasPrice: 499,
    rating: 4.6,
    reviews: 1980,
    badge: "Clearance",
    stock: "Low stock",
    icon: "appliance",
  },
  {
    id: "jbl-flip6",
    brand: "JBL",
    name: "Flip 6 Portable Bluetooth Speaker",
    category: "Audio",
    price: 89,
    wasPrice: 129,
    rating: 4.7,
    reviews: 6540,
    badge: "Clearance",
    stock: "In stock",
    icon: "audio",
  },
  {
    id: "lenovo-ideapad-slim5",
    brand: "Lenovo",
    name: "IdeaPad Slim 5 14\" Ryzen 7 · 16GB · 512GB",
    category: "Laptops",
    price: 599,
    wasPrice: 749,
    rating: 4.5,
    reviews: 913,
    badge: "Clearance",
    stock: "Order in",
    icon: "laptop",
  },
  {
    id: "philips-50-pus",
    brand: "Philips",
    name: "50\" 4K Ambilight Smart TV",
    category: "TVs",
    price: 429,
    wasPrice: 549,
    rating: 4.4,
    reviews: 1502,
    badge: "Clearance",
    stock: "In stock",
    icon: "tv",
  },
];
