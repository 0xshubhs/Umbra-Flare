# DoraHacks BUIDL form — copy/paste

## BUIDL (project) name

```
Umbra
```

## Vision — describe the problem which this project solves

```
Sealed-bid auctions don't work on a public blockchain. Calldata and contract
storage are readable by anyone, so a naive sealed-bid auction leaks every bid
the moment it's submitted — the mempool sees it before the transaction even
confirms.

That breaks Vickrey (second-price) auctions specifically. Their whole promise
is "bid your true value, because you'll never pay more than the next-highest
bid" — and that only holds if nobody can see anyone else's bid. Commit-reveal
is the usual workaround, but it costs a second round and has a griefing hole:
a bidder who realises they've lost can simply never reveal, and settlement
stalls.

Umbra runs the auction inside Flare Confidential Compute instead. Bidders
encrypt their bid client-side to the TEE's public key and submit once. The
enclave alone decrypts the bids, computes the winner and the second-highest
price, and signs that result for the contract to verify. Only the winner and
the clearing price ever become public — every other bid, including the
winner's own true valuation, stays private permanently.

Because the enclave does the reveal, there is no second round, no user-side
reveal step, no extra key, and nothing a losing bidder can withhold to stall
settlement.
```

## Category

```
Blockchain / Platform technology — Confidential Compute Apps
```

## Links

- **GitHub:** `https://github.com/0xshubhs/Umbra-Flare`
- **Project website:** `https://umbraaaaa.vercel.app`
- **Demo video:** *(optional — leave blank if not recorded)*
- **Social links:** *(at least one required — your own X/Twitter or similar)*

---

# Submission section

## Selected bounty

```
Bounty 2 — Confidential Compute Apps
```

## Short product description

```
Umbra runs sealed-bid Vickrey (second-price) auctions settled in FXRP on
Flare. Bidders encrypt their bid client-side to a TEE's public key; the TEE
alone decrypts and compares bids, computing the winner and the second-highest
price. Only that pair is ever disclosed on-chain — every individual bid,
including the winner's own, stays private forever.
```

## Target user

```
Anyone running a sealed-bid sale where bid privacy is what makes the mechanism
honest: NFT and collectible auctions, private treasury or OTC-style sales, and
grant/RFP allocation — any setting where a Vickrey auction's core promise
("bid your true value") is only credible if nobody can see anyone else's bid.
```

## How it uses Flare

```
Flare Confidential Compute (FCC) is the core of the product, not a bolt-on.
UmbraInstructionSender.sol is the real production entry point, built against
Flare's actual ITeeExtensionRegistry / ITeeMachineRegistry interfaces taken
from Flare's own fce-extension-scaffold. extension/ is a Go FCC extension
implementing the AUCTION op type (SUBMIT_BID, CLOSE_AUCTION), structured to
match that scaffold's package layout.

Registering a live TEE machine requires Flare's Coston2 indexer database
credentials (obtained by contacting Flare support, per their getting-started
guide) plus governance setup — access this submission didn't have inside the
hackathon window. So the interactive demo runs the identical
decrypt / hold-privately / compute-Vickrey / sign logic locally, producing
signatures byte-for-byte compatible with what UmbraAuction.settle() verifies.
Pointing trustedTeeSigner at the registered TEE machine address is the entire
production cutover — no other code changes.

Settlement is in FXRP, Flare's FAssets representation of XRP.
```

## What was newly built during the program

```
Built new: UmbraAuction.sol (the full Vickrey lifecycle — create, sealed bid
with fixed-cap escrow, close, signature-verified settlement, payouts; 8/8
tests passing), the FCC integration (UmbraInstructionSender.sol against
Flare's real registry interfaces, plus the Go extension), all cryptography
(client-side ECIES bid encryption, the TEE-side decrypt/compute/sign path),
every auction screen's logic, and the whole Coston2 deployment and contract
verification.

Reused and disclosed: the app's visual layer — the editorial layout language,
its animation primitives, and the markup of the auction screens — is adapted
from earlier in-house work predating this hackathon, re-themed and with all
copy rewritten for Flare. That motion and layout code is not new and is not
claimed as such. Nothing beneath it carried over: the earlier work used a
different privacy model, so no contract, cryptography, or chain integration
was reusable.
```

## Smart contracts / deployment details

```
Network: Flare Testnet Coston2 (chain id 114)

UmbraAuction   0x9d3ccbE19D1A6e37A9F67868ae7eE8452069d697   (source-verified)
MockFXRP       0x08a25a794639a6cA03b0A7C655B2c36d82fF144a   (source-verified)
trustedTeeSigner 0xE3Dc334a8689FCFC5e9A7590A7651768630b626D

Both contracts are source-verified on Blockscout:
https://coston2-explorer.flare.network/address/0x9d3ccbE19D1A6e37A9F67868ae7eE8452069d697

Auctions #4 and #5 are open and running through late August so judges can bid.
The app has a built-in faucet button for test FXRP; C2FLR gas comes from
https://faucet.flare.network/coston2

The demo settles in a MockFXRP (same 6 decimals, open mint) rather than the
real FTestXRP, because FTestXRP only mints through the FAssets agent and
collateral pipeline — a direct mint() reverts — which would leave judges no
way to obtain bidding funds. UmbraAuction takes its token as a constructor
argument, so this is a deploy-time choice, not a code difference;
script/Deploy.s.sol targets the real token unchanged.
```

## Testing

```
- forge test: 8/8, covering the full lifecycle, including that a bidder's
  escrow is a fixed cap regardless of their real bid (so the public escrow
  amount leaks nothing), that settlement rejects a forged signature, and that
  the second price is charged rather than the winner's own bid.
- Live-chain: four complete rounds run against the deployed Coston2 contracts,
  each asserting the winner, the clearing price, and all three payout
  balances. Reproducible via frontend/scripts/e2e-coston2.mjs.
  Example: bids of 600 and 850 FXRP -> winner charged 600, the second price.
```

## Roadmap / next steps

```
- Reserve price. createAuction should take a floor below which the item
  doesn't sell; today a lone bidder clears at 0. This is the one economic gap
  between the current contract and something a seller could safely use.
- Register a real TEE machine once indexer credentials are available and point
  trustedTeeSigner at it — no other code changes needed.
- Settle in real FXRP once FAssets minting is practical for end users; already
  a constructor argument, exercised by script/Deploy.s.sol.
- English/ascending and first-price auction variants alongside Vickrey.
- Batch settlement plus a gas-compensation pool for whoever triggers settle().
```
