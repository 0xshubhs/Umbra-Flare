"use client";

import Link from "next/link";
import { SideNav } from "@/components/SideNav";
import { CreateAuctionForm } from "./create-auction-form";

export default function NewAuctionPage() {
  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <SideNav />
      <div className="grid-bg fixed inset-0 opacity-30" aria-hidden="true" />
      <div className="noise-overlay" aria-hidden="true" />

      <section className="relative z-10 flex min-h-screen flex-col py-24 md:py-32 pl-6 pr-6 md:pl-28 md:pr-12">
        <Link
          href="/auctions"
          className="shrink-0 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground transition-colors hover:text-accent"
        >
          &larr; All auctions
        </Link>

        <div className="mt-8 md:mt-12 shrink-0 text-center">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">Create</span>
          <h1 className="mt-4 font-sans font-black text-5xl md:text-7xl tracking-tight">NEW AUCTION</h1>
          <div className="mx-auto mt-6 w-12 h-px bg-accent/60" />
          <p className="mx-auto mt-6 max-w-lg font-mono text-xs text-muted-foreground leading-relaxed">
            Name the item, set the bid cap every bidder escrows, and choose how long bidding stays
            open. It runs as a sealed-bid Vickrey auction — highest bidder wins, pays the
            second-highest bid.
          </p>
        </div>

        <div className="mt-12 md:mt-16 flex flex-1 items-start justify-center pb-12">
          <div className="w-full max-w-xl bg-card border border-border/50 p-6 md:p-8">
            <CreateAuctionForm />
          </div>
        </div>
      </section>
    </main>
  );
}
