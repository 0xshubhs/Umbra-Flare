// ── Network switch ──────────────────────────────────────────────────────────
// "local"   — anvil forking Coston2 (`anvil --fork-url https://coston2-api.flare.network/ext/C/rpc`).
// "coston2" — the real Flare Testnet Coston2, where the live demo runs.
//
// Both networks settle in a MockFXRP (6 decimals, open mint) rather than the
// real FTestXRP at 0x0b6A3645c240605887a5532109323A3E12273dc7. FTestXRP only
// mints through the FAssets agent/collateral pipeline — a direct mint()
// reverts — so nobody evaluating the demo could obtain bidding funds.
// UmbraAuction takes its token as a constructor argument, so pointing at the
// real one is a deploy-time choice (see contracts/script/Deploy.s.sol), not a
// code change. These MUST stay consistent with the deployed auction's `fxrp`.
const CONFIG = {
  local: {
    rpc: "http://127.0.0.1:8546",
    auction: "0x229e614Bc82229b423921Efdc4C6E498D7876BC1",
    fxrp: "0x45A755B058492558351f188e4362F0546Bc3d140",
    explorer: "",
  },
  coston2: {
    rpc: "https://coston2-api.flare.network/ext/C/rpc",
    auction: "0x9d3ccbE19D1A6e37A9F67868ae7eE8452069d697",
    fxrp: "0x08a25a794639a6cA03b0A7C655B2c36d82fF144a",
    // Flare's Coston2 explorer is a Blockscout instance.
    explorer: "https://coston2-explorer.flare.network",
  },
} as const;

export const NETWORK: keyof typeof CONFIG = "coston2";

export const RPC_URL = CONFIG[NETWORK].rpc;
export const AUCTION_ADDRESS = CONFIG[NETWORK].auction as `0x${string}`;
export const FXRP_ADDRESS = CONFIG[NETWORK].fxrp as `0x${string}`;
export const EXPLORER_URL: string = CONFIG[NETWORK].explorer;

/// Blockscout links. Return null on networks with no explorer (anvil), so
/// callers can omit the link rather than render a dead one.
export const explorerAddress = (addr: string): string | null =>
  EXPLORER_URL ? `${EXPLORER_URL}/address/${addr}` : null;

export const explorerTx = (hash: string): string | null =>
  EXPLORER_URL ? `${EXPLORER_URL}/tx/${hash}` : null;

export const CONTRACTS_DEPLOYED =
  AUCTION_ADDRESS !== "0x0000000000000000000000000000000000000000";

export const AUCTION_ABI = [
  {
    type: "function", name: "createAuction",
    inputs: [
      { name: "itemName", type: "string" },
      { name: "itemDescription", type: "string" },
      { name: "bidCap", type: "uint256" },
      { name: "duration", type: "uint256" },
    ],
    outputs: [{ name: "auctionId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function", name: "submitBid",
    inputs: [
      { name: "auctionId", type: "uint256" },
      { name: "encryptedBid", type: "bytes" },
    ],
    outputs: [], stateMutability: "nonpayable",
  },
  {
    type: "function", name: "closeAuction",
    inputs: [{ name: "auctionId", type: "uint256" }],
    outputs: [], stateMutability: "nonpayable",
  },
  {
    type: "function", name: "settle",
    inputs: [
      { name: "auctionId", type: "uint256" },
      { name: "winner", type: "address" },
      { name: "clearingPrice", type: "uint256" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [], stateMutability: "nonpayable",
  },
  {
    type: "function", name: "setTrustedTeeSigner",
    inputs: [{ name: "_signer", type: "address" }],
    outputs: [], stateMutability: "nonpayable",
  },
  {
    type: "function", name: "trustedTeeSigner",
    inputs: [], outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function", name: "nextAuctionId",
    inputs: [], outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function", name: "getAuction",
    inputs: [{ name: "auctionId", type: "uint256" }],
    outputs: [{
      name: "", type: "tuple",
      components: [
        { name: "id", type: "uint256" },
        { name: "seller", type: "address" },
        { name: "itemName", type: "string" },
        { name: "itemDescription", type: "string" },
        { name: "bidCap", type: "uint256" },
        { name: "endTime", type: "uint256" },
        { name: "status", type: "uint8" },
        { name: "winner", type: "address" },
        { name: "clearingPrice", type: "uint256" },
        { name: "bidCount", type: "uint256" },
      ],
    }],
    stateMutability: "view",
  },
  {
    type: "function", name: "getBidders",
    inputs: [{ name: "auctionId", type: "uint256" }],
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
  },
  {
    type: "function", name: "getBidCiphertext",
    inputs: [
      { name: "auctionId", type: "uint256" },
      { name: "bidder", type: "address" },
    ],
    outputs: [{ name: "", type: "bytes" }],
    stateMutability: "view",
  },
  {
    type: "function", name: "hasBid",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "event", name: "AuctionCreated",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "seller", type: "address", indexed: true },
      { name: "bidCap", type: "uint256", indexed: false },
      { name: "endTime", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event", name: "BidSubmitted",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "bidder", type: "address", indexed: true },
    ],
  },
  {
    type: "event", name: "AuctionClosed",
    inputs: [{ name: "id", type: "uint256", indexed: true }],
  },
  {
    type: "event", name: "AuctionSettled",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "winner", type: "address", indexed: true },
      { name: "clearingPrice", type: "uint256", indexed: false },
    ],
  },
] as const;

export const ERC20_ABI = [
  {
    type: "function", name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function", name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function", name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function", name: "decimals",
    inputs: [], outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
] as const;

/// MockFXRP's open mint, which the real FTestXRP does not have — it only mints
/// through the FAssets agent pipeline. Exposed in the UI as a test faucet so
/// anyone evaluating the demo can obtain bidding funds; see FXRP_ADDRESS above.
export const MOCK_FXRP_ABI = [
  {
    type: "function", name: "mint",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [], stateMutability: "nonpayable",
  },
] as const;

export const STATUS_FROM_ENUM: Record<number, "active" | "closed" | "settled"> = {
  0: "active", 1: "closed", 2: "settled",
};
