import Link from "next/link";

/// The eclipse glyph: a full ring — the auction, entirely public — with one
/// half occluded, standing for the bids nobody sees. Inherits `currentColor`,
/// so callers set the colour on the wrapper.
export function UmbraMark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Occluded half */}
      <path d="M16 5.5A10.5 10.5 0 0 1 16 26.5Z" fill="currentColor" />
      {/* The auction itself, always visible */}
      <circle cx="16" cy="16" r="10.5" stroke="currentColor" strokeWidth="1.8" fill="none" />
      {/* Inner disc straddling the terminator, so the mark still reads small */}
      <circle cx="16" cy="16" r="3.2" fill="var(--background)" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

/// Wordmark + glyph for the auction chrome.
export function UmbraLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={["inline-flex items-center gap-2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent", className]
        .filter(Boolean)
        .join(" ")}
      aria-label="Umbra — Home"
    >
      <span className="flex items-center justify-center w-9 h-9 border border-current text-muted-foreground group-hover:text-accent group-hover:border-accent transition-colors">
        <UmbraMark size={20} />
      </span>
      <span className="font-sans font-black text-xl tracking-tight text-foreground group-hover:text-accent transition-colors">
        Umbra
      </span>
    </Link>
  );
}
