"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import {
  AUCTION_ADDRESS,
  AUCTION_ABI,
  CONTRACTS_DEPLOYED,
  explorerAddress,
  explorerTx,
} from "@/lib/contracts";

const LABEL = "block font-mono text-[10px] uppercase tracking-[0.3em] text-accent mb-3";
const INPUT =
  "w-full bg-background border border-border/40 px-4 py-3 font-mono text-sm focus:outline-none focus:border-accent/60";
const HINT = "mt-2 font-mono text-[10px] text-muted-foreground/70 leading-relaxed";

/// Duration presets, expressed in the same `hours` unit the form state and the
/// contract call already use — `createAuction` takes seconds, and the submit
/// path converts with Math.round(hours * 3600), so 0.0833 h lands on exactly
/// 300 s and 0.25 h on exactly 900 s.
const DURATION_PRESETS = [
  { label: "5 min", hours: "0.0833" },
  { label: "15 min", hours: "0.25" },
  { label: "1 hour", hours: "1" },
  { label: "6 hours", hours: "6" },
  { label: "24 hours", hours: "24" },
];

/// Keeps the plain-text inputs to a shape `parseUnits`/`parseFloat` can read:
/// digits plus at most one decimal point. The reference form filtered with a
/// bare /[^0-9.]/ strip, which lets through "1.2.3" and a lone "." — both of
/// which the submit path would choke on.
function decimalOnly(value: string): string {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const [head, ...rest] = cleaned.split(".");
  return rest.length > 0 ? `${head || "0"}.${rest.join("")}` : head;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  const hours = seconds / 3600;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(2)} h`;
}

export function CreateAuctionForm() {
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

  const disabled =
    isPending || confirming || !form.itemName || !form.bidCap || !address || !CONTRACTS_DEPLOYED;

  // Same expression the submit path uses, surfaced for the duration readout.
  const parsedHours = parseFloat(form.hours);
  const durationSec = Number.isFinite(parsedHours) ? Math.round(parsedHours * 3600) : 0;

  const contractLink = explorerAddress(AUCTION_ADDRESS);
  const txLink = txHash ? explorerTx(txHash) : null;

  if (confirmed) {
    return (
      <div className="text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">Confirmed</span>
        <h2 className="mt-4 font-sans font-black text-4xl tracking-tight">AUCTION CREATED</h2>
        <div className="mx-auto mt-6 mb-6 w-12 h-px bg-accent/60" />
        <p className="font-mono text-[10px] text-muted-foreground/70 break-all leading-relaxed">{txHash}</p>
        {txLink && (
          <a
            href={txLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground transition-colors hover:text-accent"
          >
            View on Blockscout &nearr;
          </a>
        )}
        <button
          type="button"
          onClick={() => router.push("/auctions")}
          className="mt-8 w-full border border-accent py-4 font-mono text-xs uppercase tracking-[0.3em] text-accent transition-all hover:bg-accent hover:text-accent-foreground"
        >
          View auctions &rarr;
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleCreate();
      }}
      className="space-y-8"
    >
      {!CONTRACTS_DEPLOYED && (
        <div className="border border-warning/50 bg-warning/10 p-4">
          <p className="font-mono text-xs text-warning leading-relaxed">
            Auction contract not deployed. Fill in <code>AUCTION_ADDRESS</code> in lib/contracts.ts.
          </p>
        </div>
      )}

      <div>
        <label className={LABEL}>Item name</label>
        <input
          type="text"
          maxLength={80}
          value={form.itemName}
          onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))}
          placeholder="Vintage Rolex"
          className={INPUT}
        />
      </div>

      <div>
        <label className={LABEL}>Description</label>
        <textarea
          rows={3}
          maxLength={500}
          value={form.itemDescription}
          onChange={(e) => setForm((f) => ({ ...f, itemDescription: e.target.value }))}
          placeholder="1975, automatic, papers included"
          className={`${INPUT} resize-none`}
        />
      </div>

      <div>
        <label className={LABEL}>Bid cap (FXRP)</label>
        <input
          type="text"
          inputMode="decimal"
          value={form.bidCap}
          onChange={(e) => setForm((f) => ({ ...f, bidCap: decimalOnly(e.target.value) }))}
          placeholder="1000"
          className={INPUT}
        />
        <p className={HINT}>
          Every bidder escrows exactly this much FXRP to bid, and cannot bid above it. The escrow is
          identical for everyone, so it never reveals anyone&apos;s real bid.
        </p>
      </div>

      {/* Replaces the reference layout's feature-toggle panel: Umbra has no
          toggles — sealed bidding and Vickrey pricing are how every auction
          runs — so the same slot explains the mechanism instead. */}
      <div className="border border-accent/30 bg-accent/5 p-4 space-y-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">Sealed bidding</p>

        <div className="flex items-start gap-3">
          <span className="mt-1.5 w-1.5 h-1.5 shrink-0 bg-accent" aria-hidden="true" />
          <div>
            <p className="font-mono text-xs text-foreground">Encrypted in the browser</p>
            <p className={HINT}>
              Each bid is ECIES-encrypted to the enclave&apos;s public key before it leaves the
              bidder&apos;s browser. The contract only ever stores ciphertext.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="mt-1.5 w-1.5 h-1.5 shrink-0 bg-accent" aria-hidden="true" />
          <div>
            <p className="font-mono text-xs text-foreground">Vickrey (second-price)</p>
            <p className={HINT}>
              The enclave alone decrypts the bids, then signs a result naming the winner and the
              second-highest bid as the clearing price. Losing bids stay sealed.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="mt-1.5 w-1.5 h-1.5 shrink-0 bg-accent" aria-hidden="true" />
          <div>
            <p className="font-mono text-xs text-foreground">No reveal step</p>
            <p className={HINT}>
              Bidders never come back to reveal a bid. Once submitted, there is nothing left for them
              to do.
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className={LABEL}>Duration</label>
        <div className="flex flex-wrap gap-2">
          {DURATION_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setForm((f) => ({ ...f, hours: p.hours }))}
              className={
                "px-4 py-2.5 font-mono text-xs uppercase tracking-widest border transition-colors " +
                (form.hours === p.hours
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border/40 text-muted-foreground hover:border-foreground/40 hover:text-foreground")
              }
            >
              {p.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          inputMode="decimal"
          value={form.hours}
          onChange={(e) => setForm((f) => ({ ...f, hours: decimalOnly(e.target.value) }))}
          placeholder="24"
          aria-label="Duration in hours"
          className={`${INPUT} mt-3`}
        />
        <p className={HINT}>
          Hours — or pick a preset above. Bidding closes {formatDuration(durationSec)} after this
          transaction confirms; anyone can close the auction from then on.
        </p>
      </div>

      {!address && (
        <div className="border border-warning/50 bg-warning/10 p-4">
          <p className="font-mono text-xs text-warning leading-relaxed">
            Connect your wallet to create an auction.
          </p>
        </div>
      )}

      {error && (
        <div className="border border-destructive/50 bg-destructive/10 p-4">
          <p className="font-mono text-xs text-destructive break-all">
            {(error as { shortMessage?: string }).shortMessage || error.message?.split("\n")[0]}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={disabled}
        className={
          "w-full py-4 font-mono text-xs uppercase tracking-[0.3em] border transition-all " +
          (disabled
            ? "border-border/40 text-muted-foreground/50 cursor-not-allowed"
            : "border-accent text-accent hover:bg-accent hover:text-accent-foreground")
        }
      >
        {!address
          ? "Connect wallet"
          : isPending
            ? "Confirm in wallet…"
            : confirming
              ? "Creating…"
              : "+ Create auction"}
      </button>

      {contractLink && (
        <a
          href={contractLink}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70 transition-colors hover:text-accent"
        >
          UmbraAuction on Blockscout &nearr;
        </a>
      )}
    </form>
  );
}
