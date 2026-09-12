import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

export default function ProductNotFound() {
  return (
    <div className="flex min-h-full flex-col bg-white text-zinc-900">
      <Header />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center px-4 py-20 text-center sm:px-6">
        <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-zinc-500">Product not found</p>
        <h1 className="mt-2 max-w-md text-[26px] font-bold tracking-tight text-zinc-950">
          Sorry, we couldn&apos;t find that product
        </h1>
        <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-zinc-600">
          It may have sold out or the link is out of date. Try browsing our current laptop range instead.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/products">
            <Button size="lg">Browse laptops</Button>
          </Link>
          <Link href="/">
            <Button size="lg" variant="outline">Back home</Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
