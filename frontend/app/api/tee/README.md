# Local TEE simulator

These two routes (`/api/tee/submit-bid`, `/api/tee/close-auction`) are **not**
part of Umbra's Flare integration — they're a local stand-in for the real
registered TEE machine, used only so the demo works end-to-end without Flare's
indexer credentials (see `extension/README.md` for why real registration
isn't done here).

They implement the same logic as `extension/internal/extension/extension.go`:
decrypt bids with the TEE's private key, compute the Vickrey winner + second
price, and sign the result the same way `UmbraAuction.settle()` verifies it.

## Where the ciphertexts live

The chain, not this process. `submitBid()` already writes each ciphertext to
`bidCiphertext[auctionId][bidder]` on-chain — public, but unreadable without
the TEE's private key — so `close-auction` reads them back with
`getBidders()` + `getBidCiphertext()` and decrypts them at resolution time.

This matters beyond tidiness: an earlier version accumulated bids in a
module-level `Map`. That works on a single dev server and breaks on any
serverless or multi-instance deployment, where the instance handling
`close-auction` may never have seen the `submit-bid` calls and would resolve
the auction with zero bids. Reading from chain makes the route stateless and
horizontally scalable.

Plaintext amounts still never persist: they exist only as locals inside the
request that computes the result, and are never logged or returned.
`submit-bid` is therefore an acknowledgement — it decrypts purely to prove the
TEE can read the bid, then drops it.

## What changes in production

Only **who** signs. Here it's `TEE_SIMULATOR_PRIVATE_KEY` (a throwaway local
keypair, see `.env.local`); in production it's the real TEE machine's key, and
`UmbraAuction.trustedTeeSigner` is pointed at that address via
`setTrustedTeeSigner()`. No other code changes.
