import Link from "next/link";

/// Wordmark + glyph for the auction chrome. The mark is an eclipse — an
/// occluding disc over a ring — for a product whose whole job is keeping a
/// number hidden while still settling on it.
export function UmbraLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={[
        "inline-flex items-center gap-2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Umbra — Home"
    >
      <span className="flex items-center justify-center w-9 h-9 border border-current text-muted-foreground group-hover:text-accent group-hover:border-accent transition-colors">
        <svg
          width="20"
          height="20"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
          aria-hidden
        >
          {/* Ring: the auction, fully public */}
          <circle cx="16" cy="16" r="10.5" stroke="currentColor" strokeWidth="1.8" fill="none" />
          {/* Umbra: the occluding disc — the part nobody sees behind */}
          <path d="M16 5.5a10.5 10.5 0 0 1 0 21a10.5 10.5 0 0 0 0-21Z" fill="currentColor" />
          <circle cx="16" cy="16" r="3" fill="currentColor" />
        </svg>
      </span>
      <span className="font-sans font-black text-xl tracking-tight text-foreground group-hover:text-accent transition-colors">
        Umbra
      </span>
    </Link>
  );
}
