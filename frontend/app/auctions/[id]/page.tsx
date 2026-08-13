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

type Auction = {
  id: bigint; seller: `0x${string}`; itemName: string; itemDescription: string;
  bidCap: bigint; endTime: bigint; status: number; winner: `0x${string}`;
  clearingPrice: bigint; bidCount: bigint;
};

/// Editorial page shell: fixed SideNav eats 84px on md+, so the content column
/// starts past it.
const PAGE = "relative py-32 pl-6 md:pl-28 pr-6 md:pr-12";
const EYEBROW = "font-mono text-[10px] uppercase tracking-[0.3em] text-accent";
const META = "font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground";
const BODY = "font-mono text-xs text-muted-foreground leading-relaxed";
const RULE = "w-12 h-px bg-accent/60";
const BUTTON =
  "w-full h-14 bg-accent text-accent-foreground font-mono text-xs font-bold uppercase tracking-widest " +
  "cursor-pointer transition-colors hover:bg-accent/85 " +
  "disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed disabled:hover:bg-muted";

function Box({ children }: { children: React.ReactNode }) {
  return <div className="bg-card border border-border/50 p-8">{children}</div>;
}
function Notice({ tone, children }: { tone: "warning" | "error" | "success"; children: React.ReactNode }) {
  const toneClass = {
    warning: "border-warning/60 bg-warning/10 text-warning",
    error: "border-destructive/60 bg-destructive/10 text-destructive",
    success: "border-success/60 bg-success/10 text-success",
  }[tone];
  return <div className={`border px-4 py-3 font-mono text-xs leading-relaxed ${toneClass}`}>{children}</div>;
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
      <div className="min-h-screen bg-background text-foreground">
        <SideNav />
        <main className={PAGE}>
          <div className="max-w-2xl">
            <span className={EYEBROW}>Umbra / Auction</span>
            <h1 className="mt-4 font-sans font-black text-5xl md:text-7xl tracking-tight">NOT DEPLOYED</h1>
            <div className={`${RULE} my-8`} />
            <Notice tone="warning">UmbraAuction not deployed yet — fill in the address in lib/contracts.ts.</Notice>
          </div>
        </main>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SideNav />
        <main className={PAGE}>
          <div className="max-w-2xl">
            <span className={EYEBROW}>Umbra / Auction #{auctionId.toString()}</span>
            <h1 className="mt-4 font-sans font-black text-5xl md:text-7xl tracking-tight">LOADING</h1>
            <div className={`${RULE} my-8`} />
            <p className={BODY}>Loading auction #{auctionId.toString()}…</p>
          </div>
        </main>
      </div>
    );
  }

  const statusText = { 0: ended ? "Ready to close" : "Active", 1: "Closed — awaiting settlement", 2: "Settled" }[auction.status] ?? "Unknown";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SideNav />
      <main className={PAGE}>
        {/* Masthead */}
        <header className="mb-16 max-w-4xl">
          <span className={EYEBROW}>
            Auction #{auctionId.toString()} / {statusText}
          </span>
          <h1 className="mt-4 font-sans font-black text-5xl md:text-7xl tracking-tight break-words">
            {auction.itemName}
          </h1>
          <div className={`${RULE} my-8`} />
          <p className={`${BODY} max-w-2xl`}>{auction.itemDescription}</p>
        </header>

        {auction.status === 0 && !ended && (
          <div className="mb-12 max-w-2xl">
            <TestFunds />
          </div>
        )}

        {/* Ledger strip */}
        <div className="mb-12 grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 max-w-4xl">
          <Box>
            <div className={META}>Bid cap</div>
            <div className="mt-4 font-sans font-black text-2xl md:text-3xl tracking-tight">
              {Number(formatUnits(auction.bidCap, 6)).toLocaleString()} FXRP
            </div>
          </Box>
          <Box>
            <div className={META}>Bids</div>
            <div className="mt-4 font-sans font-black text-2xl md:text-3xl tracking-tight">{auction.bidCount.toString()}</div>
          </Box>
          <Box>
            <div className={META}>{ended ? "Ended" : "Ends"}</div>
            <div className="mt-4 font-sans font-black text-base md:text-lg tracking-tight leading-snug">
              {new Date(Number(auction.endTime) * 1000).toLocaleString()}
            </div>
          </Box>
        </div>

        <div className="max-w-2xl">
          {auction.status === 2 ? (
            <Box>
              <span className={EYEBROW}>Result</span>
              <h2 className="mt-4 font-sans font-black text-4xl tracking-tight">SETTLED</h2>
              <div className={`${RULE} mt-6 mb-8`} />

              <div className="flex items-baseline justify-between gap-6 border-b border-border/40 pb-4">
                <span className={META}>Winner</span>
                {explorerAddress(auction.winner) ? (
                  <a
                    href={explorerAddress(auction.winner)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-accent underline underline-offset-4 hover:text-accent/80 transition-colors"
                  >
                    {auction.winner.slice(0, 6)}…{auction.winner.slice(-4)} ↗
                  </a>
                ) : (
                  <span className="font-mono text-xs text-foreground">
                    {auction.winner.slice(0, 6)}…{auction.winner.slice(-4)}
                  </span>
                )}
              </div>

              <div className="mt-6 flex items-baseline justify-between gap-6">
                <span className={META}>Clearing price — 2nd-highest bid</span>
                <span className="font-sans font-black text-2xl tracking-tight text-accent whitespace-nowrap">
                  {Number(formatUnits(auction.clearingPrice, 6)).toLocaleString()} FXRP
                </span>
              </div>
            </Box>
          ) : auction.status === 1 ? (
            <Box>
              <span className={EYEBROW}>Phase 03 / Settlement</span>
              <h2 className="mt-4 font-sans font-black text-4xl tracking-tight">REVEAL &amp; SETTLE</h2>
              <div className={`${RULE} mt-6 mb-6`} />

              <p className={`${BODY} mb-8`}>
                Bidding is closed. Anyone can trigger settlement — this asks the TEE
                to compute the Vickrey winner from bids it holds privately, then
                submits the signed result on-chain.
              </p>

              {revealed && (
                <div className="mb-4">
                  <Notice tone="success">
                    TEE revealed: winner {revealed.winner.slice(0, 6)}…{revealed.winner.slice(-4)}, clearing price {Number(formatUnits(BigInt(revealed.clearingPrice), 6)).toLocaleString()} FXRP
                  </Notice>
                </div>
              )}
              {settleError && <div className="mb-4"><Notice tone="error">{settleError}</Notice></div>}

              <button onClick={handleRevealAndSettle} disabled={settleStep !== "idle"} className={BUTTON}>
                {settleStep === "revealing" ? "Asking TEE for result…" : settleStep === "settling" ? "Settling on-chain…" : "Reveal & Settle →"}
              </button>
            </Box>
          ) : (
            <>
              {ended ? (
                <Box>
                  <span className={EYEBROW}>Phase 02 / Close</span>
                  <h2 className="mt-4 font-sans font-black text-4xl tracking-tight">BIDDING ENDED</h2>
                  <div className={`${RULE} mt-6 mb-6`} />

                  <p className={`${BODY} mb-8`}>Bidding has ended. Anyone can close the auction to move to settlement.</p>
                  {settleError && <div className="mb-4"><Notice tone="error">{settleError}</Notice></div>}

                  <button onClick={handleCloseAuction} disabled={settleStep !== "idle"} className={BUTTON}>
                    {settleStep === "closing" ? "Closing…" : "Close Auction →"}
                  </button>
                </Box>
              ) : (
                <Box>
                  <span className={EYEBROW}>Phase 01 / Sealed Bid</span>
                  <h2 className="mt-4 font-sans font-black text-4xl tracking-tight">PLACE A BID</h2>
                  <div className={`${RULE} mt-6 mb-6`} />

                  {bidStep === "done" ? (
                    <Notice tone="success">
                      Bid submitted and escrowed. Your amount is encrypted — nobody, including the auction operator, can see it until the auction closes.
                    </Notice>
                  ) : hasBidAlready ? (
                    <Notice tone="success">You&apos;ve already placed a bid on this auction.</Notice>
                  ) : address ? (
                    <>
                      <label htmlFor="bid-amount" className={`${META} block mb-3`}>
                        Your bid (FXRP, kept private) — up to {Number(formatUnits(auction.bidCap, 6)).toLocaleString()}
                      </label>
                      <input
                        id="bid-amount"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        type="number"
                        placeholder="Amount"
                        disabled={bidStep !== "idle"}
                        className="w-full h-14 px-4 mb-4 bg-background border border-border-strong text-foreground font-mono text-lg outline-none transition-colors focus:border-accent placeholder:text-muted-foreground/60 disabled:opacity-50 disabled:cursor-not-allowed"
                      />

                      {bidError && <div className="mb-4"><Notice tone="error">{bidError}</Notice></div>}

                      <button onClick={handleSubmitBid} disabled={bidStep !== "idle" || !bidAmount} className={BUTTON}>
                        {bidStep === "idle" ? "Encrypt & Submit Bid →"
                          : bidStep === "approving" ? "Approving FXRP escrow…"
                          : bidStep === "bidding" ? "Submitting encrypted bid…"
                          : "Notifying TEE…"}
                      </button>

                      <p className={`${BODY} mt-6 text-muted-foreground/70`}>
                        Your amount is ECIES-encrypted in your browser before anything is
                        sent. The transaction escrows the full bid cap regardless of what
                        you actually bid, so the on-chain amount never reveals it.
                      </p>
                    </>
                  ) : (
                    <Notice tone="warning">Connect your wallet to place a bid.</Notice>
                  )}
                </Box>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
