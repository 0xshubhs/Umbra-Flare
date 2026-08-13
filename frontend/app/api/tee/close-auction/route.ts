import { NextResponse } from "next/server";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, encodeAbiParameters, http, keccak256, parseAbiParameters } from "viem";
import { decrypt } from "eciesjs";
import { computeVickrey, type BidRecord } from "../_vickrey";
import { AUCTION_ABI, AUCTION_ADDRESS, RPC_URL } from "../../../../lib/contracts";

const TEE_SIMULATOR_PRIVATE_KEY = process.env.TEE_SIMULATOR_PRIVATE_KEY as `0x${string}` | undefined;

/// Mimics the real FCC extension's processCloseAuction: decrypt the sealed
/// bids, compute the Vickrey winner + second-highest price, and sign a result
/// UmbraAuction.settle() can verify. The digest must match settle() exactly:
/// keccak256(abi.encode(chainId, auctionContract, auctionId, winner,
/// clearingPrice)) as an EIP-191 personal-sign message.
///
/// Ciphertexts are read back from chain rather than from process memory. The
/// chain is already the durable store for them — submitBid() writes each one
/// to bidCiphertext[auctionId][bidder], public but unreadable without the
/// TEE's key. Holding them in a module-level Map instead would break the
/// moment this runs on more than one server instance, since a bid recorded by
/// one instance would be invisible to whichever one handles the close.
/// Plaintext amounts still exist only as locals inside this function.
export async function POST(req: Request) {
  if (!TEE_SIMULATOR_PRIVATE_KEY) {
    return NextResponse.json({ error: "TEE_SIMULATOR_PRIVATE_KEY not configured" }, { status: 500 });
  }

  const body = await req.json();
  const { auctionId, chainId } = body as { auctionId?: string; chainId?: number };
  if (!auctionId || !chainId) {
    return NextResponse.json({ error: "auctionId and chainId are required" }, { status: 400 });
  }

  try {
    const client = createPublicClient({ transport: http(RPC_URL) });
    const id = BigInt(auctionId);

    const bidders = (await client.readContract({
      address: AUCTION_ADDRESS, abi: AUCTION_ABI, functionName: "getBidders", args: [id],
    })) as readonly `0x${string}`[];

    if (bidders.length === 0) {
      return NextResponse.json({ error: `no bids on auction ${auctionId}` }, { status: 400 });
    }

    const records: BidRecord[] = [];
    for (const bidder of bidders) {
      const ciphertext = (await client.readContract({
        address: AUCTION_ADDRESS, abi: AUCTION_ABI, functionName: "getBidCiphertext", args: [id, bidder],
      })) as `0x${string}`;

      const plaintext = decrypt(
        TEE_SIMULATOR_PRIVATE_KEY.replace(/^0x/, ""),
        Buffer.from(ciphertext.replace(/^0x/, ""), "hex")
      );
      records.push({ bidder, amount: BigInt("0x" + Buffer.from(plaintext).toString("hex")) });
    }

    const { winner, clearingPrice } = computeVickrey(records);

    const packed = encodeAbiParameters(
      parseAbiParameters("uint256, address, uint256, address, uint256"),
      [BigInt(chainId), AUCTION_ADDRESS, id, winner, clearingPrice]
    );
    const digest = keccak256(packed);

    const account = privateKeyToAccount(TEE_SIMULATOR_PRIVATE_KEY);
    const signature = await account.signMessage({ message: { raw: digest } });

    return NextResponse.json({
      winner,
      clearingPrice: clearingPrice.toString(),
      bidsConsidered: records.length,
      signature,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed to close auction";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
