"use client";

import { useState } from "react";
import Link from "next/link";
import { useReadContract, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { SideNav } from "@/components/SideNav";
import { TestFunds } from "@/components/TestFunds";
import { AUCTION_ADDRESS, AUCTION_ABI, CONTRACTS_DEPLOYED, HIDDEN_AUCTION_IDS, STATUS_FROM_ENUM } from "@/lib/contracts";

type Auction = {
  id: bigint; seller: `0x${string}`; itemName: string; itemDescription: string;
  bidCap: bigint; endTime: bigint; status: number; winner: `0x${string}`;
  clearingPrice: bigint; bidCount: bigint;
};

function useAuctions() {
  const { data: next } = useReadContract(
    CONTRACTS_DEPLOYED ? {
      address: AUCTION_ADDRESS, abi: AUCTION_ABI, functionName: "nextAuctionId",
    } : undefined
  );
  const total = next ? Number(next) - 1 : 0;
  const ids = Array.from({ length: Math.max(total, 0) }, (_, i) => BigInt(i + 1));

  const { data: results } = useReadContracts({
    contracts: ids.map((id) => ({
      address: AUCTION_ADDRESS, abi: AUCTION_ABI, functionName: "getAuction", args: [id],
    } as const)),
    query: { enabled: ids.length > 0 && CONTRACTS_DEPLOYED },
  });

  const auctions: Auction[] = (results ?? [])
    .map((r) => r.result as Auction | undefined)
    .filter((a): a is Auction => !!a)
    .filter((a) => !HIDDEN_AUCTION_IDS.has(a.id.toString()))
    .reverse();

  return auctions;
}

function statusLabel(status: number, endTime: bigint) {
  if (status === 0 && BigInt(Math.floor(Date.now() / 1000)) >= endTime) return "Ready to close";
  return { 0: "Active", 1: "Closed", 2: "Settled" }[status] ?? "Unknown";
}

type Phase = "live" | "ended" | "settled";

/// An auction still taking bids is "live"; one past its end time but not yet
/// paid out is "ended", whether or not the close transaction has landed.
function phase(a: Auction): Phase {
  if (a.status === 2) return "settled";
  if (a.status === 1) return "ended";
  return BigInt(Math.floor(Date.now() / 1000)) >= a.endTime ? "ended" : "live";
}

const TABS: { value: Phase | "all"; label: string }[] = [
  { value: "live", label: "Live" },
  { value: "ended", label: "Ended" },
  { value: "settled", label: "Settled" },
  { value: "all", label: "All" },
];

export default function AuctionsPage() {
  const auctions = useAuctions();
  // Defaults to Live so the auctions a visitor can actually bid on lead;
  // settled rounds stay one click away as a record of completed sales.
  const [tab, setTab] = useState<Phase | "all">("live");

  const counts = auctions.reduce<Record<string, number>>((acc, a) => {
    acc[phase(a)] = (acc[phase(a)] ?? 0) + 1;
    return acc;
  }, {});
  const shown = tab === "all" ? auctions : auctions.filter((a) => phase(a) === tab);

  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <SideNav />
      <div className="grid-bg fixed inset-0 opacity-30" aria-hidden="true" />
      <div className="noise-overlay" aria-hidden="true" />

      <section className="relative z-10 py-24 md:py-32 pl-6 pr-6 md:pl-28 md:pr-12">
        {/* Section header */}
        <div className="mb-16 flex flex-wrap items-end justify-between gap-8">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">01 / Auctions</span>
            <h1 className="mt-4 font-sans font-black text-5xl md:text-7xl tracking-tight">SEALED-BID, VICKREY</h1>
            <div className="mt-6 w-12 h-px bg-accent/60" />
            <p className="mt-6 max-w-md font-mono text-xs text-muted-foreground leading-relaxed">
              The highest bidder wins and pays the second-highest bid. Bid amounts stay in the enclave.
            </p>
          </div>

          <Link
            href="/auctions/new"
            className="group inline-flex items-center gap-3 border border-accent bg-accent px-6 py-3 font-mono text-[10px] uppercase tracking-[0.3em] text-accent-foreground transition-colors duration-300 hover:bg-transparent hover:text-accent"
          >
            Create auction
            <span className="transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
          </Link>
        </div>

        <TestFunds />

        {CONTRACTS_DEPLOYED && auctions.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.2em]">
            {TABS.map(({ value, label }) => {
              const n = value === "all" ? auctions.length : counts[value] ?? 0;
              const active = tab === value;
              return (
                <button
                  key={value}
                  onClick={() => setTab(value)}
                  className={`border px-4 py-2 transition-colors duration-300 ${
                    active
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border/50 text-muted-foreground hover:border-accent/60 hover:text-accent"
                  }`}
                >
                  {label} <span className={active ? "opacity-70" : "opacity-50"}>{n}</span>
                </button>
              );
            })}
          </div>
        )}

        {!CONTRACTS_DEPLOYED ? (
          <div className="border border-warning bg-warning/10 p-6">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-warning">Not deployed</span>
            <p className="mt-3 font-mono text-xs text-warning/90 leading-relaxed">
              UmbraAuction not deployed yet — fill in the address in{" "}
              <code className="font-mono text-warning">lib/contracts.ts</code>.
            </p>
          </div>
        ) : shown.length === 0 ? (
          <div className="bg-card border border-border/50 p-12 md:p-20 text-center">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {auctions.length === 0 ? "No auctions yet" : `No ${tab} auctions`}
            </span>
            <div className="mx-auto mt-6 mb-6 w-12 h-px bg-accent/60" />
            <p className="font-mono text-xs text-muted-foreground leading-relaxed">
              <Link href="/auctions/new" className="text-accent hover:underline underline-offset-4">
                Create one &rarr;
              </Link>
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 md:gap-8">
            {shown.map((a) => (
              <Link
                key={a.id.toString()}
                href={`/auctions/${a.id.toString()}`}
                className="group relative flex h-full flex-col bg-card border border-border/50 p-8 transition-all duration-500 hover:-translate-y-1 hover:border-accent/60"
              >
                {/* Card header: issue number + status */}
                <div className="mb-8 flex items-baseline justify-between gap-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    No. {a.id.toString().padStart(2, "0")}
                  </span>
                  <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-accent">
                    <span className="w-1.5 h-1.5 bg-current" aria-hidden="true" />
                    {statusLabel(a.status, a.endTime)}
                  </span>
                </div>

                {/* Title */}
                <h2 className="font-sans font-black text-4xl tracking-tight group-hover:text-accent transition-colors duration-300">
                  {a.itemName || `Auction #${a.id.toString()}`}
                </h2>

                {/* Divider line */}
                <div className="mt-4 mb-6 w-12 h-px bg-accent/60 group-hover:w-full transition-all duration-500" />

                <p className="font-mono text-xs text-muted-foreground leading-relaxed">{a.itemDescription}</p>

                {/* Meta row */}
                <div className="mt-8 flex flex-wrap items-end gap-10 border-t border-border/30 pt-6">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                      Bid cap
                    </div>
                    <div className="mt-2 font-sans font-black text-xl tracking-tight">
                      {Number(formatUnits(a.bidCap, 6)).toLocaleString()}{" "}
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        FXRP
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                      Bids
                    </div>
                    <div className="mt-2 font-sans font-black text-xl tracking-tight">{a.bidCount.toString()}</div>
                  </div>
                </div>

                {/* Corner rule, revealed on hover */}
                <div
                  className="pointer-events-none absolute top-0 right-0 w-12 h-12 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  aria-hidden="true"
                >
                  <div className="absolute top-0 right-0 w-full h-px bg-accent" />
                  <div className="absolute top-0 right-0 w-px h-full bg-accent" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
