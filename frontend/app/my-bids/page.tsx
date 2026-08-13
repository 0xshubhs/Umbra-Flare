"use client";

import Link from "next/link";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { SideNav } from "@/components/SideNav";
import { AUCTION_ADDRESS, AUCTION_ABI, CONTRACTS_DEPLOYED } from "@/lib/contracts";

type Auction = {
  id: bigint; seller: `0x${string}`; itemName: string; itemDescription: string;
  bidCap: bigint; endTime: bigint; status: number; winner: `0x${string}`;
  clearingPrice: bigint; bidCount: bigint;
};

function useMyBids(address: `0x${string}` | undefined) {
  const { data: next } = useReadContract(
    CONTRACTS_DEPLOYED ? { address: AUCTION_ADDRESS, abi: AUCTION_ABI, functionName: "nextAuctionId" } : undefined
  );
  const total = next ? Number(next) - 1 : 0;
  const ids = Array.from({ length: Math.max(total, 0) }, (_, i) => BigInt(i + 1));

  const { data: hasBidResults } = useReadContracts({
    contracts: ids.map((id) => ({
      address: AUCTION_ADDRESS, abi: AUCTION_ABI, functionName: "hasBid", args: [id, address],
    } as const)),
    query: { enabled: !!address && ids.length > 0 && CONTRACTS_DEPLOYED },
  });

  const myAuctionIds = ids.filter((_, i) => hasBidResults?.[i]?.result === true);

  const { data: auctionResults } = useReadContracts({
    contracts: myAuctionIds.map((id) => ({
      address: AUCTION_ADDRESS, abi: AUCTION_ABI, functionName: "getAuction", args: [id],
    } as const)),
    query: { enabled: myAuctionIds.length > 0 && CONTRACTS_DEPLOYED },
  });

  return (auctionResults ?? [])
    .map((r) => r.result as Auction | undefined)
    .filter((a): a is Auction => !!a)
    .reverse();
}

function statusLabel(a: Auction, address: `0x${string}` | undefined) {
  if (a.status === 2) {
    return a.winner.toLowerCase() === address?.toLowerCase() ? "You won" : "Not won";
  }
  if (a.status === 1) return "Awaiting settlement";
  return BigInt(Math.floor(Date.now() / 1000)) >= a.endTime ? "Ready to close" : "Active";
}

/// Won auctions read green, everything unresolved reads accent, and a loss
/// reads muted — a loss is a non-event, since the escrow comes back in full.
function statusClass(a: Auction, address: `0x${string}` | undefined) {
  if (a.status === 2) {
    return a.winner.toLowerCase() === address?.toLowerCase() ? "text-success" : "text-muted-foreground";
  }
  return "text-accent";
}

function EmptyState({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border/50 p-12 md:p-20 text-center">
      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{label}</span>
      <div className="mx-auto mt-6 mb-6 w-12 h-px bg-accent/60" />
      <p className="font-mono text-xs text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

export default function MyBidsPage() {
  const { address } = useAccount();
  const auctions = useMyBids(address);

  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <SideNav />
      <div className="grid-bg fixed inset-0 opacity-30" aria-hidden="true" />
      <div className="noise-overlay" aria-hidden="true" />

      <section className="relative z-10 py-24 md:py-32 pl-6 pr-6 md:pl-28 md:pr-12">
        <div className="mb-16">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">02 / Portfolio</span>
          <h1 className="mt-4 font-sans font-black text-5xl md:text-7xl tracking-tight">YOUR BIDS</h1>
          <div className="mt-6 w-12 h-px bg-accent/60" />
          <p className="mt-6 max-w-md font-mono text-xs text-muted-foreground leading-relaxed">
            What you bid is never shown here, or anywhere else. Only the outcome is.
          </p>
        </div>

        {!address ? (
          <EmptyState label="Wallet not connected">Connect your wallet to see your bids.</EmptyState>
        ) : !CONTRACTS_DEPLOYED ? (
          <div className="border border-warning bg-warning/10 p-6">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-warning">Not deployed</span>
            <p className="mt-3 font-mono text-xs text-warning/90 leading-relaxed">UmbraAuction not deployed yet.</p>
          </div>
        ) : auctions.length === 0 ? (
          <EmptyState label="No bids yet">
            <Link href="/auctions" className="text-accent hover:underline underline-offset-4">
              Browse auctions &rarr;
            </Link>
          </EmptyState>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 md:gap-8">
            {auctions.map((a) => (
              <Link
                key={a.id.toString()}
                href={`/auctions/${a.id.toString()}`}
                className="group relative flex h-full flex-col bg-card border border-border/50 p-8 transition-all duration-500 hover:-translate-y-1 hover:border-accent/60"
              >
                <div className="mb-8 flex items-baseline justify-between gap-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    No. {a.id.toString().padStart(2, "0")}
                  </span>
                  <span className={`inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest ${statusClass(a, address)}`}>
                    <span className="w-1.5 h-1.5 bg-current" aria-hidden="true" />
                    {statusLabel(a, address)}
                  </span>
                </div>

                <h2 className="font-sans font-black text-4xl tracking-tight group-hover:text-accent transition-colors duration-300">
                  {a.itemName || `Auction #${a.id.toString()}`}
                </h2>

                <div className="mt-4 mb-6 w-12 h-px bg-accent/60 group-hover:w-full transition-all duration-500" />

                <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                  Seller {a.seller.slice(0, 6)}&hellip;{a.seller.slice(-4)}
                </p>

                <div className="mt-8 flex flex-wrap items-end gap-10 border-t border-border/30 pt-6">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                      You escrowed
                    </div>
                    <div className="mt-2 font-sans font-black text-xl tracking-tight">
                      {Number(formatUnits(a.bidCap, 6)).toLocaleString()}{" "}
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">FXRP</span>
                    </div>
                  </div>

                  {a.status === 2 && (
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                        Cleared at
                      </div>
                      <div className="mt-2 font-sans font-black text-xl tracking-tight">
                        {Number(formatUnits(a.clearingPrice, 6)).toLocaleString()}{" "}
                        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">FXRP</span>
                      </div>
                    </div>
                  )}
                </div>

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
