# Umbra — Submission

**Bounty**: Confidential Compute Apps

## Short description

Umbra runs sealed-bid Vickrey (second-price) auctions settled in FXRP. Bidders encrypt their bid client-side to a TEE's public key; the TEE alone decrypts and compares bids, computing the winner and the second-highest price. Only that pair is ever disclosed on-chain — every individual bid, including the winner's own true bid, stays private forever.

## Target user

Anyone running a sealed-bid sale where bid privacy matters for the mechanism to work honestly: NFT/collectible auctions, private treasury or OTC-style sales, grant/RFP allocation — any setting where a Vickrey auction's core promise (bid your true value) is only credible if nobody can see anyone else's bid.

## Demo

- App: [fill in deployed URL]
- Local: `cd frontend && npm install && npm run dev`, browse `/auctions`, create one at `/auctions/new`
- Verified end-to-end against a real local deployment: real bids, correct Vickrey winner/price, correct on-chain settlement payouts (see repo commit history for the full trace, including a real bug found and fixed during that test)

## GitHub

https://github.com/ayushsingh82/Umbra-Flare

## How it uses Flare

- **Flare Confidential Compute (FCC)** — `UmbraInstructionSender.sol` is the real production entry point, built against Flare's actual `ITeeExtensionRegistry`/`ITeeMachineRegistry` interfaces (pulled directly from Flare's `fce-extension-scaffold` repo). `extension/` is a real Go FCC extension implementing the `AUCTION` op type (`SUBMIT_BID`, `CLOSE_AUCTION`), structured to match that scaffold's exact package layout.
- Registering a live TEE machine needs Flare's Coston2 indexer database credentials (obtained by contacting Flare support, per their own getting-started guide) plus governance setup — access this submission doesn't have within the hackathon window. So the interactive demo runs the *identical* decrypt/hold-privately/compute-Vickrey/sign logic locally (`frontend/app/api/tee/*`), verified to produce byte-for-byte compatible signatures with what `UmbraAuction.settle()` verifies. Swapping `trustedTeeSigner` from that local key to the real registered TEE machine address is the entire production cutover — no other code changes.

## What's new

Everything — this is a from-scratch build for the hackathon: `UmbraAuction.sol` (Vickrey auction lifecycle, 8/8 tests passing), the real FCC interfaces + `UmbraInstructionSender.sol`, the Go extension scaffold, the local TEE simulator, and the full frontend (auctions list/create/detail/my-bids).

## Smart contracts

- `UmbraAuction`: [fill in address after Coston2 deploy]
- FXRP (FTestXRP), Coston2: `0x0b6A3645c240605887a5532109323A3E12273dc7`
- Network: Flare Testnet Coston2 (chain id 114)

## Roadmap

- Register a real TEE machine once indexer credentials are available; swap `trustedTeeSigner` to it — no other code changes needed
- English/ascending and first-price auction variants alongside Vickrey
- Batch settlement + gas-compensation pool for whoever triggers `settle()` (see reference prior art in the space for the pattern)
