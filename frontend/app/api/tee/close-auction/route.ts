import { NextResponse } from "next/server";
import { privateKeyToAccount } from "viem/accounts";
import { encodeAbiParameters, keccak256, parseAbiParameters } from "viem";
import { closeAndComputeWinner } from "../_store";
import { AUCTION_ADDRESS } from "../../../../lib/contracts";

const TEE_SIMULATOR_PRIVATE_KEY = process.env.TEE_SIMULATOR_PRIVATE_KEY as `0x${string}` | undefined;

/// Mimics what the real FCC extension's processCloseAuction does: compute the
/// Vickrey winner + second-highest price over privately held bids, then sign
/// a result UmbraAuction.settle() can verify. The digest construction must
/// match UmbraAuction.sol's settle() exactly: keccak256(abi.encode(chainId,
/// auctionContract, auctionId, winner, clearingPrice)) as an EIP-191 message.
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
    const { winner, clearingPrice } = closeAndComputeWinner(auctionId);

    const packed = encodeAbiParameters(
      parseAbiParameters("uint256, address, uint256, address, uint256"),
      [BigInt(chainId), AUCTION_ADDRESS, BigInt(auctionId), winner, clearingPrice]
    );
    const digest = keccak256(packed);

    const account = privateKeyToAccount(TEE_SIMULATOR_PRIVATE_KEY);
    const signature = await account.signMessage({ message: { raw: digest } });

    return NextResponse.json({
      winner,
      clearingPrice: clearingPrice.toString(),
      signature,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed to close auction";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
