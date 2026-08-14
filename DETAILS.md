# Umbra

Sealed-bid Vickrey auctions on Flare, with bid amounts kept private through Flare Confidential Compute.

**Bounty:** Confidential Compute Apps

---

## The problem

Calldata and contract storage are public. A sealed-bid auction written as a normal smart contract leaks every bid the instant it is submitted — the mempool and every validator see it before the transaction even confirms.

This breaks Vickrey (second-price) auctions specifically. Their entire incentive argument is *bid your true value, because you'll never pay more than the next-highest bid* — and that only holds if nobody can see anyone else's bid.

Commit-reveal is the usual workaround, but it costs a second round from every bidder and leaves a griefing hole: a bidder who realises they've lost can simply never reveal, and settlement stalls.

## How Umbra solves it

1. The bidder encrypts their bid amount client-side with ECIES (secp256k1) to the TEE's public key.
2. `submitBid()` stores that ciphertext on-chain — public, but unreadable — and escrows a **fixed bid cap** in FXRP, identical for every bidder, so the visible escrow amount reveals nothing.
3. On close, the enclave alone decrypts the bids, holds them in enclave memory, and computes the Vickrey result: winner = highest bidder, clearing price = second-highest bid.
4. It signs `(winner, clearingPrice)`. `settle()` verifies that signature against `trustedTeeSigner`, pays the seller, refunds the winner the difference, and refunds every loser in full.

**Bidders do nothing after bidding.** No reveal transaction, no second key, no permits, no decryption oracle. A losing bidder cannot stall settlement by refusing to reveal.

## What is revealed, and what never is

| | |
|---|---|
| **Revealed on settlement** | the winner's address, and the clearing price |
| **Never revealed** | the winner's own bid, and every bid below second place |

Because the clearing price *is* the runner-up's bid, that one amount becomes public — inherent to second-price mechanics, not a leak in the implementation.

Two side channels are closed deliberately:

- **Escrow amount.** Every bidder escrows the same fixed cap, never their actual bid.
- **Ciphertext length.** Bids are zero-padded to a fixed 32 bytes before encryption, so every sealed bid is exactly 129 ciphertext bytes. Encoding at natural width would have let anyone bucket a rival's bid by magnitude just by measuring `getBidCiphertext()` — a 1 FXRP bid and a 50,000 FXRP bid produce 100- and 102-byte ciphertexts.

## Target user

Anyone running a sealed-bid sale where bid privacy is what makes the mechanism honest: NFT and collectible auctions, private treasury or OTC-style sales, and grant/RFP allocation — any setting where "bid your true value" is only credible if nobody can see anyone else's bid.

## How it uses Flare

Flare Confidential Compute is the core of the product, not a bolt-on.

- `UmbraInstructionSender.sol` is the real production entry point, built against Flare's actual `ITeeExtensionRegistry` / `ITeeMachineRegistry` interfaces taken from Flare's own `fce-extension-scaffold`.
- `extension/` is a Go FCC extension implementing the `AUCTION` op type (`SUBMIT_BID`, `CLOSE_AUCTION`), structured to match that scaffold's package layout.
- Settlement is in FXRP, Flare's FAssets representation of XRP.

Registering a live TEE machine needs Flare's Coston2 indexer database credentials (obtained by contacting Flare support, per their own getting-started guide) plus governance setup — access this submission didn't have inside the hackathon window. The interactive demo therefore runs the *identical* decrypt / hold-privately / compute-Vickrey / sign logic locally, producing signatures byte-for-byte compatible with what `settle()` verifies. Pointing `trustedTeeSigner` at the registered machine address is the entire production cutover — no other code changes.

## Deployment

Flare Testnet **Coston2** (chain id 114). Both contracts are **source-verified on Blockscout**:

- `UmbraAuction` — `0x9d3ccbE19D1A6e37A9F67868ae7eE8452069d697`
- `MockFXRP` — `0x08a25a794639a6cA03b0A7C655B2c36d82fF144a`
- `trustedTeeSigner` — `0xE3Dc334a8689FCFC5e9A7590A7651768630b626D`

**Auctions #4 and #5 are open** and running through late August so judges can bid. The app has a built-in faucet button for test FXRP; C2FLR gas comes from https://faucet.flare.network/coston2

The demo settles in a MockFXRP (same 6 decimals, open `mint()`) rather than real FTestXRP, because FTestXRP only mints through the FAssets agent and collateral pipeline — a direct `mint()` reverts — which would leave judges no way to obtain bidding funds. `UmbraAuction` takes its token as a constructor argument, so this is a deploy-time choice, not a code difference; `script/Deploy.s.sol` targets the real token unchanged.

## Testing

- **`forge test` — 8/8 passing**, covering the full lifecycle: that escrow is a fixed cap regardless of the real bid, that settlement rejects a forged signature, and that the second price is charged rather than the winner's own bid.
- **Four complete rounds run against the live Coston2 deployment**, each asserting the winner, the clearing price, and all three payout balances. Example: bids of 600 and 850 FXRP → winner charged **600**, the second price. Reproducible via `frontend/scripts/e2e-coston2.mjs`.

## What was newly built during the program

**New:** `UmbraAuction.sol` (full Vickrey lifecycle, 8/8 tests), the FCC integration (`UmbraInstructionSender.sol` against Flare's real registry interfaces, plus the Go extension), all cryptography (client-side ECIES encryption, the TEE-side decrypt/compute/sign path), every auction screen's logic, and the whole Coston2 deployment and verification.

**Reused and disclosed:** the app's visual layer — the editorial layout language, its animation primitives, and the markup of the auction screens — is adapted from earlier in-house work predating this hackathon, re-themed and with all copy rewritten for Flare. That motion and layout code is not new and is not claimed as such. Nothing beneath it carried over: the earlier work used a different privacy model, so no contract, cryptography, or chain integration was reusable.

## Roadmap

- **Reserve price.** `createAuction` should take a floor below which the item doesn't sell; today a lone bidder clears at 0. This is the one economic gap between the current contract and something a seller could safely use.
- Register a real TEE machine once indexer credentials are available and point `trustedTeeSigner` at it — no other code changes needed.
- Settle in real FXRP once FAssets minting is practical for end users; already a constructor argument.
- English/ascending and first-price auction variants alongside Vickrey.
- Batch settlement plus a gas-compensation pool for whoever triggers `settle()`.
