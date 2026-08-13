"use client";

import Link from "next/link";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { SideNav } from "@/components/SideNav";
import { AUCTION_ADDRESS, AUCTION_ABI, CONTRACTS_DEPLOYED } from "@/lib/contracts";

const PURPLE = "#FD5299";
const BG = "#0a0a0c";
const PANEL = "#111114";
const TEXT = "#f2f2f4";
const MUTED = "#8a8a92";
const BORDER = "rgba(253,82,153,0.22)";

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
function statusColor(a: Auction, address: `0x${string}` | undefined) {
  if (a.status === 2) return a.winner.toLowerCase() === address?.toLowerCase() ? "#4ade80" : "#8a8a92";
  return PURPLE;
}

export default function MyBidsPage() {
  const { address } = useAccount();
  const auctions = useMyBids(address);

  return (
    <div className="md:pl-[84px]" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: BG }}>
      <SideNav />
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 24px", width: "100%" }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: PURPLE, marginBottom: 8 }}>My Bids</div>
        <h1 style={{ fontFamily: "var(--font-outfit), sans-serif", fontSize: 32, fontWeight: 900, color: TEXT, marginBottom: 32 }}>
          Auctions you&apos;ve bid on
        </h1>

        {!address ? (
          <div style={{ padding: 48, textAlign: "center", background: PANEL, border: `1px solid ${BORDER}`, color: MUTED }}>
            Connect your wallet to see your bids.
          </div>
        ) : !CONTRACTS_DEPLOYED ? (
          <div style={{ padding: "12px 16px", background: "rgba(240,168,64,0.1)", border: "1px solid #f0a840", fontSize: 13, color: "#f0a840" }}>
            UmbraAuction not deployed yet.
          </div>
        ) : auctions.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", background: PANEL, border: `1px solid ${BORDER}`, color: MUTED }}>
            No bids yet. <Link href="/auctions" style={{ color: PURPLE }}>Browse auctions →</Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {auctions.map((a) => (
              <Link key={a.id.toString()} href={`/auctions/${a.id.toString()}`} style={{
                display: "block", padding: "22px 24px", background: PANEL, border: `1px solid ${BORDER}`, textDecoration: "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-outfit), sans-serif", fontSize: 20, fontWeight: 800, color: TEXT }}>
                      {a.itemName || `Auction #${a.id.toString()}`}
                    </div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>Seller {a.seller.slice(0, 6)}…{a.seller.slice(-4)}</div>
                  </div>
                  <div style={{ display: "flex", gap: 24, fontSize: 12, color: MUTED, flexWrap: "wrap", alignItems: "center" }}>
                    <div>
                      <div style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10 }}>Bid cap</div>
                      <div style={{ color: TEXT, fontWeight: 700 }}>{Number(formatUnits(a.bidCap, 6)).toLocaleString()} FXRP</div>
                    </div>
                    {a.status === 2 && (
                      <div>
                        <div style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10 }}>Clearing price</div>
                        <div style={{ color: TEXT, fontWeight: 700 }}>{Number(formatUnits(a.clearingPrice, 6)).toLocaleString()} FXRP</div>
                      </div>
                    )}
                    <div>
                      <div style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10 }}>Status</div>
                      <div style={{ color: statusColor(a, address), fontWeight: 700 }}>{statusLabel(a, address)}</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
