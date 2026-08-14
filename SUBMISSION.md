# Umbra — Submission

**Bounty**: Confidential Compute Apps

## Short description

Umbra runs sealed-bid Vickrey (second-price) auctions settled in FXRP. Bidders encrypt their bid client-side to a TEE's public key; the TEE alone decrypts and compares bids, computing the winner and the second-highest price. Only that pair is ever disclosed on-chain — every individual bid, including the winner's own true bid, stays private forever.

## Target user

Anyone running a sealed-bid sale where bid privacy matters for the mechanism to work honestly: NFT/collectible auctions, private treasury or OTC-style sales, grant/RFP allocation — any setting where a Vickrey auction's core promise (bid your true value) is only credible if nobody can see anyone else's bid.

## Demo

- App: [fill in deployed URL]
- Local: `cd frontend && npm install && npm run dev`, browse `/auctions`, create one at `/auctions/new`

**Verified end-to-end on live Coston2**, not just locally. Auction #1 on
`0x9d3c…d697` ran the complete flow with two real bidders:

| | |
|---|---|
| bidder A bid | 600 FXRP (encrypted client-side) |
| bidder B bid | 850 FXRP (encrypted client-side) |
| TEE result | winner = bidder B, clearing price = **600** |
| seller received | 600 FXRP |
| winner refunded | 400 FXRP (bid cap 1000 − price 600) |
| loser refunded | 1000 FXRP in full |
| settlement tx | [`0xd1ee3890…f956f0`](https://coston2-explorer.flare.network/tx/0xd1ee3890a5aca7db3854d06655e9238a3e757811910b5fa8a3435cb1bdf956f0) |

The winner bid 850 and paid 600 — the second-highest bid — which is the whole
point of Vickrey, and neither amount was ever readable on-chain. Reproduce it
with `node frontend/scripts/e2e-coston2.mjs <auctionId>`, which asserts all
eight of those properties against the live chain.

## GitHub

https://github.com/ayushsingh82/Umbra-Flare

## How it uses Flare

- **Flare Confidential Compute (FCC)** — `UmbraInstructionSender.sol` is the real production entry point, built against Flare's actual `ITeeExtensionRegistry`/`ITeeMachineRegistry` interfaces (pulled directly from Flare's `fce-extension-scaffold` repo). `extension/` is a real Go FCC extension implementing the `AUCTION` op type (`SUBMIT_BID`, `CLOSE_AUCTION`), structured to match that scaffold's exact package layout.
- Registering a live TEE machine needs Flare's Coston2 indexer database credentials (obtained by contacting Flare support, per their own getting-started guide) plus governance setup — access this submission doesn't have within the hackathon window. So the interactive demo runs the *identical* decrypt/hold-privately/compute-Vickrey/sign logic locally (`frontend/app/api/tee/*`), verified to produce byte-for-byte compatible signatures with what `UmbraAuction.settle()` verifies. Swapping `trustedTeeSigner` from that local key to the real registered TEE machine address is the entire production cutover — no other code changes.

## What's new, and what pre-dates the hackathon

**Built new during the hackathon (all of the substance):**

- `UmbraAuction.sol` — the entire Vickrey auction lifecycle: create, sealed bid
  with fixed-cap escrow, close, signature-verified settlement, payouts. 8/8 tests.
- The real FCC integration — `UmbraInstructionSender.sol` against Flare's actual
  `ITeeExtensionRegistry`/`ITeeMachineRegistry` interfaces, plus `extension/`, a
  Go FCC extension implementing the `AUCTION` op type.
- All cryptography — client-side ECIES bid encryption (`lib/ecies.ts`), the TEE
  simulator that decrypts and computes the Vickrey result (`app/api/tee/*`), and
  the signing scheme `settle()` verifies.
- Every auction screen's logic — list, create, detail (bid/close/settle), my-bids,
  test-funds faucet — and the whole Coston2 deployment + verification.

**Pre-existing, reused and disclosed:** the app's *visual* layer — the
editorial layout language, its animation primitives, and the markup of the
auction screens — is adapted from earlier in-house work that predates this
hackathon, re-themed and with every word of copy rewritten for Flare. That
motion and layout code is not new and is not claimed as such. Everything
beneath it is: the earlier work used a different privacy model entirely, so no
contract, cryptography, or chain integration carried over.

## Smart contracts

Deployed and live on **Flare Testnet Coston2** (chain id 114). Both contracts
are **source-verified on Blockscout** — the code is readable on the explorer:

| Contract | Address |
|---|---|
| `UmbraAuction` | [`0x9d3ccbE19D1A6e37A9F67868ae7eE8452069d697`](https://coston2-explorer.flare.network/address/0x9d3ccbE19D1A6e37A9F67868ae7eE8452069d697) ✓ verified |
| `MockFXRP` (demo settlement token) | [`0x08a25a794639a6cA03b0A7C655B2c36d82fF144a`](https://coston2-explorer.flare.network/address/0x08a25a794639a6cA03b0A7C655B2c36d82fF144a) ✓ verified |
| `trustedTeeSigner` | `0xE3Dc334a8689FCFC5e9A7590A7651768630b626D` |

**Two auctions are open for judges to bid on** (#4 Vintage Rolex Submariner,
#5 Rare Whisky Cask No. 42), running through the judging window. The app has a
built-in faucet button for test FXRP, and C2FLR for gas comes from
https://faucet.flare.network/coston2. Auctions #1–#3 are settled and show the
completed flow with real winners and clearing prices.

**On the settlement token:** the auction is designed for real FXRP and
`script/Deploy.s.sol` deploys against FTestXRP
(`0x0b6A3645c240605887a5532109323A3E12273dc7`) unchanged. The public demo
instead uses `MockFXRP` — same 6 decimals, open `mint()` — because FTestXRP
can only be minted through the FAssets pipeline (an agent, collateral, and a
real XRP Ledger payment); calling its `mint()` directly reverts with
`0x6d5ab9d3`. Requiring that would make the demo untestable for judges. The
auction contract is token-agnostic, so this is a constructor argument, not a
code difference.

## Testing

- **Unit/integration:** `forge test` — 8/8 covering the full lifecycle, including
  that a bidder's escrow is a fixed cap regardless of their real bid (so the
  public escrow amount leaks nothing), that settlement rejects a forged
  signature, and that the second price is charged rather than the winner's own bid.
- **Live-chain:** `frontend/scripts/e2e-coston2.mjs` drives a complete round
  against deployed Coston2 contracts and asserts the winner, the clearing
  price, and all three payout balances. Four independent rounds have been run
  and passed (auctions #1, #2, #3 and #6 on `0x9d3c…d697`) — including one
  after the constant-width ciphertext change and one after the full UI port,
  each re-verified rather than assumed.
- **Known gap:** a sole bidder currently clears at 0, since there is no second
  bid to price against. Fine for the mechanism, wrong for a real seller — a
  reserve price is the fix, and it's first on the roadmap below.

## Roadmap

- **Reserve price.** `createAuction` should take a floor below which the item
  doesn't sell; today a lone bidder wins at 0. This is the one economic gap
  between the current contract and something a seller could safely use.
- **Let the enclave close auctions itself.** `closeAuction()` is a pure
  time-gated state flip with no secret and no computation, so it doesn't need
  a separate transaction at all: `settle()` can accept an auction whose
  `endTime` has passed and go straight to settled. Safe, because `submitBid`
  requires `block.timestamp < endTime` while settlement requires `>=`, so the
  bid set is final the instant the clock runs out. Further out, a registered
  FCC extension can watch for ended auctions and emit the signed result
  unprompted — nobody triggers anything, and the two on-chain steps become one.
- Register a real TEE machine once indexer credentials are available; swap `trustedTeeSigner` to it — no other code changes needed
- Settle in real FXRP once FAssets minting is practical for end users — a
  constructor argument today, already exercised by `script/Deploy.s.sol`
- English/ascending and first-price auction variants alongside Vickrey
- Batch settlement + gas-compensation pool for whoever triggers `settle()`
