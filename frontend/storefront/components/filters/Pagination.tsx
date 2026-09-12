export default function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (next: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  const btn =
    "flex h-10 min-w-10 items-center justify-center rounded-sm border px-2 text-[13.5px] font-semibold";

  return (
    <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        aria-label="Previous page"
        className={`${btn} border-zinc-300 text-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:border-zinc-950`}
      >
        ←
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          aria-label={`Page ${p}`}
          aria-current={p === page ? "page" : undefined}
          className={
            p === page
              ? `${btn} border-zinc-950 bg-zinc-950 text-white`
              : `${btn} border-zinc-300 text-zinc-800 hover:border-zinc-950`
          }
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
        className={`${btn} border-zinc-300 text-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:border-zinc-950`}
      >
        →
      </button>
    </nav>
  );
}
