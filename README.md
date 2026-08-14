# Umbra

Sealed-bid (Vickrey / second-price) auctions on Flare, with bid amounts kept private through Flare Confidential Compute (FCC).

Submitting to the **Flare Summer Signal** hackathon's **Confidential Compute Apps** track.

## Architecture

```mermaid
flowchart TD
    Bidder(["Bidder (browser)"]) -->|"encrypt(bidAmount, TEE_PUBLIC_KEY)<br/><sub>ECIES, secp256k1</sub>"| Submit["UmbraAuction.submitBid(auctionId, ciphertext)<br/><sub>escrows a FIXED bidCap in FXRP — same for every</sub><br/><sub>bidder, so the public escrow amount leaks nothing</sub><br/><sub>ciphertext stored on-chain, public but unreadable</sub>"]

    subgraph TEE["Flare Confidential Compute — private, never on-chain"]
        direction TB
        Decrypt["decrypt &amp; hold privately<br/><sub>only the TEE's key can decrypt;</sub><br/><sub>plaintext lives in enclave memory only,</sub><br/><sub>never logged, never returned</sub>"]
        Compute["compute Vickrey result<br/><sub>winner = highest bidder</sub><br/><sub>clearingPrice = second-highest bid</sub><br/><sub>all other amounts stay private forever</sub>"]
        Decrypt --> Compute
    end

    Submit -.->|ciphertext| Decrypt
    Close["UmbraAuction.closeAuction(auctionId)<br/><sub>anyone, once endTime has passed</sub>"] -.-> Compute
    Compute -->|"sign(chainId, contract, auctionId, winner, price)"| Settle["UmbraAuction.settle(id, winner, price, sig)<br/><sub>verifies sig against trustedTeeSigner</sub><br/><sub>winner pays price to seller, refunded the rest</sub><br/><sub>every other bidder refunded in full</sub>"]
    Settle --> Payout(["Seller + all bidders paid out"])

    classDef onchain fill:#1a0d18,stroke:#FD5299,color:#eee,stroke-width:1.5px
    classDef tee fill:#0d1a15,stroke:#4ade80,color:#eee,stroke-width:1.5px
    classDef actor fill:#111,stroke:#888,color:#eee,stroke-width:1px
    class Submit,Close,Settle onchain
    class Decrypt,Compute tee
    class Bidder,Payout actor
    style TEE fill:#0a1210,stroke:#4ade80,stroke-width:1px,stroke-dasharray:4 3,color:#4ade80
```

## Live on Coston2

| | |
|---|---|
| `UmbraAuction` | [`0x9d3ccbE19D1A6e37A9F67868ae7eE8452069d697`](https://coston2-explorer.flare.network/address/0x9d3ccbE19D1A6e37A9F67868ae7eE8452069d697) |
| `MockFXRP` (demo token, 6 decimals, open mint) | [`0x08a25a794639a6cA03b0A7C655B2c36d82fF144a`](https://coston2-explorer.flare.network/address/0x08a25a794639a6cA03b0A7C655B2c36d82fF144a) |
| `trustedTeeSigner` | `0xE3Dc334a8689FCFC5e9A7590A7651768630b626D` |

Both contracts are source-verified, so the code is readable on the explorer.

Four full sealed-bid rounds have been run against this deployment. Each used
two encrypted bids (600 and 850 FXRP) and charged the winner **600** — the
second price — with every payout asserted on-chain. First settlement tx:
[`0xd1ee3890…f956f0`](https://coston2-explorer.flare.network/tx/0xd1ee3890a5aca7db3854d06655e9238a3e757811910b5fa8a3435cb1bdf956f0).

Auctions **#4** and **#5** are open and running through late August, so the
flow can be exercised end to end from the app. Mint test FXRP with the faucet
button on any auction page; gas comes from
https://faucet.flare.network/coston2.

## Quick start

**Contracts** (Foundry — `lib/` is not vendored, so install deps first):

```bash
cd contracts
forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts
forge test -vv                      # 8/8, full Vickrey lifecycle
```

Deploy your own copy (uses a Foundry keystore, so no raw private key on disk;
fund it from https://faucet.flare.network/coston2 first):

```bash
TRUSTED_TEE_SIGNER=0x... forge script script/DeployDemo.s.sol \
  --rpc-url coston2 --account <keystore-name> --broadcast
```

`DeployDemo.s.sol` uses the mintable `MockFXRP`; `Deploy.s.sol` is the same
deploy against the real FTestXRP token.

**Frontend + local TEE simulator:**

```bash
cd frontend
npm install
cp .env.example .env.local          # then generate a TEE key, see the file
npm run dev                         # http://localhost:3000
```

The app talks to the live Coston2 deployment out of the box (`lib/contracts.ts`,
`NETWORK = "coston2"`). Connect a wallet on Coston2, mint yourself test FXRP
from `MockFXRP`, and bid.

**Reproduce the end-to-end proof** (needs `npm run dev` running):

```bash
node scripts/e2e-coston2.mjs --gen  # make throwaway bidder keys, fund them
node scripts/e2e-coston2.mjs <auctionId>
```

It submits two real encrypted bids and asserts the winner, the second-price
clearing amount, and all three payout balances against the live chain.

## Why confidential compute, not a normal contract

Calldata and contract storage are public. A plain smart contract sealed-bid
auction leaks every bid the instant it's submitted — the mempool and every
validator see it before the transaction even confirms. Commit-reveal is the
usual workaround, but it needs two rounds per bidder and has a griefing hole:
a bidder who realizes they'd lose can simply never reveal.

Vickrey (second-price) auctions make this worse, not better, without real
privacy: the mechanism's whole incentive-compatibility argument — bid your
true value, because you'll never pay more than the next-highest bid — only
holds if nobody can see anyone else's bid to game their own. A TEE removes
both problems in one round: bidders submit once, the enclave alone sees
plaintext amounts, and only the winner + clearing price are ever disclosed.

## What runs where, and the trust model

- **Privately, inside the TEE**: every bid amount, decrypted from its ECIES
  ciphertext, held in memory only, compared to find the Vickrey winner and
  second-highest price.
- **Consumed on-chain**: just `(winner, clearingPrice)`, as a signature
  `UmbraAuction.settle()` verifies against `trustedTeeSigner`.
- **Trust assumptions**: bidders trust (1) ECIES correctly hides amounts from
  everyone but the TEE, (2) TEE hardware attestation + Flare's data-provider
  consensus threshold in production, and (3) the signature scheme prevents a
  forged result. `trustedTeeSigner` is the single point that encodes trust
  #2 — swapping it from a demo key to the real registered TEE machine address
  is the entire production cutover, with no other code changes.

## What is revealed, and what never is

Settling a Vickrey auction necessarily discloses two things, and Umbra
discloses exactly those and nothing else:

| | |
|---|---|
| **Revealed on settlement** | the winner's address, and the clearing price |
| **Never revealed** | the winner's own bid, and every bid below second place |

Because the clearing price *is* the second-highest bid, the runner-up's exact
amount becomes public. That's inherent to second-price mechanics — it's the
number the winner pays — not a leak in the implementation. Everyone else's
bid, including the winner's true valuation, stays private permanently.

Two side channels are closed deliberately:

- **Escrow amount.** Every bidder escrows the same fixed `bidCap`, never their
  actual bid, so the public transfer reveals nothing about what they bid.
- **Ciphertext length.** Bids are zero-padded to a fixed 32 bytes before
  encryption, so every sealed bid is exactly 129 ciphertext bytes. Encoding
  the amount at its natural width instead would have let anyone bucket a
  rival's bid by magnitude just by measuring `getBidCiphertext()` — a 1 FXRP
  bid and a 50,000 FXRP bid produce 100- and 102-byte ciphertexts. Constant
  width removes that channel.

## What's built vs. what's a local stand-in

**Built and real:**
- `contracts/src/UmbraAuction.sol` — the full Vickrey auction lifecycle (create, bid, close, settle), fork-tested against Coston2, 8/8 passing.
- `contracts/src/UmbraInstructionSender.sol` + the exact `ITeeExtensionRegistry`/`ITeeMachineRegistry` interfaces from Flare's real [`fce-extension-scaffold`](https://github.com/flare-foundation/fce-extension-scaffold) — the genuine production on-chain entry point to a registered FCC extension.
- `extension/` — the real Go extension implementation (decrypt, hold privately, compute Vickrey, sign), structured to match Flare's scaffold exactly.

**Local stand-in, clearly isolated:** registering a real TEE machine on Coston2 needs Flare's indexer database credentials (obtained by contacting Flare support, per their own getting-started guide) plus a public tunnel and governance setup — access this submission doesn't have. So `UmbraInstructionSender` is written and ready but not wired into the live demo. Instead, `frontend/app/api/tee/*` runs the *same logic* as the real extension locally (see `extension/README.md` and `app/api/tee/README.md` for the exact mapping) so the full flow is genuinely testable end to end.

## On the interface

The visual layer — the editorial layout, its animation primitives, and the
markup of the auction screens — is adapted from earlier in-house work that
predates this hackathon, re-themed and with its copy rewritten for Flare. It
is not new work and isn't presented as such.

Nothing beneath it carried over. The contracts, cryptography, FCC integration,
and every wallet interaction on these screens were written for this submission,
because that earlier work used a different privacy model. Umbra's enclave
decrypts off-chain and signs the result, so there is no user-side reveal step,
no second key, and no permit flow — a losing bidder cannot stall settlement by
withholding a reveal.

## Repository layout

```
umbra-flare/
├── contracts/
│   ├── src/
│   │   ├── UmbraAuction.sol            (Vickrey auction, real + tested)
│   │   ├── UmbraInstructionSender.sol  (real FCC entry point, not yet registered)
│   │   ├── interfaces/                 (Flare's real ITeeExtensionRegistry/ITeeMachineRegistry)
│   │   └── MockFXRP.sol
│   ├── test/UmbraAuction.t.sol         (8/8 passing, full lifecycle)
│   └── script/
│       ├── Deploy.s.sol                (against real FTestXRP)
│       └── DeployDemo.s.sol            (against mintable MockFXRP — the live demo)
├── extension/                          (real Go FCC extension, AUCTION op type)
└── frontend/
    ├── lib/ecies.ts, lib/tee.ts        (client-side bid encryption)
    ├── app/api/tee/                    (local TEE simulator — see its README)
    └── scripts/e2e-coston2.mjs         (end-to-end proof against live Coston2)
```

## Network

- **Chain:** Flare Testnet Coston2 (chain id 114)
- **RPC:** `https://coston2-api.flare.network/ext/C/rpc`
- **Gas faucet:** https://faucet.flare.network/coston2
- **FXRP (FTestXRP):** `0x0b6A3645c240605887a5532109323A3E12273dc7` — what
  `Deploy.s.sol` targets. The live demo runs on `MockFXRP` instead (same 6
  decimals, open `mint()`), because FTestXRP only mints through the FAssets
  agent/collateral pipeline and a direct `mint()` reverts — which would leave
  judges with no way to obtain bidding funds. `UmbraAuction` takes the token
  as a constructor argument and is otherwise identical either way.
