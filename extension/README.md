# Umbra FCC extension (AUCTION)

This is the real Flare Confidential Compute extension implementation for Umbra's
sealed-bid auctions — the code that would run inside the TEE once registered.

**Status: written, not deployed.** Registering a real TEE machine requires
Flare's Coston2 indexer database credentials (obtained by contacting Flare
support/`@FlareDevs`, per [the FCC getting-started guide](https://dev.flare.network/fcc/guides/getting-started)),
a public HTTPS tunnel, and on-chain governance setup — infrastructure this
submission doesn't have access to. These files are structured to drop directly
into a clone of [`fce-extension-scaffold`](https://github.com/flare-foundation/fce-extension-scaffold)
(replacing its `GREETING` example), matching its exact package layout so
`./scripts/pre-build.sh` / `start-services.sh` / `post-build.sh` / `test.sh`
would work unchanged once indexer access exists.

For the interactive demo, `frontend/app/api/tee/*` runs a local stand-in that
implements the *same* decrypt → hold-privately → compute-Vickrey → sign logic
as `internal/extension/extension.go` below, without needing real TEE hardware
or registration. Swapping `UmbraAuction.trustedTeeSigner` from that stand-in's
address to the real registered TEE machine address is the entire production
cutover — no contract changes.

## What runs where

| Step | Runs in |
|---|---|
| Bidder encrypts bid to TEE pubkey | Browser (client-side ECIES) |
| Ciphertext submitted on-chain | `UmbraAuction.submitBid` (public calldata, unreadable without the TEE private key) |
| Bid decrypted, held in memory | **This extension**, `processSubmitBid` — `bids[auctionId][bidder] = plaintext`, never logged, never returned |
| Vickrey winner + 2nd price computed | **This extension**, `processCloseAuction` |
| Signed `(winner, clearingPrice)` | Returned as `ActionResult`, relayed back on-chain |
| Settlement | `UmbraAuction.settle`, verifies the signature against `trustedTeeSigner` |

## Files

- `internal/config/config.go` — OPType/OPCommand constants (`AUCTION` / `SUBMIT_BID` / `CLOSE_AUCTION`), matching `UmbraInstructionSender.sol` exactly.
- `pkg/types/types.go` — request/response structs, ABI argument descriptors matching the Solidity message structs.
- `internal/extension/extension.go` — handlers: decrypt-and-store on `SUBMIT_BID`, compute-and-sign on `CLOSE_AUCTION`.
- `pkg/types/register.go` — decoder registrations for the FCC tooling/types server.

## Encryption scheme

Bids are encrypted client-side with [ECIES](https://en.wikipedia.org/wiki/Integrated_Encryption_Scheme)
over secp256k1 (same curve as Ethereum), to a public key derived from the TEE
machine's boot-generated identity key. The extension decrypts with the
matching private key, which never leaves the enclave. This is why the
plaintext bid is never observable outside the TEE, even though the ciphertext
travels through public calldata to reach it.
