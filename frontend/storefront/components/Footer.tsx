const shopLinks = [
  "TVs & Projectors",
  "Laptops & Computers",
  "Audio & Hi-Fi",
  "Mobile & Wearables",
  "Large Appliances",
  "Small Appliances",
  "Smart Home",
  "Gaming",
];

const helpLinks = [
  "Track my order",
  "Delivery options",
  "Returns & refunds",
  "Repairs & support",
  "Extended guarantees",
  "Buying guides",
];

const aboutLinks = [
  "Our stores",
  "Careers",
  "Trade accounts",
  "Student discount",
  "Press office",
  "Sustainability & recycling",
];

export default function Footer() {
  return (
    <footer className="bg-zinc-950 text-zinc-300">
      {/* Service strip */}
      <div className="border-b border-zinc-800">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 text-[13px] sm:px-6 lg:grid-cols-4">
          {[
            ["Free UK delivery", "On all orders over £50"],
            ["2-year guarantee", "Included as standard"],
            ["30-day returns", "No quibbles, no fuss"],
            ["Rated Excellent", "4.8/5 from 120,000+ reviews"],
          ].map(([title, sub]) => (
            <div key={title} className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-zinc-700 text-[15px] font-bold text-white">
                ✓
              </span>
              <span>
                <span className="block text-[14px] font-semibold text-white">{title}</span>
                <span className="text-zinc-400">{sub}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Link columns */}
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
        <div>
          <h3 className="mb-4 text-[12px] font-bold uppercase tracking-[0.12em] text-zinc-500">Shop</h3>
          <ul className="space-y-2.5 text-[14px]">
            {shopLinks.map((l) => (
              <li key={l}><a href="#" className="hover:text-white hover:underline">{l}</a></li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-[12px] font-bold uppercase tracking-[0.12em] text-zinc-500">Help</h3>
          <ul className="space-y-2.5 text-[14px]">
            {helpLinks.map((l) => (
              <li key={l}><a href="#" className="hover:text-white hover:underline">{l}</a></li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-[12px] font-bold uppercase tracking-[0.12em] text-zinc-500">About Volt</h3>
          <ul className="space-y-2.5 text-[14px]">
            {aboutLinks.map((l) => (
              <li key={l}><a href="#" className="hover:text-white hover:underline">{l}</a></li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-[12px] font-bold uppercase tracking-[0.12em] text-zinc-500">Stay in the loop</h3>
          <p className="mb-4 text-[13.5px] leading-relaxed text-zinc-400">
            Price drops, exclusive deals and buying advice. No spam.
          </p>
          <form action="#" className="flex">
            <label htmlFor="newsletter-email" className="sr-only">Email address</label>
            <input
              id="newsletter-email"
              type="email"
              required
              placeholder="Email address"
              className="h-10 w-full rounded-l-sm border border-zinc-700 bg-zinc-900 px-3 text-[14px] text-white placeholder:text-zinc-500 focus:border-white focus:outline-none"
            />
            <button type="submit" className="h-10 shrink-0 rounded-r-sm bg-white px-4 text-[14px] font-semibold text-zinc-950 hover:bg-zinc-200">
              Sign up
            </button>
          </form>
          <p className="mt-4 text-[12px] leading-relaxed text-zinc-500">
            Pay with Visa, Mastercard, Amex, PayPal, Klarna or 0% finance.
          </p>
        </div>
      </div>

      {/* Legal bar */}
      <div className="border-t border-zinc-800">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-[12.5px] text-zinc-500 sm:px-6 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Volt Electricals Ltd. Registered in England No. 04123456. VAT No. GB 123 4567 89. Prices include VAT.</p>
          <nav className="flex flex-wrap gap-x-5 gap-y-1" aria-label="Legal">
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Cookies</a>
            <a href="#" className="hover:text-white">Modern Slavery</a>
            <a href="#" className="hover:text-white">Accessibility</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
