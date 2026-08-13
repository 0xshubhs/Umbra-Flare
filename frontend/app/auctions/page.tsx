"use client";

import Link from "next/link";
import { useReadContract, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { NavBar } from "@/components/NavBar";
import { AUCTION_ADDRESS, AUCTION_ABI, CONTRACTS_DEPLOYED, STATUS_FROM_ENUM } from "@/lib/contracts";

const PURPLE = "#b98cf0";
const BG = "#0a0a0c";
const PANEL = "#111114";
const TEXT = "#f2f2f4";
const MUTED = "#8a8a92";
const BORDER = "rgba(185,140,240,0.22)";

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
    .reverse();

  return auctions;
}

function statusLabel(status: number, endTime: bigint) {
  if (status === 0 && BigInt(Math.floor(Date.now() / 1000)) >= endTime) return "Ready to close";
  return { 0: "Active", 1: "Closed", 2: "Settled" }[status] ?? "Unknown";
}

export default function AuctionsPage() {
  const auctions = useAuctions();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: BG }}>
      <NavBar />
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 24px", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: PURPLE, marginBottom: 8 }}>Auctions</div>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 32, fontWeight: 900, color: TEXT }}>Sealed-bid, Vickrey</h1>
          </div>
          <Link href="/auctions/new" style={{
            height: 40, padding: "0 20px", background: PURPLE, color: BG, fontWeight: 700, fontSize: 13,
            display: "inline-flex", alignItems: "center", textDecoration: "none",
          }}>
            + Create auction
          </Link>
        </div>

        {!CONTRACTS_DEPLOYED ? (
          <div style={{ padding: "12px 16px", background: "rgba(240,168,64,0.1)", border: "1px solid #f0a840", fontSize: 13, color: "#f0a840" }}>
            UmbraAuction not deployed yet — fill in the address in <code>lib/contracts.ts</code>.
          </div>
        ) : auctions.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", background: PANEL, border: `1px solid ${BORDER}`, color: MUTED }}>
            No auctions yet. <Link href="/auctions/new" style={{ color: PURPLE }}>Create the first one →</Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {auctions.map((a) => (
              <Link key={a.id.toString()} href={`/auctions/${a.id.toString()}`} style={{
                display: "block", padding: "22px 24px", background: PANEL, border: `1px solid ${BORDER}`, textDecoration: "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 800, color: TEXT }}>
                      {a.itemName || `Auction #${a.id.toString()}`}
                    </div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>{a.itemDescription}</div>
                  </div>
                  <div style={{ display: "flex", gap: 24, fontSize: 12, color: MUTED, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10 }}>Bid cap</div>
                      <div style={{ color: TEXT, fontWeight: 700 }}>{Number(formatUnits(a.bidCap, 6)).toLocaleString()} FXRP</div>
                    </div>
                    <div>
                      <div style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10 }}>Bids</div>
                      <div style={{ color: TEXT, fontWeight: 700 }}>{a.bidCount.toString()}</div>
                    </div>
                    <div>
                      <div style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10 }}>Status</div>
                      <div style={{ color: PURPLE, fontWeight: 700 }}>{statusLabel(a.status, a.endTime)}</div>
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
