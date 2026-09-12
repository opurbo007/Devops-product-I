export type Grade = "New" | "Grade A" | "Grade B" | "Ex-display";
export type StockStatus = "Out of stock" | "Low" | "In stock";

export type Sku = {
  sku: string;
  product: string;
  brand: string;
  category: string;
  available: number;
  reserved: number;
  reorderPoint: number;
  grade: Grade;
  location: string;
  /** minutes since last stock movement */
  updatedMin: number;
};

export const SKUS: Sku[] = [
  { sku: "SNY-WH1000XM5-B", product: "Sony WH-1000XM5 · Black", brand: "Sony", category: "Audio", available: 0, reserved: 6, reorderPoint: 15, grade: "New", location: "Doncaster DC", updatedMin: 12 },
  { sku: "APL-MBA13M3-MID", product: "MacBook Air 13\" M3 · Midnight", brand: "Apple", category: "Laptops", available: 3, reserved: 4, reorderPoint: 8, grade: "New", location: "Doncaster DC", updatedMin: 4 },
  { sku: "LEN-LGN5-4060", product: "Legion 5 RTX 4060 · 16GB · 1TB", brand: "Lenovo", category: "Laptops", available: 4, reserved: 2, reorderPoint: 6, grade: "New", location: "Doncaster DC", updatedMin: 26 },
  { sku: "DYS-V15-ABS", product: "Dyson V15 Detect Absolute", brand: "Dyson", category: "Appliances", available: 5, reserved: 3, reorderPoint: 10, grade: "New", location: "Doncaster DC", updatedMin: 41 },
  { sku: "SAM-GB4-360", product: "Galaxy Book4 360 13\" · Grey", brand: "Samsung", category: "Laptops", available: 2, reserved: 1, reorderPoint: 6, grade: "Ex-display", location: "London E2", updatedMin: 58 },
  { sku: "LG-C4-55-OLED", product: "LG C4 55\" 4K OLED evo", brand: "LG", category: "TVs", available: 14, reserved: 5, reorderPoint: 8, grade: "New", location: "Doncaster DC", updatedMin: 7 },
  { sku: "APL-MBA13M2-RFA", product: "MacBook Air 13\" M2 (Refurbished)", brand: "Apple", category: "Laptops", available: 11, reserved: 2, reorderPoint: 5, grade: "Grade A", location: "Manchester", updatedMin: 63 },
  { sku: "HP-OMEN16-4070", product: "HP OMEN 16\" RTX 4070 · 1TB", brand: "HP", category: "Laptops", available: 6, reserved: 4, reorderPoint: 6, grade: "New", location: "Doncaster DC", updatedMin: 19 },
  { sku: "JBL-FLIP6-BLK", product: "JBL Flip 6 · Black", brand: "JBL", category: "Audio", available: 48, reserved: 9, reorderPoint: 20, grade: "New", location: "Doncaster DC", updatedMin: 3 },
  { sku: "BOS-QCU-BLK", product: "Bose QuietComfort Ultra · Black", brand: "Bose", category: "Audio", available: 22, reserved: 4, reorderPoint: 12, grade: "New", location: "Doncaster DC", updatedMin: 33 },
  { sku: "CAN-R50-KIT", product: "Canon EOS R50 + RF-S 18-45mm", brand: "Canon", category: "Cameras", available: 9, reserved: 1, reorderPoint: 6, grade: "New", location: "London E2", updatedMin: 47 },
  { sku: "SAM-S25-128", product: "Samsung Galaxy S25 5G · 128GB", brand: "Samsung", category: "Mobile", available: 31, reserved: 7, reorderPoint: 15, grade: "New", location: "Doncaster DC", updatedMin: 9 },
  { sku: "APL-WTS10-46", product: "Apple Watch Series 10 · 46mm", brand: "Apple", category: "Wearables", available: 27, reserved: 3, reorderPoint: 12, grade: "New", location: "Doncaster DC", updatedMin: 15 },
  { sku: "PS5-SLIM-DSC", product: "PlayStation 5 Slim · Disc", brand: "Sony", category: "Gaming", available: 19, reserved: 8, reorderPoint: 12, grade: "New", location: "Doncaster DC", updatedMin: 6 },
  { sku: "DEL-XPS13-U7", product: "Dell XPS 13\" Ultra 7 · 512GB", brand: "Dell", category: "Laptops", available: 8, reserved: 2, reorderPoint: 8, grade: "New", location: "Manchester", updatedMin: 74 },
  { sku: "LEN-T14S-RFB", product: "ThinkPad T14s Gen 3 (Refurbished)", brand: "Lenovo", category: "Laptops", available: 16, reserved: 1, reorderPoint: 5, grade: "Grade B", location: "Manchester", updatedMin: 130 },
  { sku: "HP-EB840-RFA", product: "HP EliteBook 840 G9 (Refurbished)", brand: "HP", category: "Laptops", available: 13, reserved: 0, reorderPoint: 5, grade: "Grade A", location: "Manchester", updatedMin: 210 },
  { sku: "PHI-50PUS-4K", product: "Philips 50\" 4K Ambilight TV", brand: "Philips", category: "TVs", available: 21, reserved: 2, reorderPoint: 10, grade: "New", location: "Doncaster DC", updatedMin: 52 },
  { sku: "BRE-BARMAX", product: "Breville Barista Max Espresso", brand: "Breville", category: "Appliances", available: 7, reserved: 5, reorderPoint: 8, grade: "New", location: "Doncaster DC", updatedMin: 22 },
  { sku: "ASU-VB15-R5", product: "ASUS VivoBook 15\" Ryzen 5 · 512GB", brand: "ASUS", category: "Laptops", available: 34, reserved: 11, reorderPoint: 15, grade: "New", location: "Doncaster DC", updatedMin: 5 },
  { sku: "ACE-SWGO14", product: "Acer Swift Go 14\" · 1TB", brand: "Acer", category: "Laptops", available: 12, reserved: 0, reorderPoint: 8, grade: "New", location: "London E2", updatedMin: 96 },
  { sku: "MS-SFL7-135", product: "Surface Laptop 7 13\" · 512GB", brand: "Microsoft", category: "Laptops", available: 10, reserved: 3, reorderPoint: 8, grade: "New", location: "Doncaster DC", updatedMin: 38 },
  { sku: "SON-ERA100", product: "Sonos Era 100 · White", brand: "Sonos", category: "Audio", available: 0, reserved: 0, reorderPoint: 10, grade: "New", location: "Doncaster DC", updatedMin: 300 },
  { sku: "DEL-LAT5440-RFA", product: "Dell Latitude 5440 (Refurbished)", brand: "Dell", category: "Laptops", available: 18, reserved: 2, reorderPoint: 6, grade: "Grade A", location: "Manchester", updatedMin: 175 },
];

export const GRADES: Grade[] = ["New", "Grade A", "Grade B", "Ex-display"];

export type StockFilter = "out" | "low" | "ok" | "";

export const STOCK_FILTERS: { value: Exclude<StockFilter, "">; label: string }[] = [
  { value: "out", label: "Out of stock" },
  { value: "low", label: "Low stock" },
  { value: "ok", label: "In stock" },
];
