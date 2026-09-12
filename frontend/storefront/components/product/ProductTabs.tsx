"use client";

import type { Product } from "@/data/catalog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Stars } from "@/components/Stars";
import AskQuestion from "./AskQuestion";
import {
  getDescription,
  getSpecs,
  getReviews,
  getRatingBreakdown,
  getQAs,
} from "@/lib/productDetails";

export default function ProductTabs({ product }: { product: Product }) {
  const description = getDescription(product);
  const specs = getSpecs(product);
  const reviews = getReviews(product);
  const breakdown = getRatingBreakdown(product);
  const qas = getQAs(product);

  return (
    <Tabs defaultValue="description">
      <TabsList>
        <TabsTrigger value="description">Description</TabsTrigger>
        <TabsTrigger value="specs">Specifications</TabsTrigger>
        <TabsTrigger value="reviews">Reviews ({product.reviews.toLocaleString("en-GB")})</TabsTrigger>
        <TabsTrigger value="qa">Q&amp;A ({qas.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="description">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="max-w-2xl space-y-4 text-[14.5px] leading-relaxed text-zinc-700">
            {description.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
            <ul className="list-disc space-y-1.5 pl-5">
              <li>{product.ramGB ?? 8}GB RAM and fast SSD storage — boots in seconds</li>
              <li>Backlit keyboard with fingerprint reader</li>
              <li>{product.condition === "New" ? "2-year guarantee included" : "12-month guarantee included"} · 30-day returns</li>
              <li>Free UK delivery on this item · 0% finance available</li>
            </ul>
          </div>
          <aside className="h-fit rounded-sm border border-zinc-200 bg-zinc-50 p-5 text-[13px] leading-relaxed text-zinc-600">
            <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-500">Why buy from Volt</p>
            <ul className="space-y-2">
              <li>✓ Official UK stock with valid manufacturer warranty</li>
              <li>✓ 40-point testing on every refurbished unit</li>
              <li>✓ Free recycling of your old laptop</li>
              <li>✓ UK-based support, 7 days a week</li>
            </ul>
          </aside>
        </div>
      </TabsContent>

      <TabsContent value="specs">
        <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
          {specs.map((group) => (
            <section key={group.title} aria-label={group.title}>
              <h3 className="mb-2 border-b-2 border-zinc-950 pb-1.5 text-[14px] font-bold text-zinc-950">
                {group.title}
              </h3>
              <dl>
                {group.rows.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[140px_1fr] gap-3 border-b border-zinc-100 py-2 text-[13.5px]">
                    <dt className="text-zinc-500">{k}</dt>
                    <dd className="font-medium text-zinc-900">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="reviews">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <div className="h-fit rounded-sm border border-zinc-200 p-5">
            <p className="text-[36px] font-bold leading-none tracking-tight text-zinc-950">
              {product.rating.toFixed(1)}
            </p>
            <Stars rating={product.rating} className="mt-2" />
            <p className="mt-1.5 text-[12.5px] text-zinc-500">
              Based on {product.reviews.toLocaleString("en-GB")} verified reviews
            </p>
            <div className="mt-4 space-y-1.5">
              {breakdown.map((b) => (
                <div key={b.stars} className="flex items-center gap-2 text-[12px] text-zinc-600">
                  <span className="w-6 shrink-0 tabular-nums">{b.stars}★</span>
                  <span className="h-1.5 flex-1 rounded-full bg-zinc-100">
                    <span className="block h-full rounded-full bg-zinc-950" style={{ width: `${b.pct}%` }} />
                  </span>
                  <span className="w-8 shrink-0 text-right tabular-nums">{b.pct}%</span>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-4 w-full">Write a review</Button>
          </div>
          <div className="space-y-5">
            {reviews.map((r) => (
              <article key={r.author + r.date} className="border-b border-zinc-200 pb-5 last:border-0">
                <Stars rating={r.rating} />
                <h4 className="mt-1.5 text-[14.5px] font-bold text-zinc-950">{r.title}</h4>
                <p className="mt-1 text-[13.5px] leading-relaxed text-zinc-700">{r.body}</p>
                <p className="mt-2 text-[12.5px] text-zinc-500">
                  {r.author} · {r.location} · {r.date}
                  {r.verified && <span className="ml-2 font-semibold text-green-700">✓ Verified purchase</span>}
                  <span className="ml-3">Helpful ({r.helpful})</span>
                </p>
              </article>
            ))}
            <Button variant="outline">Load more reviews</Button>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="qa">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <Accordion>
            {qas.map((item) => (
              <AccordionItem key={item.q} title={item.q} meta={item.meta}>
                {item.a}
              </AccordionItem>
            ))}
          </Accordion>
          <AskQuestion />
        </div>
      </TabsContent>
    </Tabs>
  );
}
