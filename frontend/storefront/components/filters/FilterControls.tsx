import { PRICE_BANDS } from "@/data/catalog";
import { FACETS, type FiltersState } from "@/lib/catalog";
import FilterSection, { CheckRow } from "./FilterSection";

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function FilterControls({
  filters,
  onChange,
}: {
  filters: FiltersState;
  onChange: (next: FiltersState) => void;
}) {
  const patch = (p: Partial<FiltersState>) => onChange({ ...filters, ...p });

  return (
    <div>
      <FilterSection title="Availability" active={filters.availability.length}>
        {FACETS.availability.map((f) => (
          <CheckRow
            key={f.value}
            label={f.value === "Order in" ? "Available to order" : f.value}
            count={f.count}
            checked={filters.availability.includes(f.value)}
            onChange={(c) =>
              patch({ availability: c ? [...filters.availability, f.value] : filters.availability.filter((v) => v !== f.value) })
            }
          />
        ))}
      </FilterSection>

      <FilterSection title="Brand" active={filters.brands.length}>
        {FACETS.brands.map((f) => (
          <CheckRow
            key={f.value}
            label={f.value}
            count={f.count}
            checked={filters.brands.includes(f.value)}
            onChange={(c) =>
              patch({ brands: c ? [...filters.brands, f.value] : filters.brands.filter((v) => v !== f.value) })
            }
          />
        ))}
      </FilterSection>

      <FilterSection title="Price" active={filters.priceBands.length}>
        {PRICE_BANDS.map((b) => (
          <CheckRow
            key={b.id}
            label={b.label}
            checked={filters.priceBands.includes(b.id)}
            onChange={(c) =>
              patch({ priceBands: c ? [...filters.priceBands, b.id] : filters.priceBands.filter((v) => v !== b.id) })
            }
          />
        ))}
      </FilterSection>

      <FilterSection title="Condition" active={filters.conditions.length}>
        {FACETS.conditions.map((f) => (
          <CheckRow
            key={f.value}
            label={f.value}
            count={f.count}
            hint={f.value === "Refurbished" ? "12-month guarantee included" : undefined}
            checked={filters.conditions.includes(f.value)}
            onChange={(c) =>
              patch({ conditions: c ? [...filters.conditions, f.value] : filters.conditions.filter((v) => v !== f.value) })
            }
          />
        ))}
      </FilterSection>

      <FilterSection title="Grade" active={filters.grades.length} defaultOpen={false}>
        <p className="mb-2 text-[12px] leading-relaxed text-zinc-500">
          Cosmetic grade for refurbished &amp; ex-display.
        </p>
        {FACETS.grades.map((f) => (
          <CheckRow
            key={f.value}
            label={f.value}
            count={f.count}
            hint={f.value === "Grade A" ? "As new" : f.value === "Grade B" ? "Light marks" : "Visible wear"}
            checked={filters.grades.includes(f.value)}
            onChange={(c) =>
              patch({ grades: c ? [...filters.grades, f.value] : filters.grades.filter((v) => v !== f.value) })
            }
          />
        ))}
      </FilterSection>

      <FilterSection title="RAM" active={filters.ram.length}>
        {FACETS.ram.map((f) => (
          <CheckRow
            key={f.value}
            label={`${f.value}GB`}
            count={f.count}
            checked={filters.ram.includes(f.value)}
            onChange={() => patch({ ram: toggle(filters.ram, f.value) })}
          />
        ))}
      </FilterSection>

      <FilterSection title="Storage" active={filters.storage.length}>
        {FACETS.storage.map((f) => (
          <CheckRow
            key={f.value}
            label={f.value >= 1000 ? `${f.value / 1000}TB SSD` : `${f.value}GB SSD`}
            count={f.count}
            checked={filters.storage.includes(f.value)}
            onChange={() => patch({ storage: toggle(filters.storage, f.value) })}
          />
        ))}
      </FilterSection>

      <FilterSection title="Colour" active={filters.colours.length} defaultOpen={false}>
        {FACETS.colours.map((f) => (
          <CheckRow
            key={f.value}
            label={f.value}
            count={f.count}
            checked={filters.colours.includes(f.value)}
            onChange={(c) =>
              patch({ colours: c ? [...filters.colours, f.value] : filters.colours.filter((v) => v !== f.value) })
            }
          />
        ))}
      </FilterSection>

      <FilterSection
        title="Rating"
        active={filters.minRating !== null ? 1 : 0}
        defaultOpen={false}
      >
        {[
          { value: null as number | null, label: "Any rating" },
          { value: 4, label: "4★ & up" },
          { value: 4.5, label: "4.5★ & up" },
          { value: 4.8, label: "4.8★ & up" },
        ].map((o) => (
          <label
            key={String(o.value)}
            className="flex cursor-pointer items-center gap-2.5 py-1.5 text-[13.5px] text-zinc-800 hover:text-zinc-950"
          >
            <input
              type="radio"
              name="min-rating"
              checked={filters.minRating === o.value}
              onChange={() => patch({ minRating: o.value })}
              className="h-4 w-4 shrink-0 accent-zinc-950"
            />
            <span>{o.label}</span>
          </label>
        ))}
      </FilterSection>

      <p className="pt-3 text-[12px] leading-relaxed text-zinc-500">
        Prices include VAT · Free delivery over £50.
      </p>
    </div>
  );
}
