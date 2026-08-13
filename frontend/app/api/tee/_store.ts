// In-memory bid store for the local TEE simulator — deliberately not
// persisted anywhere. Plaintext bid amounts live only in this process's
// memory, exactly like they'd live only inside a real TEE's enclave memory.
// Restarting the dev server forgets all bids, same as a real TEE machine
// forgets everything on reboot (it has no durable state by design).

type BidRecord = { bidder: `0x${string}`; amount: bigint };

const bidsByAuction = new Map<string, BidRecord[]>();
const seenBidders = new Map<string, Set<string>>();
const closedAuctions = new Set<string>();

export function recordBid(auctionId: string, bidder: `0x${string}`, amount: bigint) {
  if (closedAuctions.has(auctionId)) {
    throw new Error(`auction ${auctionId} already closed`);
  }
  const seen = seenBidders.get(auctionId) ?? new Set<string>();
  if (seen.has(bidder.toLowerCase())) {
    throw new Error(`bidder ${bidder} already bid on auction ${auctionId}`);
  }
  seen.add(bidder.toLowerCase());
  seenBidders.set(auctionId, seen);

  const list = bidsByAuction.get(auctionId) ?? [];
  list.push({ bidder, amount });
  bidsByAuction.set(auctionId, list);
}

/// Vickrey (second-price): highest bidder wins, pays the second-highest bid.
/// A sole bidder clears at 0 (nothing to compare against) — the same
/// fallback UmbraAuction's Foundry tests exercise.
export function closeAndComputeWinner(auctionId: string): { winner: `0x${string}`; clearingPrice: bigint } {
  const records = bidsByAuction.get(auctionId) ?? [];
  if (records.length === 0) {
    throw new Error(`no bids recorded for auction ${auctionId}`);
  }
  closedAuctions.add(auctionId);

  // Single pass, order-independent: `winner` is null until the first record
  // is seen, so that record never gets compared against itself as if it
  // were already the max (that bug would make clearingPrice equal the
  // winner's own bid instead of the true second-highest).
  let winner: BidRecord | null = null;
  let second = 0n;
  for (const r of records) {
    if (winner === null || r.amount > winner.amount) {
      if (winner !== null && winner.amount > second) second = winner.amount;
      winner = r;
    } else if (r.amount > second) {
      second = r.amount;
    }
  }

  return { winner: winner!.bidder, clearingPrice: second };
}

export function bidCount(auctionId: string): number {
  return (bidsByAuction.get(auctionId) ?? []).length;
}
