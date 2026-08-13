import { NextResponse } from "next/server";
import { decrypt } from "eciesjs";
import { isAddress } from "viem";
import { recordBid, bidCount } from "../_store";

const TEE_SIMULATOR_PRIVATE_KEY = process.env.TEE_SIMULATOR_PRIVATE_KEY;

/// Mimics what the real FCC extension's processSubmitBid does (see
/// extension/internal/extension/extension.go): decrypt the ciphertext with
/// the TEE's private key, store only the plaintext amount, in memory, never
/// returned to any caller including this one.
export async function POST(req: Request) {
  if (!TEE_SIMULATOR_PRIVATE_KEY) {
    return NextResponse.json({ error: "TEE_SIMULATOR_PRIVATE_KEY not configured" }, { status: 500 });
  }

  const body = await req.json();
  const { auctionId, bidder, encryptedBid } = body as {
    auctionId?: string; bidder?: string; encryptedBid?: string;
  };

  if (!auctionId || !bidder || !encryptedBid) {
    return NextResponse.json({ error: "auctionId, bidder, and encryptedBid are required" }, { status: 400 });
  }
  if (!isAddress(bidder)) {
    return NextResponse.json({ error: "invalid bidder address" }, { status: 400 });
  }

  try {
    const ciphertext = Buffer.from(encryptedBid.replace(/^0x/, ""), "hex");
    const plaintext = decrypt(TEE_SIMULATOR_PRIVATE_KEY.replace(/^0x/, ""), ciphertext);
    const amount = BigInt("0x" + Buffer.from(plaintext).toString("hex"));

    recordBid(auctionId, bidder as `0x${string}`, amount);

    return NextResponse.json({ accepted: true, bidsSoFar: bidCount(auctionId) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed to process bid";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
