// ── Network switch ──────────────────────────────────────────────────────────
// "local"   — anvil forking Coston2 (`anvil --fork-url https://coston2-api.flare.network/ext/C/rpc`).
// "coston2" — the real Flare Testnet Coston2, where the live demo runs.
export const NETWORK: "local" | "coston2" = "coston2";

export const RPC_URL = NETWORK === "local"
  ? "http://127.0.0.1:8546"
  : "https://coston2-api.flare.network/ext/C/rpc";

export const AUCTION_ADDRESS = (
  NETWORK === "local"
    ? "0x229e614Bc82229b423921Efdc4C6E498D7876BC1" // local deploy, contracts/script/Deploy.s.sol
    : "0x9d3ccbE19D1A6e37A9F67868ae7eE8452069d697" // live Coston2 deploy, contracts/script/DeployDemo.s.sol
) as `0x${string}`;

export const FXRP_ADDRESS = (
  NETWORK === "local"
    ? "0x45A755B058492558351f188e4362F0546Bc3d140" // local MockFXRP — mint() freely, unlike the real token
    : "0x0b6A3645c240605887a5532109323A3E12273dc7" // real FTestXRP on Coston2
) as `0x${string}`;

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

export const STATUS_FROM_ENUM: Record<number, "active" | "closed" | "settled"> = {
  0: "active", 1: "closed", 2: "settled",
};
