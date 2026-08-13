# Local TEE simulator

These two routes (`/api/tee/submit-bid`, `/api/tee/close-auction`) are **not**
part of Umbra's Flare integration — they're a local stand-in for the real
registered TEE machine, used only so the demo works end-to-end without Flare's
indexer credentials (see `extension/README.md` for why real registration
isn't done here).

They implement the exact same logic as `extension/internal/extension/extension.go`:
decrypt a bid with the TEE's private key, hold plaintext amounts in memory
only (`_store.ts` — a module-level `Map`, gone on server restart), compute the
Vickrey winner + second price on close, and sign the result the same way
`UmbraAuction.settle()` verifies it.

The only thing that changes between this and production is **who** signs:
here it's `TEE_SIMULATOR_PRIVATE_KEY` (a throwaway local keypair, see
`.env.local`); in production it's the real TEE machine's key, and
`UmbraAuction.trustedTeeSigner` gets updated to that address via
`setTrustedTeeSigner()`. No other code changes.
