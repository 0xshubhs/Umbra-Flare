import { NextResponse } from "next/server";
import { privateKeyToAccount } from "viem/accounts";
import {
  createPublicClient, createWalletClient, defineChain, encodeAbiParameters,
  fallback, http, keccak256, parseAbiParameters,
} from "viem";
import { decrypt } from "eciesjs";
import { computeVickrey, type BidRecord } from "../_vickrey";
import { AUCTION_ABI, AUCTION_ADDRESS, RPC_FALLBACKS } from "../../../../lib/contracts";

const coston2 = defineChain({
  id: 114,
  name: "Coston2",
  nativeCurrency: { decimals: 18, name: "C2FLR", symbol: "C2FLR" },
  rpcUrls: { default: { http: [RPC_FALLBACKS[0]] } },
});

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
    // fallback() rotates to the next endpoint when one errors or rate-limits,
    // so a throttled public RPC can't strand an auction mid-settlement.
    const client = createPublicClient({
      transport: fallback(RPC_FALLBACKS.map((url) => http(url)), { rank: false }),
    });
    const id = BigInt(auctionId);
    const account = privateKeyToAccount(TEE_SIMULATOR_PRIVATE_KEY);

    const bidders = (await client.readContract({
      address: AUCTION_ADDRESS, abi: AUCTION_ABI, functionName: "getBidders", args: [id],
    })) as readonly `0x${string}`[];

    if (bidders.length === 0) {
      return NextResponse.json({ error: `no bids on auction ${auctionId}` }, { status: 400 });
    }

    // closeAuction() is a pure time-gated state flip — no secret, no
    // computation, and permissionless — so the enclave can perform it itself
    // rather than making a bidder send a separate transaction first. The
    // contract still enforces that endTime has passed, so this can only ever
    // do what anyone else could have done at the same moment.
    const auction = (await client.readContract({
      address: AUCTION_ADDRESS, abi: AUCTION_ABI, functionName: "getAuction", args: [id],
    })) as { status: number; endTime: bigint };

    let closedByTee = false;
    if (auction.status === 0) {
      const now = BigInt(Math.floor(Date.now() / 1000));
      if (now < auction.endTime) {
        return NextResponse.json(
          { error: `auction ${auctionId} is still accepting bids` },
          { status: 400 }
        );
      }
      const wallet = createWalletClient({
        account, chain: coston2,
        transport: fallback(RPC_FALLBACKS.map((url) => http(url)), { rank: false }),
      });
      const hash = await wallet.writeContract({
        address: AUCTION_ADDRESS, abi: AUCTION_ABI, functionName: "closeAuction", args: [id],
      });
      await client.waitForTransactionReceipt({ hash });
      closedByTee = true;
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

    const signature = await account.signMessage({ message: { raw: digest } });

    return NextResponse.json({
      closedByTee,
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
