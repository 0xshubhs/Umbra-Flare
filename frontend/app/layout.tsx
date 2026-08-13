import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit, Bebas_Neue } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Every auction screen styles its headings as "'Outfit', sans-serif" but the
// family was never actually loaded, so all of them had been silently falling
// back to system sans.
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

// Condensed display face for the editorial landing sections. Their oversized
// hero type is sized against a condensed face — without it the fallback runs
// far wider and overflows.
const bebas = Bebas_Neue({
  variable: "--font-bebas",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Umbra",
  description: "Sealed-bid Vickrey auctions on Flare, private via Flare Confidential Compute.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} ${bebas.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
