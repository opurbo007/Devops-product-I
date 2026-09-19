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

/** Live sections only — catalogue, customers and system pages have no backend yet. */
export const NAV: NavSection[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard" }],
  },
  {
    title: "Sell",
    items: [
      { label: "Orders", href: "/orders" },
      { label: "Payments", href: "/payments" },
      { label: "Refunds", href: "/payments?status=refunded" },
    ],
  },
  {
    title: "Catalogue",
    items: [{ label: "Inventory", href: "/inventory" }],
  },
  {
    title: "Fulfilment",
    items: [{ label: "Shipments", href: "/shipments" }],
  },
  {
    title: "Platform",
    items: [
      { label: "Events", href: "/events" },
      { label: "Dead letters", href: "/events/dlq" },
      { label: "Services", href: "/services" },
      { label: "Chaos Lab", href: "/chaos" },
    ],
  },
];

export type Crumb = { label: string; href?: string };
