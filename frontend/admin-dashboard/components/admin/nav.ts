export type NavItem = {
  label: string;
  href: string;
  badge?: string;
  badgeTone?: "red" | "amber" | "zinc";
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

/** Mirrors the services/ directory: order, payment, inventory, notification, shipping, cart-recommendation. */
export const NAV: NavSection[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", href: "/" }],
  },
  {
    title: "Sell",
    items: [
      { label: "Orders", href: "/orders", badge: "18", badgeTone: "red" },
      { label: "Payments", href: "/payments" },
      { label: "Refunds", href: "/refunds", badge: "4", badgeTone: "amber" },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { label: "Products", href: "/products" },
      { label: "Inventory", href: "/inventory", badge: "7", badgeTone: "amber" },
      { label: "Promotions", href: "/promotions" },
    ],
  },
  {
    title: "Fulfilment",
    items: [
      { label: "Shipments", href: "/shipments" },
      { label: "Returns", href: "/returns" },
    ],
  },
  {
    title: "Customers",
    items: [
      { label: "Customers", href: "/customers" },
      { label: "Reviews & Q&A", href: "/reviews" },
    ],
  },
  {
    title: "Platform",
    items: [
      { label: "Events", href: "/events" },
      { label: "Services", href: "/services" },
      { label: "API keys", href: "/api-keys" },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Users & roles", href: "/users" },
      { label: "Audit log", href: "/audit" },
      { label: "Settings", href: "/settings" },
    ],
  },
];

export type Crumb = { label: string; href?: string };
