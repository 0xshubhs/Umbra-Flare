"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { ERC20_ABI, FXRP_ADDRESS, MOCK_FXRP_ABI, NETWORK, explorerAddress } from "@/lib/contracts";

const PURPLE = "#FD5299";
const PANEL = "#111114";
const TEXT = "#f2f2f4";
const MUTED = "#8a8a92";
const BORDER = "rgba(253,82,153,0.22)";

const MINT_AMOUNT = parseUnits("5000", 6);

/// Test-funds bar. Bidding escrows FXRP, so without this anyone evaluating the
/// demo connects a fresh wallet, holds zero FXRP, and simply cannot bid. The
/// live demo settles in a MockFXRP with an open mint() precisely so this is
/// possible — the real FTestXRP only mints through the FAssets agent pipeline.
export function TestFunds() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [minting, setMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: balance, refetch } = useReadContract({
    address: FXRP_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const handleMint = async () => {
    if (!address) return;
    setError(null);
    setMinting(true);
    try {
      const hash = await writeContractAsync({
        address: FXRP_ADDRESS, abi: MOCK_FXRP_ABI, functionName: "mint",
        args: [address, MINT_AMOUNT],
      });
      await publicClient?.waitForTransactionReceipt({ hash });
      await refetch();
    } catch (e: unknown) {
      const err = e as { shortMessage?: string; message?: string };
      setError(err.shortMessage || err.message || "Mint failed");
    } finally {
      setMinting(false);
    }
  };

  if (!isConnected) return null;

  const shown = balance !== undefined ? Number(formatUnits(balance, 6)).toLocaleString() : "—";
  const empty = balance !== undefined && balance === 0n;

  return (
    <div style={{
      background: PANEL, border: `1px solid ${empty ? PURPLE : BORDER}`,
      padding: "14px 18px", marginBottom: 28,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{
          fontSize: 10, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.12em", color: PURPLE,
        }}>
          Test funds
        </div>

        <div style={{ fontSize: 13, color: MUTED }}>
          Balance{" "}
          <span style={{ color: TEXT, fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>
            {shown} FXRP
          </span>
        </div>

        <button
          onClick={handleMint}
          disabled={minting}
          style={{
            marginLeft: "auto", height: 34, padding: "0 16px",
            background: minting ? "#3a3a40" : PURPLE, border: "none",
            color: minting ? MUTED : "#0a0a0c", fontWeight: 800, fontSize: 12,
            cursor: minting ? "not-allowed" : "pointer",
          }}
        >
          {minting ? "Minting…" : "Get 5,000 FXRP →"}
        </button>
      </div>

      <div style={{ fontSize: 11, color: MUTED, marginTop: 8, lineHeight: 1.6 }}>
        {empty
          ? "You need FXRP to bid — bids escrow the auction's cap. Mint some free test tokens above."
          : "Bids escrow the auction's full bid cap, refunded on settlement."}
        {NETWORK === "coston2" && (
          <>
            {" "}Need C2FLR for gas?{" "}
            <a href="https://faucet.flare.network/coston2" target="_blank" rel="noopener noreferrer"
              style={{ color: PURPLE, textDecoration: "underline" }}>
              Coston2 faucet ↗
            </a>
            {explorerAddress(FXRP_ADDRESS) && (
              <>
                {" · "}
                <a href={explorerAddress(FXRP_ADDRESS)!} target="_blank" rel="noopener noreferrer"
                  style={{ color: PURPLE, textDecoration: "underline" }}>
                  Token on Blockscout ↗
                </a>
              </>
            )}
          </>
        )}
      </div>

      {error && (
        <div style={{ fontSize: 11, color: "#f87171", marginTop: 8 }}>{error}</div>
      )}
    </div>
  );
}
