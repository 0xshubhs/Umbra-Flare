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

  let winner = records[0];
  let second = 0n;
  for (const r of records) {
    if (r.amount > winner.amount) {
      second = winner.amount;
      winner = r;
    } else if (r.amount > second) {
      second = r.amount;
    }
  }
  if (records.length === 1) second = 0n;

  return { winner: winner.bidder, clearingPrice: second };
}

export function bidCount(auctionId: string): number {
  return (bidsByAuction.get(auctionId) ?? []).length;
}
