"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { SideNav } from "@/components/SideNav";
import { AUCTION_ADDRESS, AUCTION_ABI, CONTRACTS_DEPLOYED } from "@/lib/contracts";

const PURPLE = "#FD5299";
const BG = "#0a0a0c";
const PANEL = "#111114";
const TEXT = "#f2f2f4";
const MUTED = "#8a8a92";
const BORDER = "rgba(253,82,153,0.22)";
const BORDER_STRONG = "rgba(253,82,153,0.5)";

export default function CreateAuctionPage() {
  const { address } = useAccount();
  const router = useRouter();
  const [form, setForm] = useState({ itemName: "", itemDescription: "", bidCap: "", hours: "24" });

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const handleCreate = () => {
    if (!form.itemName || !form.bidCap) return;
    writeContract({
      address: AUCTION_ADDRESS, abi: AUCTION_ABI, functionName: "createAuction",
      args: [
        form.itemName,
        form.itemDescription,
        parseUnits(form.bidCap, 6),
        BigInt(Math.round(parseFloat(form.hours) * 3600)),
      ],
    });
  };

  return (
    <div className="md:pl-[84px]" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: BG }}>
      <SideNav />
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "48px 24px", width: "100%" }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: PURPLE, marginBottom: 8 }}>New auction</div>
        <h1 style={{ fontFamily: "var(--font-outfit), sans-serif", fontSize: 28, fontWeight: 900, color: TEXT, marginBottom: 8 }}>Create a sealed-bid auction</h1>
        <p style={{ fontSize: 13.5, color: MUTED, marginBottom: 32, lineHeight: 1.6 }}>
          Bidders will escrow the bid cap you set here — bidding above it isn&apos;t
          possible, and the escrow amount is the same for everyone, so it never
          reveals anyone&apos;s real bid.
        </p>

        {confirmed ? (
          <div style={{ padding: 28, background: PANEL, border: `1px solid ${BORDER}`, textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-outfit), sans-serif", fontSize: 18, fontWeight: 900, color: TEXT, marginBottom: 8 }}>Auction created</div>
            <div style={{ fontSize: 12, color: "#6a6a70", fontFamily: "monospace", wordBreak: "break-all", marginBottom: 20 }}>{txHash}</div>
            <button onClick={() => router.push("/auctions")} style={{
              height: 44, padding: "0 24px", background: PURPLE, border: "none", color: BG, fontWeight: 800, fontSize: 13, cursor: "pointer",
            }}>
              View auctions →
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Item name</label>
              <input value={form.itemName} onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))} placeholder="Vintage Rolex"
                style={{ width: "100%", height: 44, padding: "0 12px", border: `1px solid ${BORDER_STRONG}`, background: BG, color: TEXT, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Description</label>
              <input value={form.itemDescription} onChange={(e) => setForm((f) => ({ ...f, itemDescription: e.target.value }))} placeholder="1975, automatic, papers included"
                style={{ width: "100%", height: 44, padding: "0 12px", border: `1px solid ${BORDER_STRONG}`, background: BG, color: TEXT, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Bid cap (FXRP)</label>
                <input value={form.bidCap} onChange={(e) => setForm((f) => ({ ...f, bidCap: e.target.value }))} placeholder="1000" type="number"
                  style={{ width: "100%", height: 44, padding: "0 12px", border: `1px solid ${BORDER_STRONG}`, background: BG, color: TEXT, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Duration (hours)</label>
                <input value={form.hours} onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))} type="number"
                  style={{ width: "100%", height: 44, padding: "0 12px", border: `1px solid ${BORDER_STRONG}`, background: BG, color: TEXT, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>

            {!CONTRACTS_DEPLOYED && (
              <div style={{ padding: "10px 14px", background: "rgba(240,168,64,0.1)", border: "1px solid #f0a840", fontSize: 12, color: "#f0a840" }}>
                Contract not deployed. Fill in AUCTION_ADDRESS in lib/contracts.ts.
              </div>
            )}
            {!address && (
              <div style={{ padding: "10px 14px", background: "rgba(240,168,64,0.1)", border: "1px solid #f0a840", fontSize: 12, color: "#f0a840" }}>
                Connect your wallet to create an auction.
              </div>
            )}
            {error && (
              <div style={{ padding: "10px 14px", background: "rgba(255,90,90,0.1)", border: "1px solid #ff5a5a", fontSize: 12, color: "#ff5a5a" }}>
                {(error as { shortMessage?: string }).shortMessage || error.message?.split("\n")[0]}
              </div>
            )}

            <button onClick={handleCreate} disabled={isPending || confirming || !form.itemName || !form.bidCap || !address || !CONTRACTS_DEPLOYED}
              style={{
                height: 48, border: "none", color: BG, fontSize: 15, fontWeight: 800, marginTop: 8,
                background: (isPending || confirming || !form.itemName || !form.bidCap || !address || !CONTRACTS_DEPLOYED) ? "#3a3a40" : PURPLE,
                cursor: (isPending || confirming || !form.itemName || !form.bidCap || !address || !CONTRACTS_DEPLOYED) ? "not-allowed" : "pointer",
              }}>
              {isPending ? "Confirm in wallet…" : confirming ? "Creating…" : "Create Auction →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
