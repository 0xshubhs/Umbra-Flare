import { NextResponse } from "next/server";
import { decrypt } from "eciesjs";
import { isAddress } from "viem";

const TEE_SIMULATOR_PRIVATE_KEY = process.env.TEE_SIMULATOR_PRIVATE_KEY;

/// Acknowledges a sealed bid, mirroring the real FCC extension's
/// processSubmitBid: the TEE decrypts the ciphertext with its private key to
/// confirm it can actually read the bid, then discards the plaintext.
///
/// The decrypted amount is never returned, logged, or stored — it exists only
/// as a local in this function. The ciphertext itself is already durable
/// on-chain from submitBid(), so this route is an acknowledgement rather than
/// a store; /api/tee/close-auction reads the bids back from chain when it
/// computes the result.
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

    // Readable and well-formed is all we assert here; the value goes no further.
    if (plaintext.length === 0) {
      return NextResponse.json({ error: "ciphertext decrypted to an empty bid" }, { status: 400 });
    }

    return NextResponse.json({ accepted: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed to process bid";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
