import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import ProductGallery from "@/components/product/ProductGallery";
import PurchasePanel from "@/components/product/PurchasePanel";
import ProductTabs from "@/components/product/ProductTabs";
import { Stars } from "@/components/Stars";
import { Badge } from "@/components/ui/badge";
import { catalog } from "@/data/catalog";
import { getProduct, getRelated, getVariants, skuFor } from "@/lib/productDetails";
import { gbp } from "@/lib/format";

export function generateStaticParams() {
  return catalog.map((p) => ({ slug: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return { title: "Product not found | Volt Electricals" };
  return {
    title: `${product.name} | Volt Electricals`,
    description: `Buy the ${product.brand} ${product.name} for ${gbp(product.price)} with free UK delivery over £50 and a ${
      product.condition === "New" ? "2-year" : "12-month"
    } guarantee included.`,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const variants = getVariants(product);
  const related = getRelated(product);
  const saving = (product.wasPrice ?? product.price) - product.price;

  return (
    <div className="flex min-h-full flex-col bg-white text-zinc-900">
      <Header />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-5 text-[12.5px] text-zinc-500">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li><a href="/" className="hover:text-zinc-950 hover:underline">Home</a></li>
              <li aria-hidden="true">/</li>
              <li><a href="#" className="hover:text-zinc-950 hover:underline">Computing</a></li>
              <li aria-hidden="true">/</li>
              <li><a href="/products" className="hover:text-zinc-950 hover:underline">Laptops &amp; PCs</a></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="max-w-[220px] truncate font-semibold text-zinc-900 sm:max-w-none">
                {product.name}
              </li>
            </ol>
          </nav>

          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            <ProductGallery product={product} />

            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-zinc-500">{product.brand}</p>
              <h1 className="mt-1 text-[24px] font-bold leading-tight tracking-tight text-zinc-950 sm:text-[28px]">
                {product.name}
              </h1>

              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px]">
                <Stars rating={product.rating} />
                <span className="font-semibold text-zinc-950">{product.rating.toFixed(1)}</span>
                <a href="#reviews" className="text-zinc-500 underline underline-offset-2 hover:text-zinc-950">
                  {product.reviews.toLocaleString("en-GB")} reviews
                </a>
                <span aria-hidden="true" className="text-zinc-300">|</span>
                <span className="text-zinc-500">SKU: <span className="font-medium text-zinc-800">{skuFor(product)}</span></span>
              </div>

              <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-y border-zinc-200 py-4">
                <span className="text-[30px] font-bold tracking-tight text-zinc-950">{gbp(product.price)}</span>
                {product.wasPrice && (
                  <>
                    <span className="text-[15px] text-zinc-500 line-through">{gbp(product.wasPrice)}</span>
                    <Badge variant="sale">Save {gbp(saving)} ({Math.round((saving / product.wasPrice) * 100)}%)</Badge>
                  </>
                )}
              </div>
              <p className="mt-2 text-[12.5px] text-zinc-500">Price includes VAT · Free delivery on this item</p>

              <p className="mt-3 flex items-center gap-2 text-[13.5px] font-semibold">
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${
                    product.stock === "In stock" ? "bg-green-700" : product.stock === "Low stock" ? "bg-amber-600" : "bg-zinc-400"
                  }`}
                />
                {product.stock === "In stock" && <span className="text-green-800">In stock — order before 8pm for next-day delivery</span>}
                {product.stock === "Low stock" && <span className="text-amber-800">Low stock — order soon to avoid missing out</span>}
                {product.stock === "Order in" && <span className="text-zinc-700">Available to order — ships in 3–5 working days</span>}
              </p>

              <div className="mt-5">
                <PurchasePanel product={product} variants={variants} />
              </div>
            </div>
          </div>

          {/* Details tabs */}
          <section id="reviews" aria-label="Product details" className="mt-12 scroll-mt-4 border-t border-zinc-200 pt-8">
            <ProductTabs product={product} />
          </section>

          {/* Related */}
          <section aria-label="You may also like" className="mt-12 border-t border-zinc-200 pt-8">
            <div className="mb-5 flex items-end justify-between gap-4">
              <h2 className="text-[20px] font-bold tracking-tight text-zinc-950">You may also like</h2>
              <a href="/products" className="shrink-0 border-b border-zinc-950 pb-0.5 text-[13.5px] font-semibold hover:text-zinc-600 hover:border-zinc-600">
                View all laptops →
              </a>
            </div>
            <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
