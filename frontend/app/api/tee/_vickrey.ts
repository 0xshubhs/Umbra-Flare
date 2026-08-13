// Vickrey (second-price) resolution over decrypted bids.
//
// Deliberately pure and stateless: it takes plaintext amounts, returns a
// winner and a clearing price, and keeps nothing. The plaintext bids exist
// only as locals in the caller's request scope — mirroring a real TEE, where
// they live in enclave memory for the duration of the computation and are
// never persisted, logged, or returned.

export type BidRecord = { bidder: `0x${string}`; amount: bigint };

/// Highest bidder wins and pays the second-highest bid. A sole bidder clears
/// at 0 (nothing to compare against) — the same fallback UmbraAuction's
/// Foundry tests exercise.
export function computeVickrey(records: BidRecord[]): {
  winner: `0x${string}`;
  clearingPrice: bigint;
} {
  if (records.length === 0) {
    throw new Error("no bids to resolve");
  }

  // Single pass, order-independent: `winner` is null until the first record
  // is seen, so that record never gets compared against itself as if it were
  // already the max (that bug would make clearingPrice equal the winner's own
  // bid instead of the true second-highest).
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
