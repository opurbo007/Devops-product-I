import { catalog, PRICE_BANDS, type SortId } from "@/data/catalog";
import type { Product } from "@/data/products";

export type FiltersState = {
  brands: string[];
  priceBands: string[];
  conditions: string[];
  grades: string[];
  ram: number[];
  storage: number[];
  colours: string[];
  availability: string[];
  minRating: number | null;
};

export const EMPTY_FILTERS: FiltersState = {
  brands: [],
  priceBands: [],
  conditions: [],
  grades: [],
  ram: [],
  storage: [],
  colours: [],
  availability: [],
  minRating: null,
};

export function applyFilters(products: Product[], f: FiltersState): Product[] {
  return products.filter((p) => {
    if (f.brands.length > 0 && !f.brands.includes(p.brand)) return false;
    if (f.priceBands.length > 0) {
      const band = PRICE_BANDS.find((b) => b.test(p.price));
      if (!band || !f.priceBands.includes(band.id)) return false;
    }
    if (f.conditions.length > 0 && !f.conditions.includes(p.condition ?? "New")) return false;
    if (f.grades.length > 0) {
      if (!p.grade || !f.grades.includes(p.grade)) return false;
    }
    if (f.ram.length > 0 && (p.ramGB === undefined || !f.ram.includes(p.ramGB))) return false;
    if (f.storage.length > 0 && (p.storageGB === undefined || !f.storage.includes(p.storageGB)))
      return false;
    if (f.colours.length > 0 && (!p.colour || !f.colours.includes(p.colour))) return false;
    if (f.availability.length > 0 && !f.availability.includes(p.stock)) return false;
    if (f.minRating !== null && p.rating < f.minRating) return false;
    return true;
  });
}

export function sortProducts(products: Product[], sort: SortId): Product[] {
  const list = [...products];
  switch (sort) {
    case "price-asc":
      return list.sort((a, b) => a.price - b.price);
    case "price-desc":
      return list.sort((a, b) => b.price - a.price);
    case "rating":
      return list.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
    case "reviews":
      return list.sort((a, b) => b.reviews - a.reviews);
    case "saving":
      return list.sort(
        (a, b) => (b.wasPrice ?? b.price) - b.price - ((a.wasPrice ?? a.price) - a.price)
      );
    case "featured":
    default:
      return list;
  }
}

export function countActive(f: FiltersState): number {
  return (
    f.brands.length +
    f.priceBands.length +
    f.conditions.length +
    f.grades.length +
    f.ram.length +
    f.storage.length +
    f.colours.length +
    f.availability.length +
    (f.minRating !== null ? 1 : 0)
  );
}

export type Facet = { value: string; count: number };

function facetOf(values: (string | undefined)[]): Facet[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

function numericFacetOf(values: (number | undefined)[]): { value: number; count: number }[] {
  const counts = new Map<number, number>();
  for (const v of values) {
    if (v === undefined) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value - b.value);
}

/** Facet options derived from the full catalog (stable while filtering). */
export const FACETS = {
  brands: facetOf(catalog.map((p) => p.brand)),
  conditions: facetOf(catalog.map((p) => p.condition ?? "New")),
  grades: facetOf(catalog.map((p) => p.grade)),
  ram: numericFacetOf(catalog.map((p) => p.ramGB)),
  storage: numericFacetOf(catalog.map((p) => p.storageGB)),
  colours: facetOf(catalog.map((p) => p.colour)),
  availability: facetOf(catalog.map((p) => p.stock)),
};
