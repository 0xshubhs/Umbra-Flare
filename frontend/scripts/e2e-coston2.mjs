// End-to-end proof against LIVE Coston2: real ECIES-encrypted bids -> TEE
// computes the Vickrey result -> on-chain settlement -> payouts asserted.
//
// closeAuction() and settle() are permissionless, so a throwaway bidder key
// drives them; the seller's key never leaves your Foundry keystore.
//
// Prereqs:
//   1. `npm run dev` running (the TEE simulator lives at /api/tee/*)
//   2. Two funded bidder keys in frontend/.bidders.json (gitignored).
//      Generate: node scripts/e2e-coston2.mjs --gen, then send each ~5 C2FLR.
//   3. An open auction. Create one with the seller key:
//      cast send <AUCTION> "createAuction(string,string,uint256,uint256)" \
//        "E2E Test Lot" "desc" 1000000000 180 \
//        --rpc-url coston2 --account <your-keystore> --password <pw>
//
// Run: node scripts/e2e-coston2.mjs <auctionId>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createWalletClient, createPublicClient, http, parseUnits, formatUnits, defineChain } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { encrypt } from "eciesjs";

const AUCTION = "0x9d3ccbE19D1A6e37A9F67868ae7eE8452069d697";
const FXRP = "0x08a25a794639a6cA03b0A7C655B2c36d82fF144a";
const SELLER = "0xf43F4FC18BaCEFE1C96e4FA6bdc8585FBAEd4Cf7";
const TEE_PUB = "02786b5d5addfcbc034f2dc19e4ea8c9cecd62dcd1b4c4a0de550f549b62f6106b";
const RPC = "https://coston2-api.flare.network/ext/C/rpc";
const API = "http://localhost:3000";
const BIDDERS_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".bidders.json");

// --gen: mint two throwaway bidder keypairs, then fund them with C2FLR.
if (process.argv.includes("--gen")) {
  const keys = [generatePrivateKey(), generatePrivateKey()];
  fs.writeFileSync(BIDDERS_FILE, JSON.stringify(keys));
  console.log("wrote .bidders.json — send each ~5 C2FLR before running the test:");
  for (const [i, k] of keys.entries()) console.log(`  bidder${"AB"[i]} ${privateKeyToAccount(k).address}`);
  process.exit(0);
}

const AUCTION_ID = BigInt(process.argv[2] ?? "1");

const coston2 = defineChain({
  id: 114, name: "Coston2",
  nativeCurrency: { decimals: 18, name: "C2FLR", symbol: "C2FLR" },
  rpcUrls: { default: { http: [RPC] } },
});

const AUCTION_ABI = [
  { type: "function", name: "submitBid", inputs: [{ name: "auctionId", type: "uint256" }, { name: "encryptedBid", type: "bytes" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "closeAuction", inputs: [{ name: "auctionId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "settle", inputs: [{ name: "auctionId", type: "uint256" }, { name: "winner", type: "address" }, { name: "clearingPrice", type: "uint256" }, { name: "signature", type: "bytes" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "getAuction", inputs: [{ type: "uint256" }], outputs: [{ type: "tuple", components: [{ name: "id", type: "uint256" }, { name: "seller", type: "address" }, { name: "itemName", type: "string" }, { name: "itemDescription", type: "string" }, { name: "bidCap", type: "uint256" }, { name: "endTime", type: "uint256" }, { name: "status", type: "uint8" }, { name: "winner", type: "address" }, { name: "clearingPrice", type: "uint256" }, { name: "bidCount", type: "uint256" }] }], stateMutability: "view" },
];
const ERC20_ABI = [
  { type: "function", name: "approve", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "mint", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "balanceOf", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
];

const pub = createPublicClient({ chain: coston2, transport: http(RPC) });
const wc = (a) => createWalletClient({ account: a, chain: coston2, transport: http(RPC) });
const fx = (n) => formatUnits(n, 6);
const bal = (who) => pub.readContract({ address: FXRP, abi: ERC20_ABI, functionName: "balanceOf", args: [who] });
async function send(acct, req) {
  const hash = await wc(acct).writeContract(req);
  const r = await pub.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error(`tx reverted: ${hash}`);
  return r;
}
// Must mirror lib/ecies.ts exactly, including the 32-byte zero padding that
// keeps every sealed bid the same ciphertext length on-chain.
function encryptBid(amount) {
  const plaintext = Buffer.from(amount.toString(16).padStart(64, "0"), "hex");
  return `0x${Buffer.from(encrypt(TEE_PUB, plaintext)).toString("hex")}`;
}

const [kA, kB] = JSON.parse(fs.readFileSync(BIDDERS_FILE, "utf8"));
const bidderA = privateKeyToAccount(kA);
const bidderB = privateKeyToAccount(kB);

const CAP = parseUnits("1000", 6);
const BID_A = parseUnits("600", 6);  // loser
const BID_B = parseUnits("850", 6);  // winner -> must pay 600, the second price

console.log(`auction #${AUCTION_ID} | seller ${SELLER}`);
console.log(`bidderA ${bidderA.address} bids 600`);
console.log(`bidderB ${bidderB.address} bids 850`);
console.log(`expected: winner=bidderB, clearingPrice=600 FXRP\n`);

console.log("[1] minting FXRP to bidders + submitting encrypted bids...");
for (const [b, amt] of [[bidderA, BID_A], [bidderB, BID_B]]) {
  await send(b, { address: FXRP, abi: ERC20_ABI, functionName: "mint", args: [b.address, CAP] });
  await send(b, { address: FXRP, abi: ERC20_ABI, functionName: "approve", args: [AUCTION, CAP] });
  const ct = encryptBid(amt);
  await send(b, { address: AUCTION, abi: AUCTION_ABI, functionName: "submitBid", args: [AUCTION_ID, ct] });
  const res = await fetch(`${API}/api/tee/submit-bid`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ auctionId: AUCTION_ID.toString(), bidder: b.address, encryptedBid: ct }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`TEE submit-bid failed: ${JSON.stringify(j)}`);
  console.log(`    ${b.address.slice(0, 10)} escrowed ${fx(CAP)} FXRP | ciphertext ${(ct.length - 2) / 2} bytes | TEE accepted`);
}

const a0 = await pub.readContract({ address: AUCTION, abi: AUCTION_ABI, functionName: "getAuction", args: [AUCTION_ID] });
console.log(`\n    on-chain bidCount = ${a0.bidCount} (ciphertexts public, amounts unreadable)`);

const waitMs = Number(a0.endTime) * 1000 - Date.now() + 10000;
if (waitMs > 0) {
  console.log(`\n[2] waiting ${Math.ceil(waitMs / 1000)}s for auction end...`);
  await new Promise((r) => setTimeout(r, waitMs));
}
await send(bidderA, { address: AUCTION, abi: AUCTION_ABI, functionName: "closeAuction", args: [AUCTION_ID] });
console.log("    closed on-chain (permissionless)\n");

console.log("[3] TEE computes Vickrey result over privately-held bids...");
const res = await fetch(`${API}/api/tee/close-auction`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ auctionId: AUCTION_ID.toString(), chainId: 114 }),
});
const result = await res.json();
if (!res.ok) throw new Error(`TEE close failed: ${JSON.stringify(result)}`);
console.log(`    winner        = ${result.winner}`);
console.log(`    clearingPrice = ${fx(BigInt(result.clearingPrice))} FXRP`);
console.log(`    signature     = ${result.signature.slice(0, 26)}...\n`);

console.log("[4] settling on-chain against the TEE signature...");
const before = { seller: await bal(SELLER), a: await bal(bidderA.address), b: await bal(bidderB.address) };
const rcpt = await send(bidderA, { address: AUCTION, abi: AUCTION_ABI, functionName: "settle", args: [AUCTION_ID, result.winner, BigInt(result.clearingPrice), result.signature] });
console.log(`    settled | tx ${rcpt.transactionHash}\n`);

const after = { seller: await bal(SELLER), a: await bal(bidderA.address), b: await bal(bidderB.address) };
const final = await pub.readContract({ address: AUCTION, abi: AUCTION_ABI, functionName: "getAuction", args: [AUCTION_ID] });

const checks = [
  ["winner is bidderB (highest bid)", result.winner.toLowerCase() === bidderB.address.toLowerCase()],
  ["clearingPrice == 600 = second price, NOT winner's 850", BigInt(result.clearingPrice) === BID_A],
  ["seller received 600", after.seller - before.seller === BID_A],
  ["winner refunded cap-price = 400", after.b - before.b === CAP - BID_A],
  ["loser refunded full 1000", after.a - before.a === CAP],
  ["on-chain status == Settled(2)", final.status === 2],
  ["on-chain winner matches TEE result", final.winner.toLowerCase() === bidderB.address.toLowerCase()],
  ["on-chain clearingPrice matches", final.clearingPrice === BID_A],
];
console.log("[5] verifying payouts:");
let ok = true;
for (const [label, pass] of checks) {
  console.log(`    ${pass ? "PASS" : "FAIL"}  ${label}`);
  if (!pass) ok = false;
}
console.log(`\n    seller  ${fx(before.seller)} -> ${fx(after.seller)}`);
console.log(`    bidderA ${fx(before.a)} -> ${fx(after.a)}   (lost, fully refunded)`);
console.log(`    bidderB ${fx(before.b)} -> ${fx(after.b)}   (won, paid 600 not 850)`);
console.log(ok ? "\n=== E2E PASSED on live Coston2 ===" : "\n=== E2E FAILED ===");
process.exit(ok ? 0 : 1);
