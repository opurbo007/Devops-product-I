import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { bestSellers, categories, clearance } from "@/data/products";
import { gbp } from "@/lib/format";

function SectionHeader({ eyebrow, title, link, href = "#" }: { eyebrow: string; title: string; link?: string; href?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <p className="mb-1 text-[11.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">{eyebrow}</p>
        <h2 className="text-[22px] font-bold tracking-tight text-zinc-950 sm:text-[26px]">{title}</h2>
      </div>
      {link && (
        <a href={href} className="shrink-0 border-b border-zinc-950 pb-0.5 text-[13.5px] font-semibold text-zinc-950 hover:text-zinc-600 hover:border-zinc-600">
          {link} →
        </a>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-full flex-col bg-white text-zinc-900">
      <Header />

      <main className="flex-1">
        {/* Compact hero — restrained, no gradient */}
        <section className="border-b border-zinc-200 bg-zinc-50">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                The UK electronics retailer
              </p>
              <h1 className="max-w-xl text-[30px] font-bold leading-[1.12] tracking-tight text-zinc-950 sm:text-[38px]">
                Honest prices on the tech you actually want.
              </h1>
              <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-zinc-600">
                TVs, laptops, audio and appliances from the brands you trust — with free
                delivery over £50, a 2-year guarantee included, and real UK-based support.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href="#best-sellers"
                  className="flex h-11 items-center rounded-sm bg-zinc-950 px-6 text-[14px] font-semibold text-white hover:bg-zinc-800"
                >
                  Shop best sellers
                </a>
                <a
                  href="#clearance"
                  className="flex h-11 items-center rounded-sm border border-zinc-300 bg-white px-6 text-[14px] font-semibold text-zinc-950 hover:border-zinc-950"
                >
                  Clearance deals
                </a>
              </div>
              <p className="mt-4 text-[12.5px] text-zinc-500">
                0% finance over £300 · 30-day returns · Rated 4.8/5 Excellent
              </p>
            </div>

            {/* Deal of the week card */}
            <aside className="rounded-sm border border-zinc-200 bg-white" aria-label="Deal of the week">
              <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
                <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">Deal of the week</p>
                <p className="text-[12px] font-medium text-zinc-500">Ends Sunday</p>
              </div>
              <div className="flex gap-4 px-5 py-4">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center bg-zinc-100" aria-hidden="true">
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="text-zinc-400">
                    <rect x="3" y="5" width="18" height="12" rx="1" /><path d="M9 21h6M12 17v4" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-zinc-500">LG</p>
                  <p className="text-[14.5px] font-semibold leading-snug text-zinc-950">
                    C4 55&quot; 4K OLED evo Smart TV
                  </p>
                  <p className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-[20px] font-bold text-zinc-950">{gbp(1299)}</span>
                    <span className="text-[13px] text-zinc-500 line-through">{gbp(1499)}</span>
                    <span className="bg-[#b3261e] px-1.5 py-0.5 text-[11px] font-bold text-white">Save £200</span>
                  </p>
                  <a href="#best-sellers" className="mt-2 inline-block text-[13.5px] font-semibold text-zinc-950 underline underline-offset-4 hover:text-zinc-600">
                    Shop this deal
                  </a>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* Reassurance row */}
        <section aria-label="Why shop with Volt">
          <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-zinc-200 border-b border-zinc-200 px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6">
            {[
              ["Free delivery over £50", "Order by 8pm for next-day"],
              ["2-year guarantee included", "On every TV, laptop & appliance"],
              ["Installation & recycling", "We fit it, we take the old one"],
            ].map(([t, s]) => (
              <div key={t} className="py-4 sm:px-6 sm:first:pl-0 sm:last:pr-0">
                <p className="text-[14px] font-semibold text-zinc-950">{t}</p>
                <p className="text-[13px] text-zinc-500">{s}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12" aria-label="Shop by category">
          <SectionHeader eyebrow="Departments" title="Shop by category" link="View all departments" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((c) => (
              <a
                key={c.name}
                href={c.name === "Laptops & PCs" ? "/products" : "#"}
                className="group rounded-sm border border-zinc-200 bg-white p-4 hover:border-zinc-950"
              >
                <p className="text-[14.5px] font-semibold leading-snug text-zinc-950">{c.name}</p>
                <p className="mt-1 text-[12.5px] text-zinc-500">{c.note}</p>
                <p className="mt-3 text-[12.5px] font-medium text-zinc-700 group-hover:text-zinc-950">
                  {c.count} products <span aria-hidden="true">→</span>
                </p>
              </a>
            ))}
          </div>
        </section>

        {/* Best sellers */}
        <section id="best-sellers" className="border-y border-zinc-200 bg-zinc-50" aria-label="Best sellers">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
            <SectionHeader eyebrow="Most popular" title="This week's best sellers" link="View all best sellers" href="/products" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {bestSellers.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>

        {/* Services */}
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12" aria-label="Services">
          <SectionHeader eyebrow="Services" title="We do more than deliver the box" />
          <div className="grid gap-3 md:grid-cols-3">
            {[
              {
                t: "TV & appliance installation",
                d: "Wall-mounting, stand assembly and appliance connection from £29.99, booked at checkout.",
                l: "Book installation",
              },
              {
                t: "Trade-in & recycling",
                d: "Get up to £150 credit for your old laptop or TV. We'll recycle the rest for free.",
                l: "Value your old tech",
              },
              {
                t: "Business & education",
                d: "Volume pricing, leasing and dedicated account support for teams of 5 to 5,000.",
                l: "Open a trade account",
              },
            ].map((s) => (
              <div key={s.t} className="rounded-sm border border-zinc-200 p-5">
                <h3 className="text-[15.5px] font-bold tracking-tight text-zinc-950">{s.t}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-600">{s.d}</p>
                <a href="#" className="mt-3 inline-block text-[13.5px] font-semibold text-zinc-950 underline underline-offset-4 hover:text-zinc-600">
                  {s.l} →
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Clearance */}
        <section id="clearance" className="border-t border-zinc-200" aria-label="Clearance">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
            <SectionHeader eyebrow="End of line" title="Clearance — while stocks last" link="View all clearance" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {clearance.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>

        {/* Brands */}
        <section className="border-t border-zinc-200 bg-zinc-50" aria-label="Brands we stock">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <p className="mb-4 text-[11.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">
              Official stockist
            </p>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-[16px] font-bold tracking-tight text-zinc-400">
              {["SONY", "SAMSUNG", "LG", "Apple", "BOSE", "DYSON", "Canon", "PHILIPS", "JBL", "LENOVO"].map((b) => (
                <span key={b} className="hover:text-zinc-700">{b}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Advice */}
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12" aria-label="Buying advice">
          <SectionHeader eyebrow="Guides" title="Buying advice from our experts" link="View all guides" />
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                t: "OLED vs QLED in 2026: which TV should you buy?",
                d: "Brightness, burn-in and viewing angles explained — plus the three models we'd buy.",
                meta: "TVs · 8 min read",
              },
              {
                t: "How much laptop do you actually need?",
                d: "M3 vs Ryzen 7, 8GB vs 16GB RAM: a practical guide for work, uni and light gaming.",
                meta: "Computing · 6 min read",
              },
              {
                t: "Heat pump vs condenser tumble dryers",
                d: "Running costs, drying times and the £80-a-year difference most people miss.",
                meta: "Appliances · 5 min read",
              },
            ].map((a) => (
              <a key={a.t} href="#" className="group border-t-2 border-zinc-950 pt-4">
                <p className="text-[12px] font-medium uppercase tracking-wide text-zinc-500">{a.meta}</p>
                <h3 className="mt-1.5 text-[16.5px] font-bold leading-snug tracking-tight text-zinc-950 group-hover:underline">
                  {a.t}
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-600">{a.d}</p>
              </a>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
