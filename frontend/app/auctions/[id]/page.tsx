"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  useAccount, useChainId, useReadContract, useWriteContract,
  useWaitForTransactionReceipt, usePublicClient,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { SideNav } from "@/components/SideNav";
import { TestFunds } from "@/components/TestFunds";
import { encryptBid } from "@/lib/ecies";
import {
  AUCTION_ADDRESS, AUCTION_ABI, FXRP_ADDRESS, ERC20_ABI, CONTRACTS_DEPLOYED,
  explorerAddress,
} from "@/lib/contracts";

const PURPLE = "#FD5299";
const BG = "#0a0a0c";
const PANEL = "#111114";
const TEXT = "#f2f2f4";
const MUTED = "#8a8a92";
const BORDER = "rgba(253,82,153,0.22)";
const BORDER_STRONG = "rgba(253,82,153,0.5)";

type Auction = {
  id: bigint; seller: `0x${string}`; itemName: string; itemDescription: string;
  bidCap: bigint; endTime: bigint; status: number; winner: `0x${string}`;
  clearingPrice: bigint; bidCount: bigint;
};

function Box({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: "20px 22px", background: PANEL, border: `1px solid ${BORDER}` }}>{children}</div>;
}
function Notice({ tone, children }: { tone: "warning" | "error" | "success"; children: React.ReactNode }) {
  const colors = {
    warning: ["rgba(240,168,64,0.1)", "#f0a840"],
    error: ["rgba(255,90,90,0.1)", "#ff5a5a"],
    success: ["rgba(74,222,128,0.1)", "#4ade80"],
  }[tone];
  return <div style={{ padding: "10px 14px", background: colors[0], border: `1px solid ${colors[1]}`, fontSize: 12.5, color: colors[1] }}>{children}</div>;
}

export default function AuctionDetailPage() {
  const params = useParams();
  const auctionId = BigInt(params.id as string);
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();

  const { data: auctionData, refetch } = useReadContract({
    address: AUCTION_ADDRESS, abi: AUCTION_ABI, functionName: "getAuction", args: [auctionId],
    query: { enabled: CONTRACTS_DEPLOYED },
  });
  const auction = auctionData as Auction | undefined;

  const { data: hasBidAlready } = useReadContract({
    address: AUCTION_ADDRESS, abi: AUCTION_ABI, functionName: "hasBid",
    args: address ? [auctionId, address] : undefined,
    query: { enabled: !!address && CONTRACTS_DEPLOYED },
  });

  const [bidAmount, setBidAmount] = useState("");
  const [bidStep, setBidStep] = useState<"idle" | "approving" | "bidding" | "notifying-tee" | "done">("idle");
  const [bidError, setBidError] = useState<string | null>(null);

  const [settleStep, setSettleStep] = useState<"idle" | "closing" | "revealing" | "settling" | "done">("idle");
  const [settleError, setSettleError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<{ winner: string; clearingPrice: string } | null>(null);

  const { writeContractAsync } = useWriteContract();

  const now = Math.floor(Date.now() / 1000);
  const ended = auction ? now >= Number(auction.endTime) : false;

  const handleSubmitBid = async () => {
    if (!auction || !address || !bidAmount) return;
    setBidError(null);
    try {
      const amount = parseUnits(bidAmount, 6);
      if (amount > auction.bidCap) throw new Error("Bid cannot exceed the bid cap");
      const ciphertext = encryptBid(amount);

      setBidStep("approving");
      const approveHash = await writeContractAsync({
        address: FXRP_ADDRESS, abi: ERC20_ABI, functionName: "approve",
        args: [AUCTION_ADDRESS, auction.bidCap],
      });
      await publicClient?.waitForTransactionReceipt({ hash: approveHash });

      setBidStep("bidding");
      const bidHash = await writeContractAsync({
        address: AUCTION_ADDRESS, abi: AUCTION_ABI, functionName: "submitBid",
        args: [auctionId, ciphertext],
      });
      await publicClient?.waitForTransactionReceipt({ hash: bidHash });

      setBidStep("notifying-tee");
      const res = await fetch("/api/tee/submit-bid", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auctionId: auctionId.toString(), bidder: address, encryptedBid: ciphertext }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "TEE simulator rejected the bid");
      }

      setBidStep("done");
      refetch();
    } catch (e: unknown) {
      setBidStep("idle");
      const err = e as { shortMessage?: string; message?: string };
      setBidError(err.shortMessage || err.message || "Failed to submit bid");
    }
  };

  const handleCloseAuction = async () => {
    setSettleError(null);
    try {
      setSettleStep("closing");
      const hash = await writeContractAsync({
        address: AUCTION_ADDRESS, abi: AUCTION_ABI, functionName: "closeAuction", args: [auctionId],
      });
      await publicClient?.waitForTransactionReceipt({ hash });
      setSettleStep("idle");
      refetch();
    } catch (e: unknown) {
      setSettleStep("idle");
      const err = e as { shortMessage?: string; message?: string };
      setSettleError(err.shortMessage || err.message || "Failed to close auction");
    }
  };

  const handleRevealAndSettle = async () => {
    setSettleError(null);
    try {
      setSettleStep("revealing");
      const res = await fetch("/api/tee/close-auction", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auctionId: auctionId.toString(), chainId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "TEE simulator failed to compute a result");
      setRevealed({ winner: body.winner, clearingPrice: body.clearingPrice });

      setSettleStep("settling");
      const hash = await writeContractAsync({
        address: AUCTION_ADDRESS, abi: AUCTION_ABI, functionName: "settle",
        args: [auctionId, body.winner, BigInt(body.clearingPrice), body.signature],
      });
      await publicClient?.waitForTransactionReceipt({ hash });

      setSettleStep("done");
      refetch();
    } catch (e: unknown) {
      setSettleStep("idle");
      const err = e as { shortMessage?: string; message?: string };
      setSettleError(err.shortMessage || err.message || "Failed to settle auction");
    }
  };

  if (!CONTRACTS_DEPLOYED) {
    return (
      <div className="md:pl-[84px]" style={{ minHeight: "100vh", background: BG }}>
        <SideNav />
        <div style={{ maxWidth: 600, margin: "0 auto", padding: 48 }}>
          <Notice tone="warning">UmbraAuction not deployed yet — fill in the address in lib/contracts.ts.</Notice>
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="md:pl-[84px]" style={{ minHeight: "100vh", background: BG }}>
        <SideNav />
        <div style={{ maxWidth: 600, margin: "0 auto", padding: 48, color: MUTED }}>Loading auction #{auctionId.toString()}…</div>
      </div>
    );
  }

  const statusText = { 0: ended ? "Ready to close" : "Active", 1: "Closed — awaiting settlement", 2: "Settled" }[auction.status] ?? "Unknown";

  return (
    <div className="md:pl-[84px]" style={{ minHeight: "100vh", background: BG }}>
      <SideNav />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: PURPLE, marginBottom: 8 }}>
          Auction #{auctionId.toString()} · {statusText}
        </div>
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 30, fontWeight: 900, color: TEXT, marginBottom: 8 }}>
          {auction.itemName}
        </h1>
        <p style={{ fontSize: 14, color: MUTED, marginBottom: 28, lineHeight: 1.6 }}>{auction.itemDescription}</p>

        {auction.status === 0 && !ended && <TestFunds />}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 28 }}>
          <Box>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: MUTED, marginBottom: 6 }}>Bid cap</div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 900, color: TEXT }}>
              {Number(formatUnits(auction.bidCap, 6)).toLocaleString()} FXRP
            </div>
          </Box>
          <Box>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: MUTED, marginBottom: 6 }}>Bids</div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 900, color: TEXT }}>{auction.bidCount.toString()}</div>
          </Box>
          <Box>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: MUTED, marginBottom: 6 }}>
              {ended ? "Ended" : "Ends"}
            </div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 700, color: TEXT }}>
              {new Date(Number(auction.endTime) * 1000).toLocaleString()}
            </div>
          </Box>
        </div>

        {auction.status === 2 ? (
          <Box>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: PURPLE, marginBottom: 12 }}>Settled</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: MUTED }}>Winner</span>
              {explorerAddress(auction.winner) ? (
                <a href={explorerAddress(auction.winner)!} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 13, fontFamily: "monospace", color: PURPLE, textDecoration: "underline" }}>
                  {auction.winner.slice(0, 6)}…{auction.winner.slice(-4)} ↗
                </a>
              ) : (
                <span style={{ fontSize: 13, fontFamily: "monospace", color: TEXT }}>{auction.winner.slice(0, 6)}…{auction.winner.slice(-4)}</span>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: MUTED }}>Clearing price (2nd-highest bid)</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: PURPLE }}>{Number(formatUnits(auction.clearingPrice, 6)).toLocaleString()} FXRP</span>
            </div>
          </Box>
        ) : auction.status === 1 ? (
          <Box>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 16, lineHeight: 1.6 }}>
              Bidding is closed. Anyone can trigger settlement — this asks the TEE
              to compute the Vickrey winner from bids it holds privately, then
              submits the signed result on-chain.
            </div>
            {revealed && (
              <div style={{ marginBottom: 12 }}>
                <Notice tone="success">
                  TEE revealed: winner {revealed.winner.slice(0, 6)}…{revealed.winner.slice(-4)}, clearing price {Number(formatUnits(BigInt(revealed.clearingPrice), 6)).toLocaleString()} FXRP
                </Notice>
              </div>
            )}
            {settleError && <div style={{ marginBottom: 12 }}><Notice tone="error">{settleError}</Notice></div>}
            <button onClick={handleRevealAndSettle} disabled={settleStep !== "idle"} style={{
              width: "100%", height: 48, background: settleStep === "idle" ? PURPLE : "#3a3a40", border: "none",
              color: settleStep === "idle" ? BG : MUTED, fontWeight: 800, fontSize: 14,
              cursor: settleStep === "idle" ? "pointer" : "not-allowed",
            }}>
              {settleStep === "revealing" ? "Asking TEE for result…" : settleStep === "settling" ? "Settling on-chain…" : "Reveal & Settle →"}
            </button>
          </Box>
        ) : (
          <>
            {ended ? (
              <Box>
                <div style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}>Bidding has ended. Anyone can close the auction to move to settlement.</div>
                {settleError && <div style={{ marginBottom: 12 }}><Notice tone="error">{settleError}</Notice></div>}
                <button onClick={handleCloseAuction} disabled={settleStep !== "idle"} style={{
                  width: "100%", height: 48, background: settleStep === "idle" ? PURPLE : "#3a3a40", border: "none",
                  color: settleStep === "idle" ? BG : MUTED, fontWeight: 800, fontSize: 14,
                  cursor: settleStep === "idle" ? "pointer" : "not-allowed",
                }}>
                  {settleStep === "closing" ? "Closing…" : "Close Auction →"}
                </button>
              </Box>
            ) : (
              <Box>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: PURPLE, marginBottom: 14 }}>Place a sealed bid</div>

                {bidStep === "done" ? (
                  <Notice tone="success">
                    Bid submitted and escrowed. Your amount is encrypted — nobody, including the auction operator, can see it until the auction closes.
                  </Notice>
                ) : hasBidAlready ? (
                  <Notice tone="success">You&apos;ve already placed a bid on this auction.</Notice>
                ) : address ? (
                  <>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                      Your bid (FXRP, kept private) — up to {Number(formatUnits(auction.bidCap, 6)).toLocaleString()}
                    </label>
                    <input value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} type="number" placeholder="Amount"
                      disabled={bidStep !== "idle"}
                      style={{ width: "100%", height: 44, padding: "0 12px", border: `1px solid ${BORDER_STRONG}`, background: BG, color: TEXT, fontSize: 16, outline: "none", boxSizing: "border-box", fontWeight: 700, marginBottom: 12 }} />

                    {bidError && <div style={{ marginBottom: 12 }}><Notice tone="error">{bidError}</Notice></div>}

                    <button onClick={handleSubmitBid} disabled={bidStep !== "idle" || !bidAmount} style={{
                      width: "100%", height: 48,
                      background: (bidStep === "idle" && bidAmount) ? PURPLE : "#3a3a40",
                      border: "none", color: (bidStep === "idle" && bidAmount) ? BG : MUTED,
                      fontWeight: 800, fontSize: 14,
                      cursor: (bidStep === "idle" && bidAmount) ? "pointer" : "not-allowed",
                    }}>
                      {bidStep === "idle" ? "Encrypt & Submit Bid →"
                        : bidStep === "approving" ? "Approving FXRP escrow…"
                        : bidStep === "bidding" ? "Submitting encrypted bid…"
                        : "Notifying TEE…"}
                    </button>
                    <div style={{ fontSize: 11, color: "#6a6a70", marginTop: 10, lineHeight: 1.6 }}>
                      Your amount is ECIES-encrypted in your browser before anything is
                      sent. The transaction escrows the full bid cap regardless of what
                      you actually bid, so the on-chain amount never reveals it.
                    </div>
                  </>
                ) : (
                  <Notice tone="warning">Connect your wallet to place a bid.</Notice>
                )}
              </Box>
            )}
          </>
        )}
      </div>
    </div>
  );
}
