export function Stars({ rating, className = "" }: { rating: number; className?: string }) {
  return (
    <span aria-label={`Rated ${rating} out of 5`} className={`flex items-center gap-0.5 text-[15px] leading-none ${className}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} aria-hidden="true" className={i < Math.round(rating) ? "text-zinc-950" : "text-zinc-300"}>
          ★
        </span>
      ))}
    </span>
  );
}
