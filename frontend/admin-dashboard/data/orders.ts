export type OrderStatus =
  | "Awaiting payment"
  | "Picking"
  | "Packed"
  | "Shipped"
  | "Delivered"
  | "Cancelled"
  | "Refunded";

export type PaymentStatus =
  | "Paid"
  | "Authorised"
  | "Failed"
  | "Refunded"
  | "Partially refunded";

export type OrderItem = { name: string; qty: number; price: number };

export type Order = {
  id: string;
  /** Full backend UUID for detail links (display id stays short). */
  backendId?: string;
  customer: string;
  email: string;
  town: string;
  items: OrderItem[];
  total: number;
  payment: PaymentStatus;
  payMethod: string;
  status: OrderStatus;
  /** hours since creation — drives the date filter */
  ageH: number;
  created: string;
};

const L = (name: string, qty: number, price: number): OrderItem => ({ name, qty, price });

export const ORDERS: Order[] = [
  { id: "VL-90412", customer: "Priya Kaur", email: "priya.k@example.co.uk", town: "Manchester", items: [L("ASUS VivoBook 15\" Ryzen 5 · 16GB · 512GB", 1, 479), L("Sony WH-1000XM5 · Black", 1, 269)], total: 748.0, payment: "Paid", payMethod: "Visa •• 4412", status: "Picking", ageH: 0.1, created: "Today, 12:41" },
  { id: "VL-90411", customer: "Daniel Whitfield", email: "d.whitfield@example.co.uk", town: "Leeds", items: [L("MacBook Air 13\" M3 · 8GB · 256GB", 1, 1049)], total: 1049.0, payment: "Failed", payMethod: "Visa •• 8817", status: "Awaiting payment", ageH: 0.2, created: "Today, 12:30" },
  { id: "VL-90410", customer: "Margaret Hughes", email: "m.hughes@example.co.uk", town: "Bristol", items: [L("Breville Barista Max Espresso Machine", 1, 349), L("JBL Flip 6 · Black", 1, 89), L("Anker 737 Power Bank", 1, 74.97)], total: 512.97, payment: "Paid", payMethod: "PayPal", status: "Packed", ageH: 0.5, created: "Today, 12:15" },
  { id: "VL-90409", customer: "Tom Reid", email: "tom.reid@example.co.uk", town: "Glasgow", items: [L("Sony WH-1000XM5 · Silver", 1, 269)], total: 269.0, payment: "Paid", payMethod: "Mastercard •• 3305", status: "Shipped", ageH: 1, created: "Today, 11:48" },
  { id: "VL-90408", customer: "Aisha Begum", email: "a.begum@example.co.uk", town: "London", items: [L("LG C4 55\" 4K OLED evo TV", 1, 1299)], total: 1299.0, payment: "Paid", payMethod: "Klarna (3 instalments)", status: "Delivered", ageH: 2, created: "Today, 10:52" },
  { id: "VL-90407", customer: "Chris Patterson", email: "c.patterson@example.co.uk", town: "Newcastle", items: [L("JBL Flip 6 · Blue", 1, 129)], total: 129.0, payment: "Refunded", payMethod: "Visa •• 1190", status: "Refunded", ageH: 3, created: "Today, 09:37" },
  { id: "VL-90406", customer: "Sofia Marsh", email: "sofia.m@example.co.uk", town: "Birmingham", items: [L("Lenovo IdeaPad Slim 5 14\" · 16GB · 512GB", 1, 599)], total: 599.0, payment: "Paid", payMethod: "Amex •• 1005", status: "Shipped", ageH: 3.5, created: "Today, 09:12" },
  { id: "VL-90405", customer: "James Lowe", email: "j.lowe@example.co.uk", town: "Sheffield", items: [L("Logitech MX Master 3S", 1, 89.99), L("Samsung 990 Pro 1TB", 1, 143.97)], total: 233.96, payment: "Paid", payMethod: "Visa •• 5521", status: "Delivered", ageH: 4, created: "Today, 08:44" },
  { id: "VL-90404", customer: "Nisha Patel", email: "nisha.p@example.co.uk", town: "Leicester", items: [L("Philips 50\" 4K Ambilight TV", 1, 429)], total: 429.0, payment: "Failed", payMethod: "Mastercard •• 7788", status: "Awaiting payment", ageH: 5, created: "Today, 07:58" },
  { id: "VL-90403", customer: "Ewan MacLeod", email: "ewan.m@example.co.uk", town: "Edinburgh", items: [L("Samsung Galaxy Book4 15\" · 16GB · 512GB", 1, 899)], total: 899.0, payment: "Failed", payMethod: "Visa •• 9902", status: "Awaiting payment", ageH: 7, created: "Today, 05:31" },
  { id: "VL-90402", customer: "Grace Adeyemi", email: "g.adeyemi@example.co.uk", town: "London", items: [L("Apple Watch Series 10 · 46mm", 1, 399), L("AirPods Pro 2", 1, 229)], total: 628.0, payment: "Authorised", payMethod: "Apple Pay", status: "Picking", ageH: 8, created: "Today, 04:50" },
  { id: "VL-90401", customer: "Oliver Bennett", email: "o.bennett@example.co.uk", town: "Norwich", items: [L("Dell Inspiron 15\" · 8GB · 256GB", 1, 349)], total: 349.0, payment: "Paid", payMethod: "PayPal", status: "Packed", ageH: 9, created: "Today, 03:22" },
  { id: "VL-90400", customer: "Freya Campbell", email: "freya.c@example.co.uk", town: "Cardiff", items: [L("Canon EOS R50 + RF-S 18-45mm", 1, 729)], total: 729.0, payment: "Paid", payMethod: "Visa •• 2244", status: "Shipped", ageH: 12, created: "Today, 00:41" },
  { id: "VL-90399", customer: "Mohammed Ali", email: "m.ali@example.co.uk", town: "Bradford", items: [L("HP Pavilion 15\" · 16GB · 512GB", 1, 549)], total: 549.0, payment: "Paid", payMethod: "Klarna (3 instalments)", status: "Delivered", ageH: 20, created: "Yesterday, 16:20" },
  { id: "VL-90398", customer: "Lucy Harper", email: "lucy.h@example.co.uk", town: "York", items: [L("Bose QuietComfort Ultra", 1, 349), L("Anker 65W GaN Charger", 1, 42.99)], total: 391.99, payment: "Paid", payMethod: "Mastercard •• 6654", status: "Delivered", ageH: 22, created: "Yesterday, 14:05" },
  { id: "VL-90397", customer: "Callum Fraser", email: "c.fraser@example.co.uk", town: "Aberdeen", items: [L("PlayStation 5 Slim · Disc", 1, 479)], total: 479.0, payment: "Paid", payMethod: "Visa •• 7810", status: "Shipped", ageH: 26, created: "Yesterday, 10:33" },
  { id: "VL-90396", customer: "Ella Novak", email: "ella.n@example.co.uk", town: "Oxford", items: [L("Microsoft Surface Laptop 7 · 16GB · 512GB", 1, 1049)], total: 1049.0, payment: "Authorised", payMethod: "Amex •• 3102", status: "Picking", ageH: 30, created: "Yesterday, 06:12" },
  { id: "VL-90395", customer: "Rob Fenton", email: "rob.f@example.co.uk", town: "Liverpool", items: [L("Sonos Era 100", 1, 189)], total: 189.0, payment: "Failed", payMethod: "Visa •• 4471", status: "Awaiting payment", ageH: 34, created: "Yesterday, 02:47" },
  { id: "VL-90394", customer: "Hannah Cole", email: "h.cole@example.co.uk", town: "Bath", items: [L("Dyson V15 Detect Absolute", 1, 549)], total: 549.0, payment: "Paid", payMethod: "PayPal", status: "Delivered", ageH: 49, created: "10 Sep, 11:20" },
  { id: "VL-90393", customer: "George Papas", email: "g.papas@example.co.uk", town: "London", items: [L("Samsung Galaxy S25 5G · 128GB", 1, 799)], total: 799.0, payment: "Paid", payMethod: "Visa •• 9083", status: "Delivered", ageH: 55, created: "10 Sep, 05:14" },
  { id: "VL-90392", customer: "Imogen Shaw", email: "i.shaw@example.co.uk", town: "Cambridge", items: [L("Acer Swift Go 14\" · 16GB · 1TB", 1, 699)], total: 699.0, payment: "Partially refunded", payMethod: "Mastercard •• 1129", status: "Delivered", ageH: 73, created: "9 Sep, 11:02" },
  { id: "VL-90391", customer: "Helen Ford", email: "helen.f@example.co.uk", town: "Exeter", items: [L("HP OMEN 16\" RTX 4070 · 1TB", 1, 1449)], total: 1449.0, payment: "Failed", payMethod: "Visa •• 6348", status: "Awaiting payment", ageH: 78, created: "9 Sep, 06:40" },
  { id: "VL-90390", customer: "Oscar Lindqvist", email: "o.lindqvist@example.co.uk", town: "London", items: [L("LG UltraGear 27\" 165Hz", 1, 329.99)], total: 329.99, payment: "Paid", payMethod: "Apple Pay", status: "Delivered", ageH: 96, created: "8 Sep, 12:15" },
  { id: "VL-90389", customer: "Zara Ahmed", email: "z.ahmed@example.co.uk", town: "Luton", items: [L("Lenovo Legion 5 RTX 4060 · 1TB", 1, 1099)], total: 1099.0, payment: "Paid", payMethod: "Klarna (3 instalments)", status: "Cancelled", ageH: 100, created: "8 Sep, 08:31" },
  { id: "VL-90388", customer: "Felix Grant", email: "f.grant@example.co.uk", town: "Brighton", items: [L("JBL Charge 5", 1, 139.99), L("SanDisk Extreme 1TB", 1, 89.99)], total: 229.98, payment: "Refunded", payMethod: "Visa •• 2756", status: "Refunded", ageH: 120, created: "7 Sep, 12:44" },
  { id: "VL-90387", customer: "Daisy O'Brien", email: "daisy.o@example.co.uk", town: "Southampton", items: [L("Apple MacBook Pro 14\" M4 · 16GB · 512GB", 1, 1899)], total: 1899.0, payment: "Paid", payMethod: "Amex •• 8109", status: "Delivered", ageH: 150, created: "6 Sep, 06:22" },
  { id: "VL-90386", customer: "Reuben Clarke", email: "r.clarke@example.co.uk", town: "Nottingham", items: [L("Dell XPS 13\" Ultra 7 · 512GB", 1, 1199)], total: 1199.0, payment: "Paid", payMethod: "Visa •• 5033", status: "Delivered", ageH: 200, created: "4 Sep, 04:18" },
  { id: "VL-90385", customer: "Megan Hughes", email: "megan.h@example.co.uk", town: "Swansea", items: [L("ASUS Zenbook 14 OLED · 32GB · 1TB", 1, 1249)], total: 1249.0, payment: "Paid", payMethod: "PayPal", status: "Delivered", ageH: 300, created: "31 Aug, 14:09" },
];

export const ORDER_STATUSES: OrderStatus[] = [
  "Awaiting payment",
  "Picking",
  "Packed",
  "Shipped",
  "Delivered",
  "Cancelled",
  "Refunded",
];

export const PAYMENT_STATUSES: PaymentStatus[] = [
  "Paid",
  "Authorised",
  "Failed",
  "Refunded",
  "Partially refunded",
];

export type DateRange = "today" | "yesterday" | "7d" | "30d" | "";

export const DATE_RANGES: { value: Exclude<DateRange, "">; label: string; test: (ageH: number) => boolean }[] = [
  { value: "today", label: "Today", test: (h) => h < 14 },
  { value: "yesterday", label: "Yesterday", test: (h) => h >= 14 && h < 38 },
  { value: "7d", label: "Last 7 days", test: (h) => h < 24 * 7 },
  { value: "30d", label: "Last 30 days", test: (h) => h < 24 * 30 },
];
